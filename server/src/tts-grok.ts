import { WebSocket } from "ws";
import { calculateCost, calculateTTSCost } from "./pricing.js";
import { TextDelegate } from "./types.js";
import { AgentLine, BoardContentType } from "./text-openai-lines.js";

let streamSeq = -1;

/*
Voice	Character
carina	Soft, empathetic, soothing
zagan	Powerful, dramatic
helix	Bold, dynamic, energetic
orion	Rich, cinematic, resonant
luna	Gentle, patient, nurturing — Education
iris	Friendly, upbeat, charming
altair	Elegant, refined, premium
zenith	Sharp, focused, driven
perseus	Strong, confident, trustworthy
helios	Upbeat, energetic, versatile
lux	Grounded, calm, quietly wise
kepler	Inventive, charismatic
*/

const supporetedBoardTypes: BoardContentType[] = ["general"]
export const isBoardTypeSupported = (type: BoardContentType) => {
  return supporetedBoardTypes.includes(type)
}
export async function initGrokTTS(
  wsClient: WebSocket,
  textToken: string,
  cc: string,
  stepId: string,
  wordsIds: string[],
  options: string[],
  boardData: {type: BoardContentType, content: any} | undefined,
  abortSignal: AbortSignal,
  recordUsage: TextDelegate["recordUsage"],
) {
  streamSeq++;

  try {
    if (!textToken.trim()) return;

    console.log(
      `🗣️ Dispatching line to Grok TTS: "${textToken.trim()}"`
    );

//     const response = await fetch("https://api.x.ai/v1/audio/speech", {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${process.env.XAI_API_KEY}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         model: "grok-tts",
//         voice: "Ara",
//         input: textToken,
//         response_format: "pcm",
//       }),
//       signal: abortSignal,
//     });
    const response = await fetch('https://api.x.ai/v1/tts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.XAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToken,
          voice_id: 'luna', //'Carina',
          output_format: { codec: 'pcm', sample_rate: 24000, bit_rate: 128000 },
          language: 'ar-SA',
          
        }),
      });

      const model = 'grok-tts'
        const cost = calculateTTSCost(model, textToken.length)
recordUsage(cost.total, {
        type: "per-charachter",
        charactersCount: textToken.length,
        info: `TTS cost: ${cost.total}, char count: ${textToken.length}. model: ${model}`
})


    if (!response.ok) {
      throw new Error(
        `Grok TTS ${response.status}: ${await response.text()}`
      );
    }

    console.log(`🗣️ Grok TTS generation started`);

    if (!response.body) {
      throw new Error("Grok TTS returned no audio stream");
    }

    wsClient.send(
      JSON.stringify({
        event: "new-audio-stream",
        streamId: `${streamSeq}`,
        stepId,
        wordsIds,
        boardData,
        options: options.map(opt => ({ content: opt })),
        text: cc,
      })
    );

    // Accumulate data into a stable streaming buffer
    let streamBuffer = Buffer.alloc(0);

    // 4096 bytes = 2048 16-bit samples
    // At 24kHz = ~85ms of audio
    const TARGET_CHUNK_SIZE = 4096;

    let chunkSeq = -1;

    const reader = response.body.getReader();

    while (true) {
      if (abortSignal.aborted) {
        await reader.cancel();
        return;
      }

      const { done, value } = await reader.read();

      if (done) break;
      if (!value || value.length === 0) continue;

      const networkBuffer = Buffer.from(value);

      // Append incoming audio to accumulator
      streamBuffer = Buffer.concat([
        streamBuffer,
        networkBuffer,
      ]);


      // Send stable 4096-byte chunks
      while (streamBuffer.length >= TARGET_CHUNK_SIZE) {
        const toSend = streamBuffer.subarray(
          0,
          TARGET_CHUNK_SIZE
        );

        streamBuffer = streamBuffer.subarray(
          TARGET_CHUNK_SIZE
        );

        if (wsClient.readyState === WebSocket.OPEN) {
          chunkSeq++;

          wsClient.send(
            JSON.stringify({
              event: "audio",
              data: toSend.toString("base64"),
              wordsIds,
              seq: chunkSeq,
              streamId: `${streamSeq}`,
            })
          );
        }
      }
    }

    // Flush remaining audio
    if (streamBuffer.length > 0) {
      // Keep 16-bit PCM alignment
      const usableLength =
        streamBuffer.length -
        (streamBuffer.length % 2);

      if (usableLength > 0) {
        const finalChunk = streamBuffer.subarray(
          0,
          usableLength
        );

        if (wsClient.readyState === WebSocket.OPEN) {
          chunkSeq++;

          wsClient.send(
            JSON.stringify({
              event: "audio",
              data: finalChunk.toString("base64"),
              wordsIds,
              seq: chunkSeq,
              streamId: `${streamSeq}`,
              completed: true,
            })
          );
        }
      }
    }
    else {
      wsClient.send(
        JSON.stringify({
          event: "audio",
          wordsIds,
          seq: chunkSeq,
          streamId: `${streamSeq}`,
          completed: true,
        })
      );
    }

    console.log(`🗣️ Grok TTS generation completed`);
  } catch (err: any) {
    if (err.name !== "AbortError") {
      console.error("❌ Grok TTS error:", err.message);
    }
  }
}