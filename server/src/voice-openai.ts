import { WebSocket } from 'ws';
import { VOICE_PROMPT } from "./prompts/voice.js";
import { VoiceDelegate } from "./types.js";
import { DEMO_BOOK_ID } from './index.js';
// import { MAX_OUTPUT_TOKENS } from './server.js';

// 🧠 STRUCTURAL TYPE DEFINITION FOR THE TASK OBJECT
interface ToolResponseTask {
    id: string;          // The call_id from OpenAI
    name: string;        // The function name
    response: any;       // The output data structure
    openAiWs: WebSocket; // THE ATTACHED OPENAI REALTIME WEBSOCKET INSTANCE
    tutorialId?: string;
}

export async function initOpenAILive(wsClient: WebSocket, bookId: string, delegate: VoiceDelegate) {
    let openAiWs: WebSocket;

    // 📦 GLOBAL TASK QUEUE POOL (Positioned outside loop scope)
    let globalToolTaskQueue: ToolResponseTask[] = [];

    try {
        // Connect to OpenAI Realtime API
        // const url = "wss://api.openai.com/v1/realtime?model=gpt-realtime";
        const url = "wss://api.openai.com/v1/realtime?model=gpt-realtime-mini";
        openAiWs = new WebSocket(url, {
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                // "OpenAI-Beta": "realtime=v1"
            }
        });

        openAiWs.on('open', () => {
                console.log('🟩 Connection successfully validated and open with OpenAI Realtime GA Cluster.');
                if (wsClient.readyState === WebSocket.OPEN) {
                        wsClient.send(JSON.stringify({ event: 'status', data: 'Connected to OpenAI Realtime Voice!' }));
                }

            // Initialize Session Configuration
            const sessionUpdate = {
                type: "session.update",
                session: {
                        type: 'realtime',
                        instructions: VOICE_PROMPT,
                        // max_output_tokens: MAX_OUTPUT_TOKENS,
                        // 🔄 UPDATED: Audio configuration parameters nested for GA API shape
                        audio: {
                                input: {
                                        format: {
                                                type: "audio/pcm",
                                                rate: 24000, // Adjust to 16000 if your client mic outputs 16kHz PCM
                                            },
                                        // 🔄 UPDATED: Turn detection configuration is nested under input here
                                        turn_detection: {
                                                type: "server_vad",
                                                threshold: 0.5,
                                                prefix_padding_ms: 300,
                                                silence_duration_ms: 500
                                        },
                                },
                                output: {
                                        format: {
                                                type: "audio/pcm",
                                                rate: 24000, // Adjust to 16000 if your client mic outputs 16kHz PCM
                                            },
                                voice: "alloy" // Voices: alloy, echo, shimmer, ash, sage, etc.
                                }
                        },
                    tools: [
                        {
                            type: "function",
                            name: "getPageContent",
                            description: "To retrieve page content and structure of page. Also, it returns pages that belong to the same section.",
                            parameters: {
                                type: "object",
                                properties: {
                                    pageNumber: { type: "string", description: "The page number." }
                                },
                                required: ["pageNumber"]
                            }
                        },
                        {
                            type: "function",
                            name: "writeOnBook",
                            description: "Call this function whenever the user asks you to write on book, or generate a graphic vector layout on book.",
                            parameters: {
                                type: "object",
                                properties: {
                                    svgCode: { type: "string", description: "The complete, raw, standard HTML/XML SVG code string. Do not wrap it in markdown code fences or backticks." }
                                },
                                required: ["svgCode"]
                            }
                        },
                        {
                            type: "function",
                            name: "startTutorial",
                            description: "Call this function whenever the user asks you to draw concept in board. This function returns an array of steps, each containing text to say and svg code to be visualized.",
                            parameters: {
                                type: "object",
                                properties: {
                                    tutorialId: { type: "string", description: "A unique tracking handle. Generate a random ID on the first step. For any subsequent updates, edits, corrections, or additional steps to that same tutorial, you MUST reuse the identical string ID." },
                                    tutorialDesc: { type: "string", description: "Description of tutorial want to explain" }
                                },
                                required: ["tutorialId", "tutorialDesc"]
                            }
                        },
                        {
                            type: "function",
                            name: "startTutorialFromTextBook",
                            description: "Call this function whenever the user asks you to draw an exercise or concept from textbook on the board.",
                            parameters: {
                                type: "object",
                                properties: {
                                    tutorialId: { type: "string", description: "A unique tracking handle. Generate a random ID on the first step. For any subsequent updates, edits, corrections, or additional steps to that same tutorial, you MUST reuse the identical string ID." },
                                    tutorialDesc: { type: "string", description: "All details and requirements related to the part or exercise such as question, options, answer ..etc." },
                                    partId: { type: "string", description: "The ID of textbook part user talking about" }
                                },
                                required: ["tutorialId", "tutorialDesc", "partId"]
                            }
                        },
                        {
                            type: "function",
                            name: "showTutorialStep",
                            description: "Call this function when you want to switch to a step in a tutorial. System will show the visual to user and you should speak the text of the step.",
                            parameters: {
                                type: "object",
                                properties: {
                                    tutorialId: { type: "string", description: "The ID of tutorial you want to show." },
                                    stepNumber: { type: "number", description: "The step number you want to switch to to user and you want to talk about." }
                                },
                                required: ["tutorialId", "stepNumber"]
                            }
                        },
                        {
                            type: "function",
                            name: "showLaser",
                            description: "Call this function before reading words from the page.",
                            parameters: {
                                type: "object",
                                properties: {
                                    wordsIds: {
                                        type: "array",
                                        description: "A list of unique word identifiers to be processed.",
                                        items: { type: "string" }
                                    }
                                },
                                required: ["wordsIds"]
                            }
                        },
                        {
                            type: "function",
                            name: "updateAssessmentScore",
                            description: "Call this function to update user assessment on a concept.",
                            parameters: {
                                type: "object",
                                properties: {
                                    conceptId: { type: "string", description: "Concept ID." },
                                    score: { type: "number", description: "Score from 1-10." }
                                },
                                required: ["conceptId", "score"]
                            }
                        },
                        {
                            type: "function",
                            name: "goToPage",
                            description: "Call this function to change the current page on user's screen.",
                            parameters: {
                                type: "object",
                                properties: {
                                    pageNumber: { type: "string", description: "Page number." }
                                },
                                required: ["pageNumber"]
                            }
                        }
                    ],
                    tool_choice: "auto"
                },
            };
            openAiWs.send(JSON.stringify(sessionUpdate));
        });

        openAiWs.on('message', async (data) => {

                
                const message = JSON.parse(data.toString());

                if (message.type === "input_audio_buffer.speech_started") {
                        console.log("🎤 OpenAI detected speech");
                    }
                    
                    if (message.type === "input_audio_buffer.speech_stopped") {
                        console.log("🛑 OpenAI detected end of speech");
                    }
                    if (message.type.includes("transcript")) {
                        console.log("transcript", JSON.stringify(message, null, 2));
                    }

                const m = {...message}
                delete m.delta
                // console.log(m)

// {
//         type: 'response.done',
//         event_id: 'event_DsZTiEooh46Eafs5VwIBo',
//         response: {
//           object: 'realtime.response',
//           id: 'resp_DsZTi1jklSxMeZRH3iLME',
//           status: 'failed',
//           status_details: { type: 'failed', error: [Object] },
if(m.response?.status == "failed") {
        console.log(message, `Error: `, m.response?.status_details?.error)
}
if(m.type == "error") {
        console.log(m)
}
            // 🎙️ Handle Audio Output Streams from OpenAI to React Client
            if (message.type === 'response.output_audio.delta' && message.delta) {
                if (wsClient.readyState === WebSocket.OPEN) {
                    wsClient.send(JSON.stringify({
                        event: 'audio',
                        data: message.delta, 
                    }));
                }
            }

            // 📋 Handle Audio Transcription Text Tokens if requested
            if (message.type === 'response.audio_transcript.delta' && message.delta) {
                console.log(`📋 Received Reference Text Token: ${message.delta}`);
            }

            // 🛠️ Handle Finished Tool Call Actions
            if (message.type === 'response.function_call_arguments.done') {
                const id = message.call_id;
                const name = message.name;
                const args = JSON.parse(message.arguments || '{}');

                console.log(`Call name: ${name}`, args);
                let toolOutput: any = null;

                if (name === 'getPageContent') {
                    const { page, relatedPages, section } = await delegate.getPageContent(args.pageNumber);
                    toolOutput = { page, relatedPages, section };
                }

                if (name === 'writeOnBook' && args?.svgCode) {
                    delegate.writeOnBook(args.svgCode);
                    toolOutput = { rendered: true };
                }

                if (name === 'startTutorial') {
                    const { tutorialId, tutorialDesc } = args;
                    const existingTask = delegate.getTutorialJob(tutorialId);

                    if (existingTask?.status === 'running') {
                        globalToolTaskQueue.push({
                            id, name, response: { status: 'running' }, openAiWs, tutorialId
                        });
                        return;
                    }

                    void delegate.startTutorial(tutorialId, tutorialDesc).then(resp => {
                        globalToolTaskQueue.push({
                            id, name, response: { tutorial: resp }, openAiWs, tutorialId
                        });
                    });
                }

                if (name === 'startTutorialFromTextBook') {
                    const { tutorialId, tutorialDesc, partId } = args;
                    const existingTask = delegate.getTutorialJob(tutorialId);

                    if (existingTask?.status === 'running') {
                        globalToolTaskQueue.push({
                            id, name, response: { status: 'running' }, openAiWs, tutorialId
                        });
                        return;
                    }

                    void delegate.startTutorialFromTextBook(bookId, tutorialId, tutorialDesc, partId).then(resp => {
                        globalToolTaskQueue.push({
                            id, name, response: { tutorial: resp }, openAiWs, tutorialId
                        });
                    });
                }

                if (name === 'showTutorialStep') {
                    delegate.showTutorialStep(args.tutorialId, args.stepNumber);
                    toolOutput = { rendered: true };
                }

                if (name === 'showLaser') {
                    delegate.showLaser(args.wordsIds);
                    toolOutput = { rendered: true };
                }

                if (name === 'goToPage') {
                    delegate.goToPage(args.pageNumber);
                    toolOutput = { rendered: true };
                }

                if (name === 'updateAssessmentScore') {
                    delegate.updateAssessmentScore(args.conceptId, args.score);
                    toolOutput = { rendered: true };
                }

                // Instantly confirm standard immediate synchronous events
                if (toolOutput !== null) {
                    sendOpenAiToolResponse(openAiWs, id, toolOutput);
                }
            }
        });

        openAiWs.on('close', (code, reason) => {
            console.log('🤖 OpenAI Realtime session closed cleanly.');
            console.log(`🔹 Close Code: ${code} | Reason: ${reason.toString()}`);
        });

        openAiWs.on('error', (err) => {
            console.error('❌ OpenAI Realtime API error frame:', err);
        });

    } catch (err) {
        console.error('❌ Initialization pipeline failed:', err);
    }

    // ⏱️ GLOBAL BACKGROUND TIMED INTERVAL WORKER LOOP (Sweeps every 200ms)
    setInterval(async () => {
        if (globalToolTaskQueue.length === 0) return;

        // Snapshot and clear instantly to safeguard multi-thread states
        const currentBatch = [...globalToolTaskQueue];
        globalToolTaskQueue = [];

        console.log(`⏱️ [Global Worker Engine] Flushing ${currentBatch.length} deferred tasks to OpenAI...`);

        for (const task of currentBatch) {
            sendOpenAiToolResponse(task.openAiWs, task.id, task.response);

            // Mark deferred tasks as completed safely
            if (task.tutorialId) {
                delegate.updateTutorialJobStatus(task.tutorialId, 'completed');
            }
        }
        console.log('✅ [Global Worker Engine] Target tool execution responses confirmed.');
    }, 200);

    // 🔄 RETURN SESSION CONNECTION CONTROLLERS
    return {
        streamText: async (text: string) => {
            if (openAiWs?.readyState === WebSocket.OPEN) {
                const textEvent = {
                    type: "conversation.item.create",
                    item: {
                        type: "message",
                        role: "user",
                        content: [{ type: "input_text", text }]
                    }
                };
                openAiWs.send(JSON.stringify(textEvent));
                
                // Instruct the server to reply immediately (matches turnComplete: true)
                openAiWs.send(JSON.stringify({ type: "response.create" }));
            }
        },
        streamAudio: async (base64AudioPCM16: string) => {
            if (openAiWs?.readyState === WebSocket.OPEN) {
                const audioAppendEvent = {
                    type: "input_audio_buffer.append",
                    audio: base64AudioPCM16 // Base64 chunk of raw PCM16 audio
                };
                openAiWs.send(JSON.stringify(audioAppendEvent));
            }
        },
        close: () => {
            if (openAiWs) {
                openAiWs.close();
            }
        }
    };
}

// Global helper to build structured tool response confirmations upstream
function sendOpenAiToolResponse(ws: WebSocket, callId: string, output: any) {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
        ws.send(JSON.stringify({
            type: "conversation.item.create",
            item: {
                type: "function_call_output",
                call_id: callId,
                output: JSON.stringify(output)
            }
        }));
        
        // Force server to read tool resolution payload output and proceed
        ws.send(JSON.stringify({ type: "response.create" }));
    } catch (err) {
        console.error('Failed to transmit tool response confirmations upstream:', err);
    }
}