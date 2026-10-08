import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { Context } from '../../context.js';
import { CompactForTextSteps } from '../../messages/compact-for-text-steps/index.js';
import { CallTool } from '../../tools/call/index.js';
import { CreateUsage } from '../../usage/create/index.js';
import { GetTask } from '../../tasks/get/index.js';
import { OnTextStepChunk } from '../../tasks/index.js';
import { Def, serviceName } from './def.js';
import { TTSInput } from '../../entities/Task.js';
import { calculateTTSCost } from '../../functions/pricing.js';
import { OnTTSChunk } from '../../tasks/helpers/on-tts-chunk/index.js';

// let streamSeq = -1;

// export const generateStreamId = () => String(++streamSeq)

export const createService = (
    context: {
        getUserId: Context.GetUserId
        getTaskAbortContoller: Context.getTaskAbortContoller,
        // getGrokSession: Context.getGrokSession
    },
    depends: {
        // callTool: Service<CallTool>;
        onTTSChunk: Service<OnTTSChunk>;
        createUsage: Service<CreateUsage>;
        getTask: Service<GetTask>;
    },
) =>
    createBaseService<Def>(serviceName, ['taskUid'], async (params, scope, errorout, warn) => {

        const {task} = (await depends.getTask({ uid: params.taskUid }, scope)).data

        const abortController = await context.getTaskAbortContoller(scope, task.uid)

        const input = task.input as TTSInput

        // const streamId = generateStreamId()

        try {
            const textToken = input.text;

            if (!textToken.trim()) return { output: {}};

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
                    text_normalization: true, //Enable text normalization before synthesis. When enabled, the model normalizes written-form text (e.g. numbers, abbreviations, symbols) into spoken-form before generating audio.
                    // speed: 0.85,
                    optimize_streaming_latency: 1, //to reduce first-chunk size
                }),
            });

            const model = 'grok-tts'
            const cost = calculateTTSCost(model, textToken.length)
            
            await depends.createUsage({
                task: 'tts',
                model,
                type: 'per-charachter',
                cost: cost.total,
                charactersCount: textToken.length,
                info: `TTS cost: ${cost.total}, char count: ${textToken.length}. model: ${model}`
            }, scope)


            if (!response.ok) {
                throw new Error(
                    `Grok TTS ${response.status}: ${await response.text()}`
                );
            }

            console.log(`🗣️ Grok TTS generation started`);

            if (!response.body) {
                throw new Error("Grok TTS returned no audio stream");
            }


            // Accumulate data into a stable streaming buffer
            let streamBuffer = Buffer.alloc(0);

            // 4096 bytes = 2048 16-bit samples
            // At 24kHz = ~85ms of audio
            const TARGET_CHUNK_SIZE = 4096 * 2;

            let chunkSeq = -1;

            const reader = response.body.getReader();

            while (true) {
                if (abortController.signal.aborted) {
                    await reader.cancel();
                    return { output: {} };
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

                    chunkSeq++;

                    if (abortController.signal.aborted) {
                        await reader.cancel();
                        return { output: {} };
                    }
                    
                    await depends.onTTSChunk({
                        taskUid: params.taskUid,
                        chunkIndex: chunkSeq,
                        chunk: toSend,
                    }, scope)
                }
            }

            chunkSeq++;
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


                    await depends.onTTSChunk({
                        taskUid: params.taskUid,
                        chunkIndex: chunkSeq,
                        chunk: finalChunk,
                        completed: true
                    }, scope)
                }
            }
            else {
                await depends.onTTSChunk({
                    taskUid: params.taskUid,
                    chunkIndex: chunkSeq,
                    completed: true
                }, scope)
            }

            console.log(`🗣️ Grok TTS generation completed`);
        } catch (err: any) {
            if (err.name !== "AbortError") {
                console.error("❌ Grok TTS error:", err.message);
            }
        }

        return {
            output: {},
        };
    });
