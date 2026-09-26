import OpenAI from "openai";
import { WebSocket } from 'ws';

// import fs from "fs";
// import wav from "wav";

// Initialize the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let streamSeq = -1
export async function initOpenAITTS(wsClient: WebSocket, textToken: string, wordsIds: string[], abortSignal: AbortSignal) {
    streamSeq++;
    try {
        if (!textToken.trim()) return;

        console.log(`🗣️ Dispatching line to OpenAI TTS: "${textToken.trim()}"`);

        const response = await openai.audio.speech.create({
            model: "tts-1",
            // model: "gpt-4o-mini-tts",
            // model: "tts-1-hd-1106", 
            voice: "alloy",
            input: textToken,
            response_format: "pcm",
            instructions: `do not read symbols, paranthesis, brackets emoji ...`
        }).asResponse();

        console.log(`🗣️ Dispatching ling completed"`);

        if (response.body) {
            //     const writer = new wav.FileWriter(`test${streamSeq}.wav`, {
            //         channels: 1,
            //         sampleRate: 24000,
            //         bitDepth: 16
            //     });

            // Accumulate data into a stable streaming buffer
            let streamBuffer = Buffer.alloc(0);

            // 4096 bytes = 2048 16-bit samples. At 24kHz, this is ~85ms of audio.
            // Perfect balance between zero lag (low latency) and perfectly clean audio.
            const TARGET_CHUNK_SIZE = 4096;

            let chunkSeq = -1
            for await (const chunk of response.body as any) {
                if(abortSignal.aborted) {
                    return
                }

                const networkBuffer = Buffer.from(chunk);

                // Write the raw stream straight to your local debug file
                // writer.write(networkBuffer);

                // Append the incoming data to our accumulator
                streamBuffer = Buffer.concat([streamBuffer, networkBuffer]);

                console.log(`🗣️ Sending audio to client"`);
                // While we have enough data to send a clean, well-sized block
                while (streamBuffer.length >= TARGET_CHUNK_SIZE) {
                    // Extract exactly our target size (which is even, so no split 16-bit samples)
                    const toSend = streamBuffer.subarray(0, TARGET_CHUNK_SIZE);
                    streamBuffer = streamBuffer.subarray(TARGET_CHUNK_SIZE);

                    if (wsClient.readyState === WebSocket.OPEN) {
                        chunkSeq++;
                        wsClient.send(JSON.stringify({
                            event: 'audio',
                            data: toSend.toString('base64'),
                            wordsIds,
                            seq: chunkSeq,
                            streamId: `${streamSeq}`
                        }));
                    }
                }
            }


            // FLUSH: Send whatever is left over at the very end of the stream
            if (streamBuffer.length > 0) {
                // Ensure it's even-byte aligned just in case
                const usableLength = streamBuffer.length - (streamBuffer.length % 2);
                if (usableLength > 0) {
                    const finalChunk = streamBuffer.subarray(0, usableLength);
                    if (wsClient.readyState === WebSocket.OPEN) {
                        chunkSeq++;
                        wsClient.send(JSON.stringify({
                            event: 'audio',
                            data: finalChunk.toString('base64'),
                            wordsIds,
                            seq: chunkSeq,
                            streamId: `${streamSeq}`
                        }));
                    }
                }
            }

            //     writer.end();
        }
    } catch (err: any) {
        if (err.name !== 'AbortError') {
            console.error('❌ OpenAI TTS error:', err);
        }
    }
}