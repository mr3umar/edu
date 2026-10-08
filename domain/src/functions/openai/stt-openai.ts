import WebSocket from 'ws';
import { calculateCost, calculateSTTCost } from '../pricing.js';

const apiKey = process.env.OPENAI_API_KEY;

type TranscriptionModel =
  | 'gpt-transcribe'
  | 'gpt-4o-transcribe'
  ;

// const TRANSCRIPTION_MODEL: TranscriptionModel = 'gpt-4o-transcribe';
const TRANSCRIPTION_MODEL: TranscriptionModel = 'gpt-transcribe';

// Audio format:
// 24,000 Hz
// 16-bit
// mono
const SAMPLE_RATE = 24000;
const BYTES_PER_SAMPLE = 2;
const CHANNELS = 1;

const BYTES_PER_SECOND =
  SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS;


type TranscriptionUsage = {
  model: TranscriptionModel;

  audioSeconds: number;
  audioMinutes: number;

  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;

  costUsd: number;
  info: string;
};

export async function streamAudioToOpenAI(delegate: {
  onMessage: (msg: {
    data: {
      content: string;
      lastChunk: boolean;
    };
  }) => void;
  onDelta: (delta: string) => void;

  // Optional: receive the usage/cost when the stream ends
  onUsage?: (usage: TranscriptionUsage) => void;
}) {

  const url =
    'wss://api.openai.com/v1/realtime?intent=transcription';

  const ws = new WebSocket(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  /*
   * ---------------------------------------------------------
   * Usage tracking
   * ---------------------------------------------------------
   */

  // Actual PCM bytes received from the application.
  let totalAudioBytes = 0;

  // Used by gpt-4o-transcribe if usage information is
  // returned by the API.
  let inputTokens = 0;
  let cachedInputTokens = 0;
  let outputTokens = 0;

  /*
   * ---------------------------------------------------------
   * Session payload
   * ---------------------------------------------------------
   */

  const buildSessionPayload = (contextPrompt?: string) => {

    // const basePrompt =
    //   'The audio contains short, brief conversational words or command triggers spoken in a Saudi accent.';

    // const fullPrompt = contextPrompt
    //   ? `${basePrompt} The user is answering directly to the context: "${contextPrompt}".`
    //   : basePrompt;

    return {
      type: 'session.update',

      session: {
        type: 'transcription',

        audio: {
          input: {

            format: {
              type: 'audio/pcm',
              rate: SAMPLE_RATE,
            },

            transcription: {
              model: TRANSCRIPTION_MODEL,
              language: 'en',
              // prompt: fullPrompt,
            },
            // "turn_detection": //null
            // {
            //   "type": "server_vad",
            //   "silence_duration_ms": 2000
            // }
          },
        },
      },
    };
  };

  /*
   * ---------------------------------------------------------
   * Cost calculation
   * ---------------------------------------------------------
   */

  function calculateUsage(): TranscriptionUsage {

    const audioSeconds =
      totalAudioBytes / BYTES_PER_SECOND;

    const audioMinutes =
      audioSeconds / 60;

    let costUsd = 0;

    /*
     * gpt-transcribe
     *
     * $0.0045 per minute
     */
    if (TRANSCRIPTION_MODEL === 'gpt-transcribe') {

      costUsd = calculateSTTCost(TRANSCRIPTION_MODEL, audioMinutes).total
      // costUsd =
      //   audioMinutes *
      //   PRICING['gpt-transcribe'].perMinute;
    }

    /*
     * gpt-4o-transcribe
     *
     * $2.50 / 1M input audio tokens
     * $10.00 / 1M output audio tokens
     */
    if (TRANSCRIPTION_MODEL === 'gpt-4o-transcribe') {

      costUsd = calculateCost(TRANSCRIPTION_MODEL, {
        input: inputTokens,
        cachedInput: 0,
        output: outputTokens,
      }).total
      // costUsd =
      //   (inputTokens / 1_000_000) *
      //     PRICING['gpt-4o-transcribe'].inputPerMillionTokens
      //   +
      //   (outputTokens / 1_000_000) *
      //     PRICING['gpt-4o-transcribe'].outputPerMillionTokens;
    }

    return {
      model: TRANSCRIPTION_MODEL,

      audioSeconds,
      audioMinutes,

      inputTokens,
      cachedInputTokens,
      outputTokens,

      costUsd,
      info: `STT costs: ${costUsd}, seconds: ${audioMinutes}, model: ${TRANSCRIPTION_MODEL}`
    };
  }

  /*
   * ---------------------------------------------------------
   * WebSocket errors
   * ---------------------------------------------------------
   */

  ws.on('error', (err) => {
    console.error('OpenAI API Error:', err);
  });

  /*
   * ---------------------------------------------------------
   * WebSocket connected
   * ---------------------------------------------------------
   */

  ws.on('open', () => {

    console.log(
      `OpenAI Realtime STT connection established using ${TRANSCRIPTION_MODEL}`
    );

    const sessionUpdate =
      buildSessionPayload();

    ws.send(
      JSON.stringify(sessionUpdate)
    );
  });

  /*
   * ---------------------------------------------------------
   * WebSocket messages
   * ---------------------------------------------------------
   */

  ws.on('message', (data) => {

    const response =
      JSON.parse(data.toString());

    /*
     * Transcription delta
     */
    if (
      response.type ===
      'conversation.item.input_audio_transcription.delta'
    ) {

      console.log(
        `[Interim]: ${response.delta}\r`
      );

      delegate.onDelta(response.transcript);
    }

    /*
     * Final transcription
     */
    if (
      response.type ===
      'conversation.item.input_audio_transcription.completed'
    ) {

      // console.log("####4", JSON.stringify(response))
      // {"type":"conversation.item.input_audio_transcription.completed","event_id":"event_EOq1IVvFwdOjDnydAj4ID","item_id":"item_EOq1H0trOapbGYZiWnnVH","content_index":0,"transcript":"cough","usage":{"type":"tokens","total_tokens":12,"input_tokens":8,"input_token_details":{"text_tokens":1,"audio_tokens":7},"output_tokens":4}}

      console.log(
        `\n[FINAL TRANSCRIPT]: ${response.transcript}\n`
      );

      delegate.onMessage({
        data: {
          content: response.transcript,
          lastChunk,
        },
      });
    }
    if (response.type === "conversation.item.input_audio_buffer.committed") {
      console.log("SERVER COMMITTED");
    }

    /*
     * Usage information
     *
     * Depending on the transcription model/API event,
     * usage may be included in the response.
     */
    if (response.usage) {

      const usage = response.usage;

      /*
       * Handle common usage field names.
       *
       * Keep these defensive because usage structures can
       * differ between API event types/model versions.
       */
      if (
        typeof usage.input_tokens === 'number'
      ) {
        inputTokens =
          usage.input_tokens;
      }
      if (
        typeof usage.cached_tokens === 'number'
      ) {
        inputTokens =
          usage.cached_tokens;
      }

      if (
        typeof usage.output_tokens === 'number'
      ) {
        outputTokens =
          usage.output_tokens;
      }

      /*
       * Some responses can expose token details.
       */
      if (
        usage.input_token_details
      ) {

        const details =
          usage.input_token_details;

        if (
          typeof details.audio_tokens === 'number'
        ) {
          inputTokens =
            details.audio_tokens;
        }
      }

      if (
        usage.output_token_details
      ) {

        const details =
          usage.output_token_details;

        if (
          typeof details.audio_tokens === 'number'
        ) {
          outputTokens =
            details.audio_tokens;
        }
      }
    }

    /*
     * Error event
     */
    if (response.type === 'error') {

      console.error(
        'Realtime API error event:',
        response.error
      );
    }
  });

  /*
   * ---------------------------------------------------------
   * Audio streaming state
   * ---------------------------------------------------------
   */

  let ended = false;

  let bytesSinceCommit = 0;

  let hasUncommittedAudio = false;

  let lastChunk = false;

  /*
   * Commit approximately every 5 seconds.
   *
   * 24,000 samples/sec
   * × 2 bytes/sample
   * = 48,000 bytes/sec
   */
  const COMMIT_THRESHOLD_BYTES =
    BYTES_PER_SECOND * 3;

  function commitIfReady(
    force = false
  ) {

    if (
      ws.readyState !== WebSocket.OPEN ||
      !hasUncommittedAudio
    ) {
      return;
    }

    if (
      force ||
      bytesSinceCommit >=
      COMMIT_THRESHOLD_BYTES
    ) {

      ws.send(
        JSON.stringify({
          type:
            'input_audio_buffer.commit',
        })
      );

      console.log(
        '[STT] Audio committed'
      );

      bytesSinceCommit = 0;

      hasUncommittedAudio = false;
    }
  }

  /*
   * ---------------------------------------------------------
   * Return streaming interface
   * ---------------------------------------------------------
   */

  return {

    /*
     * Update context used by transcription.
     */
    updateContext: (
      lastAiMessage: string
    ) => {

      if (
        ws.readyState ===
        WebSocket.OPEN
      ) {

        console.log(
          `[Session Context Updated]: Expecting answer to "${lastAiMessage}"`
        );

        ws.send(
          JSON.stringify(
            buildSessionPayload(
              lastAiMessage
            )
          )
        );
      }
    },

    /*
     * Send audio chunk.
     */
    write: async (
      chunk: Buffer<ArrayBufferLike>
    ) => {

      lastChunk = false;

      if (
        ended ||
        ws.readyState !==
        WebSocket.OPEN
      ) {
        return;
      }

      /*
       * IMPORTANT:
       *
       * chunk is Base64.
       *
       * chunk.length is NOT the actual
       * number of PCM bytes.
       */
      // const pcmBuffer =
      //   Buffer.from(
      //     chunk,
      //     'base64'
      //   );

      /*
       * Track actual audio size.
       *
       * Used for gpt-transcribe,
       * which is billed by duration.
       */
      totalAudioBytes +=
        chunk.length;

      /*
       * Send audio to OpenAI.
       */
      const audioEvent = {
        type:
          'input_audio_buffer.append',

        audio: chunk.toString('base64'),
      };

      ws.send(
        JSON.stringify(audioEvent)
      );

      /*
       * Keep commit tracking.
       */
      bytesSinceCommit +=
        chunk.length;

      hasUncommittedAudio = true;

      /*
       * Enable this if you want automatic
       * commits every 5 seconds.
       */
      // diabled because configuring turn_detection make it auto commit
      // commitIfReady();
    },

    /*
     * End the current utterance.
     */
    end: () => {

      console.log(
        '[stt ended]'
      );

      lastChunk = true;

      /*
       * Don't close the socket here because
       * the same session may continue receiving
       * more audio.
       */
      commitIfReady(true);
    },

    /*
     * Get current usage/cost.
     */
    getUsage: (reset: boolean): TranscriptionUsage => {

      const usage = calculateUsage();

      if (reset) {
        totalAudioBytes = 0
        inputTokens = 0
        outputTokens = 0
      }

      return usage;
    },

    /*
     * Close the connection and return
     * final usage/cost.
     */
    close: (): TranscriptionUsage => {

      ended = true;

      /*
       * Flush remaining audio.
       */
      commitIfReady(true);

      const usage =
        calculateUsage();

      console.log(
        '[STT Usage]',
        usage
      );

      delegate.onUsage?.(
        usage
      );

      if (
        ws.readyState ===
        WebSocket.OPEN
      ) {

        ws.close();
      }

      return usage;
    },
  };
}