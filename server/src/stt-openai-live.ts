import WebSocket from 'ws';
import { calculateCost, calculateSTTCost } from './pricing.js';

const apiKey = process.env.OPENAI_API_KEY;

import fs from 'fs';
import path from 'path';

const debugDir = './tmp/stt-debug';
fs.mkdirSync(debugDir, { recursive: true });
let chunkIndex = 0;
const debugStream = fs.createWriteStream(
  './tmp/stt-debug/full.pcm'
);

// ffmpeg -f s16le -ar 24000 -ac 1 -i ./tmp/stt-debug/full.pcm ./tmp/stt-debug/full.wav

type TranscriptionModel =
  | 'gpt-live-transcribe';

const TRANSCRIPTION_MODEL: TranscriptionModel =
  'gpt-live-transcribe';

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
  outputTokens: number;

  costUsd: number;
  info: string;
};

export async function streamAudioToOpenAILive(
  delegate: {
    onMessage: (msg: {
      data: {
        content: string;
        lastChunk: boolean;
      };
    }) => void;

    onUsage?: (usage: TranscriptionUsage) => void;
  }
) {

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

  let totalAudioBytes = 0;

  let inputTokens = 0;
  let outputTokens = 0;

  /*
   * ---------------------------------------------------------
   * Session payload
   * ---------------------------------------------------------
   */

  const buildSessionPayload = (
    contextPrompt?: string
  ) => {

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

              // Student speaks Arabic.
              language: 'ar',

              // IMPORTANT:
              // Do not put behavioral instructions here.
              // Avoid things like:
              // "The audio contains short conversational words..."
              //
              // If you really need contextual vocabulary,
              // keep it short and recognition-oriented.
              //
              // prompt: contextPrompt,
            },
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
     * Keep this compatible with your pricing
     * implementation.
     */
    costUsd =
      calculateSTTCost(
        TRANSCRIPTION_MODEL,
        audioMinutes
      ).total;

    return {
      model: TRANSCRIPTION_MODEL,

      audioSeconds,
      audioMinutes,

      inputTokens,
      outputTokens,

      costUsd,

      info:
        `STT costs: ${costUsd}, ` +
        `seconds: ${audioSeconds}, ` +
        `model: ${TRANSCRIPTION_MODEL}`,
    };
  }

  /*
   * ---------------------------------------------------------
   * WebSocket errors
   * ---------------------------------------------------------
   */

  ws.on('error', (err) => {

    console.error(
      'OpenAI API Error:',
      err
    );
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

    ws.send(
      JSON.stringify(
        buildSessionPayload()
      )
    );
  });

  /*
   * ---------------------------------------------------------
   * WebSocket messages
   * ---------------------------------------------------------
   */


  let buffer = '';
  let timer: NodeJS.Timeout | null = null;


  function onTranscriptDelta(delta: string) {
    buffer += delta;
  
    if (!timer) {
      timer = setTimeout(flush, 300);
    }
  }
  
  function flush() {
    timer = null;
  
    const text = buffer.trim();
  
    if (!text) {
      return;
    }
  
    buffer = '';
  
    
    delegate.onMessage({
      data: {
        content: text,
        lastChunk,
      },
    });
  }


  ws.on('message', (data) => {

    const response =
      JSON.parse(data.toString());

    /*
     * -------------------------------------------------------
     * Transcription delta
     * -------------------------------------------------------
     */

    console.log(JSON.stringify(response), "###5")
    if (
      response.type ===
      'conversation.item.input_audio_transcription.delta'
    ) {

      console.log(
        `[Interim]: ${response.delta}\r`
      );
      onTranscriptDelta(response.delta)
    }

    /*
     * -------------------------------------------------------
     * Final transcription
     * -------------------------------------------------------
     */
    
    if (
      response.type ===
      'conversation.item.input_audio_transcription.completed'
    ) {

      const transcript =
        response.transcript?.trim() ?? '';

      console.log(
        `\n[FINAL TRANSCRIPT]: ${transcript}\n`
      );

      if (!transcript) {
        return;
      }

      /*
       * Ignore obvious non-speech artifacts.
       */
      if (isNonSpeechTranscript(transcript)) {

        console.log(
          `[STT] Ignored non-speech: "${transcript}"`
        );

        return;
      }

      // delegate.onMessage({
      //   data: {
      //     content: transcript,
      //     lastChunk,
      //   },
      // });
    }

    /*
     * -------------------------------------------------------
     * Usage
     * -------------------------------------------------------
     */

    if (response.usage) {

      const usage =
        response.usage;

      if (
        typeof usage.input_tokens ===
        'number'
      ) {

        inputTokens =
          usage.input_tokens;
      }

      if (
        typeof usage.output_tokens ===
        'number'
      ) {

        outputTokens =
          usage.output_tokens;
      }

      /*
       * Audio token details.
       */
      if (
        usage.input_token_details
      ) {

        const details =
          usage.input_token_details;

        if (
          typeof details.audio_tokens ===
          'number'
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
          typeof details.audio_tokens ===
          'number'
        ) {

          outputTokens =
            details.audio_tokens;
        }
      }
    }

    /*
     * -------------------------------------------------------
     * Error event
     * -------------------------------------------------------
     */

    if (
      response.type === 'error'
    ) {

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

  const COMMIT_THRESHOLD_BYTES =
    BYTES_PER_SECOND * 5;

  function commitIfReady(
    force = false
  ) {

    if (
      ws.readyState !==
        WebSocket.OPEN ||
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
     * Update context.
     */
    updateContext: (
      lastAiMessage: string
    ) => {

      if (
        ws.readyState !==
        WebSocket.OPEN
      ) {

        return;
      }

      console.log(
        `[Session Context Updated]: Expecting answer to "${lastAiMessage}"`
      );

      /*
       * Don't put long behavioral instructions
       * into the transcription prompt.
       *
       * If you decide to use contextPrompt,
       * keep it to expected vocabulary/context.
       */
      ws.send(
        JSON.stringify(
          buildSessionPayload(
            lastAiMessage
          )
        )
      );
    },

    /*
     * Send audio chunk.
     */
    write: async (
      chunk: string
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
       * chunk is Base64.
       */
      const pcmBuffer =
        Buffer.from(
          chunk,
          'base64'
        );

      /*
       * Track actual PCM bytes.
       */
      totalAudioBytes +=
        pcmBuffer.length;

      /*
       * Send audio.
       */
      ws.send(
        JSON.stringify({
          type:
            'input_audio_buffer.append',

          audio: chunk,
        })
      );

      /*
       * Track commit size.
       */
      bytesSinceCommit +=
        pcmBuffer.length;

      hasUncommittedAudio = true;


      console.log(
        `[STT WRITE] #${chunkIndex++} bytes=${pcmBuffer.length}`
      );
    
      debugStream.write(pcmBuffer);
    
      
      /*
       * Enable if you want automatic
       * 5-second commits.
       */
      // commitIfReady();
    },

    /*
     * End current utterance.
     */
    end: () => {

      console.log(
        '[stt ended]'
      );

      lastChunk = true;

      /*
       * Don't close socket.
       */
    },

    /*
     * Get usage.
     */
    getUsage:
      (): TranscriptionUsage => {

        return calculateUsage();
      },

    /*
     * Close.
     */
    close:
      (): TranscriptionUsage => {

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


/*
 * =========================================================
 * Non-speech filtering
 * =========================================================
 */

const NON_SPEECH = new Set([
  // English
  'cough',
  'coughing',
  'laugh',
  'laughing',
  'laughter',
  'sneeze',
  'sneezing',
  'throat clearing',
  'clearing throat',

  // Arabic
  'كحة',
  'الكحة',
  'سعال',
  'السعال',
  'عطس',
  'العطس',
  'عطسة',
  'العطسة',
]);

function isNonSpeechTranscript(
  text: string
): boolean {

  const normalized =
    text
      .trim()
      .toLowerCase()
      .replace(
        /[.,!?؟،؛:]/g,
        ''
      );

  return NON_SPEECH.has(
    normalized
  );
}