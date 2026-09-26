import { GoogleGenAI, Modality, Session, Type } from "@google/genai";
import { WebSocket } from 'ws';
import { VOICE_PROMPT_2 } from "./prompts/voice2.js";
import { VoiceDelegate } from "./types.js";
import { VOICE_PROMPT } from "./prompts/voice.js";
import { DEMO_BOOK_ID } from "./index.js";
// import { MAX_OUTPUT_TOKENS } from "./server.js";


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


// 🧠 STRUCTURAL TYPE DEFINITION FOR THE TASK OBJECT
interface ToolResponseTask {
        id: string;        // The specific call id from Gemini
        name: string;      // The function name
        response: any;     // The output data structure
        session: Session;  // THE ATTACHED LIVE GEMINI API SESSION INSTANCE
        tutorialId?: string
}

let nextSentenceI = 0

export async function initGeminiLive(wsClient: WebSocket, bookId: string, delegate: VoiceDelegate) {
        let geminiSession: Session
        try {


                geminiSession = await ai.live.connect({
                        // model: 'gemini-2.5-flash-native-audio-latest', 
                        // model: 'gemini-3.1-pro-preview',
                        model: 'gemini-3.1-flash-live-preview',
                        // model: 'models/gemini-2.5-flash-native-audio-latest',
                        config: {
                                // FIX 2: Gemini 2.5 Live strictly mandates AUDIO modality for the realtime cluster
                                responseModalities: [Modality.AUDIO],
                                // maxOutputTokens: MAX_OUTPUT_TOKENS,
                                speechConfig: {
                                        voiceConfig: {
                                                prebuiltVoiceConfig: {
                                                        voiceName: 'Puck', // Voices: Puck, Charon, Kore, Fenrir
                                                },
                                        },
                                },

                                // inputAudioTranscription: {},
                                outputAudioTranscription: {},
                                /*
                      
                                */
                                systemInstruction: VOICE_PROMPT,
                                tools: [
                                        {
                                                functionDeclarations: [
                                                        {
                                                                name: 'getPageContent',
                                                                description: 'To retrieve page content and structure of page. Also, it returns pages that are belong to the same section.',
                                                                parameters: {
                                                                        type: Type.OBJECT,
                                                                        properties: {
                                                                                pageNumber: {
                                                                                        type: Type.STRING,
                                                                                        description: 'The page number.'
                                                                                }
                                                                        },
                                                                        required: ['pageNumber']
                                                                }
                                                        },
                                                        {
                                                                name: 'writeOnBook',
                                                                description: 'Call this function whenever the user asks you to write on book, or generate a graphic vector layout on book.',
                                                                parameters: {
                                                                        type: Type.OBJECT,
                                                                        properties: {
                                                                                svgCode: {
                                                                                        type: Type.STRING,
                                                                                        description: 'The complete, raw, standard HTML/XML SVG code string (e.g., "<svg...><circle cx=\'50\'.../></svg>"). Do not wrap it in markdown code fences or backticks.'
                                                                                }
                                                                        },
                                                                        required: ['svgCode']
                                                                }
                                                        },
                                                        {
                                                                name: 'startTutorial',
                                                                description: 'Call this function whenever the user asks you to draw concept in board. This function will returns array of steps each step contains text to say and svg code to be visualed.',
                                                                parameters: {
                                                                        type: Type.OBJECT,
                                                                        properties: {
                                                                                tutorialId: {
                                                                                        type: Type.STRING,
                                                                                        description: 'A unique tracking handle. Generate a random ID on the first step. For any subsequent updates, edits, corrections, or additional steps to that same tutorial, you MUST reuse the identical string ID.'
                                                                                },
                                                                                tutorialDesc: {
                                                                                        type: Type.STRING,
                                                                                        description: 'Description of tutorial want to explain'
                                                                                },
                                                                        },
                                                                        required: ['tutorialId', 'tutorialDesc']
                                                                }
                                                        },
                                                        {
                                                                name: 'startTutorialFromTextBook',
                                                                description: 'Call this function whenever the user asks you to draw an excersize or concept from textbook on the board. This function will returns array of steps each step contains text to say and svg code to be visualed.',
                                                                parameters: {
                                                                        type: Type.OBJECT,
                                                                        properties: {
                                                                                tutorialId: {
                                                                                        type: Type.STRING,
                                                                                        description: 'A unique tracking handle. Generate a random ID on the first step. For any subsequent updates, edits, corrections, or additional steps to that same tutorial, you MUST reuse the identical string ID.'
                                                                                },
                                                                                tutorialDesc: {
                                                                                        type: Type.STRING,
                                                                                        description: 'All details and requirments related to the part or excersize such as question, options, answer ..etc.'
                                                                                },
                                                                                partId: {
                                                                                        type: Type.STRING,
                                                                                        description: 'The ID of textbook part user talking about'
                                                                                },
                                                                        },
                                                                        required: ['tutorialId', 'tutorialDesc', 'partId']
                                                                }
                                                        },
                                                        {
                                                                name: 'showTutorialStep',
                                                                description: 'Call this function when you wan to switch to step in tutorial. system will show the visual to user and you should speak the text of the step.',
                                                                parameters: {
                                                                        type: Type.OBJECT,
                                                                        properties: {
                                                                                tutorialId: {
                                                                                        type: Type.STRING,
                                                                                        description: 'The ID of tutorial you want to show.'
                                                                                },
                                                                                stepNumber: {
                                                                                        type: Type.NUMBER,
                                                                                        description: 'The step number you want to switch to to user and you want to talk about.'
                                                                                },
                                                                        },
                                                                        required: ['tutorialId', 'stepNumber']
                                                                }
                                                        },
                                                        // {
                                                        //         name: 'showLaser',
                                                        //         description: 'Call this function before reading words from the page..',
                                                        //         parameters: {
                                                        //                 type: Type.OBJECT,
                                                        //                 properties: {
                                                        //                         wordsIds: {
                                                        //                                 type: Type.ARRAY,
                                                        //                                 description: ""
                                                        //                         }
                                                        //                 },
                                                        //                 required: ['wordsIds']
                                                        //         }
                                                        // },
                                                        {
                                                                name: 'updateAssessmentScore',
                                                                description: 'Call this function to update user assessment on a concept..',
                                                                parameters: {
                                                                        type: Type.OBJECT,
                                                                        properties: {
                                                                                conceptId: {
                                                                                        type: Type.STRING,
                                                                                        description: "Concept ID."
                                                                                },
                                                                                score: {
                                                                                        type: Type.NUMBER,
                                                                                        description: "Score from 1-10."
                                                                                }
                                                                        },
                                                                        required: ['conceptId', 'score']
                                                                }
                                                        },
                                                        {
                                                                name: 'goToPage',
                                                                description: 'Call this function change the current page on user\'s screen.',
                                                                parameters: {
                                                                        type: Type.OBJECT,
                                                                        properties: {
                                                                                pageNumber: {
                                                                                        type: Type.STRING,
                                                                                        description: "Page number."
                                                                                }
                                                                        },
                                                                        required: ['pageNumber']
                                                                }
                                                        }
                                                ]
                                        }
                                ],
                        },
                        callbacks: {
                                onopen: () => {
                                        console.log('🟩 Connection successfully validated and open with Google AI Clusters.');
                                        if (wsClient.readyState === WebSocket.OPEN) {
                                                wsClient.send(JSON.stringify({ event: 'status', data: 'Connected to Gemini Live Voice!' }));
                                        }
                                },
                                onmessage: async (message: any) => {

                                        // AI speech transcript
                                        if (message.serverContent?.outputTranscription?.text) {
                                                console.log(
                                                        message.serverContent.outputTranscription
                                                );
                                        }

                                        // user speech transcript
                                        if (message.serverContent?.inputTranscription?.text) {
                                                console.log(
                                                        message.serverContent.inputTranscription
                                                );
                                        }

                                        const parts = message.serverContent?.modelTurn?.parts;
                                        if (parts) {
                                                for (const part of parts) {

                                                        if (part.inlineData && part.inlineData.data) {
                                                                // console.log(part.inlineData?.mimeType)
                                                                const base64AudioFrame = part.inlineData.data;

                                                                // Forward live sound bytes to your React App
                                                                if (wsClient.readyState === WebSocket.OPEN) {
                                                                        // console.log(`sending audio to client`)
                                                                        wsClient.send(JSON.stringify({
                                                                                event: 'audio',
                                                                                data: base64AudioFrame,
                                                                        }));
                                                                }
                                                        }
                                                        if (part.text) {
                                                                // console.log(part.text)
                                                                console.log(`📋 Received Reference Text Token: ${part.text}`);
                                                                // if (wsClient.readyState === WebSocket.OPEN) {
                                                                //   wsClient.send(JSON.stringify({
                                                                //   event: 'reference_tag',
                                                                //   data: part.text
                                                                //   }));
                                                                // }
                                                        }
                                                }
                                        }

                                        const toolCall = message.toolCall?.functionCalls;
                                        if (toolCall && toolCall.length > 0) {

                                                const functionResponses: any[] = [];
                                                for (const call of toolCall) {
                                                        const id = call.id;
                                                        const name = call.name;

                                                        console.log(`Call name: ${call.name}`, call.args)
                                                        // Route Reference IDs
                                                        if (call.name === 'getPageContent') {

                                                                const {page, relatedPages, section} = await delegate.getPageContent(call.args.pageNumber)

                                                                functionResponses.push({
                                                                        name,
                                                                        id: id,
                                                                        response: { output: { page, relatedPages, section } },
                                                                });
                                                        }
                                                        // ROUTE STREAMING SVG CODE DOWN TO CLIENT
                                                        if (call.name === 'writeOnBook' && call.args?.svgCode) {
                                                                
                                                                delegate.writeOnBook(call.args.svgCode)
                                                                functionResponses.push({
                                                                        response: { output: { rendered: true } },
                                                                        name,
                                                                        id: id
                                                                      });
                                                        }



                                                        if (call.name === 'startTutorial') {
                                                                const { tutorialId, tutorialDesc, partId } = call.args;

                                                                const existingTask = delegate.getTutorialJob(tutorialId)

                                                                if (existingTask?.status == 'running') {

                                                                        globalToolTaskQueue.push({
                                                                        id,
                                                                        name: name,
                                                                        response: { output: { status: 'running' } },
                                                                        session: geminiSession!, // Map internal active connection state handle
                                                                        tutorialId,
                                                                        });
                                                                        return
                                                                }

                                                                void delegate.startTutorial(tutorialId, tutorialDesc)
                                                                .then(resp => {
                                                                        globalToolTaskQueue.push({
                                                                                id: id,
                                                                                name: name,
                                                                                response: { output: { tutorial: resp } },
                                                                                session: geminiSession! // Map internal active connection state handle
                                                                        });
                                                                })
                                                        }



                                                        if (call.name === 'startTutorialFromTextBook') {
                                                                const { tutorialId, tutorialDesc, partId } = call.args;

                                                                const existingTask = delegate.getTutorialJob(tutorialId)

                                                                if (existingTask?.status == 'running') {

                                                                        globalToolTaskQueue.push({
                                                                        id,
                                                                        name: name,
                                                                        response: { output: { status: 'running' } },
                                                                        session: geminiSession!, // Map internal active connection state handle
                                                                        tutorialId,
                                                                        });
                                                                        return
                                                                }
                                                                
                                                                void delegate.startTutorialFromTextBook(bookId, tutorialId, tutorialDesc, partId)
                                                                .then(resp => {
                                                                        globalToolTaskQueue.push({
                                                                                id: id,
                                                                                name: name,
                                                                                response: { output: { tutorial: resp } },
                                                                                session: geminiSession! // Map internal active connection state handle
                                                                        });
                                                                })
                                                        }


                                                        if (call.name === 'showTutorialStep') {

                                                                const { tutorialId, stepNumber } = call.args;
                                                                delegate.showTutorialStep(tutorialId, stepNumber)
                                                                functionResponses.push({
                                                                        response: { output: { rendered: true } },
                                                                        name,
                                                                        id: id
                                                                      });
                                                        }

                                                        if (call.name === 'showLaser') {
                                                                delegate.showLaser(call.args.wordsIds)
                                                                functionResponses.push({
                                                                        response: { output: { rendered: true } },
                                                                        name,
                                                                        id: id
                                                                });
                                                        }
                                                        if (call.name === 'goToPage') {

                                                                delegate.goToPage(call.args.pageNumber)
                                                                functionResponses.push({
                                                                        response: { output: { rendered: true } },
                                                                        name,
                                                                        id: id
                                                                });
                                                        }

                                                        if (call.name === 'updateAssessmentScore') {
                                                                const { conceptId, score } = call.args;
                                                                delegate.updateAssessmentScore(conceptId, score)
                                                                functionResponses.push({
                                                                        response: { output: { rendered: true } },
                                                                        name,
                                                                        id: id
                                                                });
                                                        }

                                                }
                                                // CRITICAL FIX: Send the tool response confirmation payload array back to Google.
                                                // This acknowledges the function call and prevents the 1008 aborted drop!
                                                if (functionResponses.length > 0 && geminiSession) {
                                                        try {
                                                                await geminiSession.sendToolResponse({
                                                                        functionResponses: functionResponses
                                                                });
                                                                console.log('✅ Sent tool acknowledgments to Gemini Live API.');
                                                        } catch (err) {
                                                                console.error('Failed to transmit tool response confirmations upstream:', err);
                                                        }
                                                }
                                        }

                                },
                                onclose: (event?: any) => {
                                        console.log('🤖 Gemini Live session closed cleanly.');
                                        if (event) {
                                                console.log(`🔹 Close Code: ${event.code} | Reason: ${event.reason}`);
                                        }
                                },
                                onerror: (err: any) => {
                                        console.error('❌ Gemini Live API error frame:', err);
                                },
                        },

                });
        } catch (err) {
                console.error('❌ Initialization pipeline failed:', err);
        }

        // 📦 GLOBAL TASK QUEUE POOL (Positioned outside wss scope)
        let globalToolTaskQueue: ToolResponseTask[] = [];

        // ⏱️ GLOBAL BACKGROUND TIMED INTERVAL WORKER LOOP (Positioned outside wss scope)
        // Evaluates and sweeps through buffered tasks every 50ms across all active client threads
        setInterval(async () => {
                if (globalToolTaskQueue.length === 0) return;

                // 1. Snapshot and clear the queue pool instantly to prevent multi-thread cross pollution
                const currentBatch = [...globalToolTaskQueue];
                globalToolTaskQueue = [];

                // 2. Group the tasks by their respective active session instances
                // This allows us to map and flush batch confirmations to the correct pipeline
                const sessionGroups = new Map<Session, any[]>();

                for (const task of currentBatch) {
                        if (!sessionGroups.has(task.session)) {
                                sessionGroups.set(task.session, []);
                        }
                        sessionGroups.get(task.session)?.push({
                                id: task.id,
                                name: task.name,
                                response: task.response
                        });

                        if (task.tutorialId) {
                                delegate.updateTutorialJobStatus(task.tutorialId, 'completed')
                        }
                }

                // 3. Simultaneously flush batched tool responses down each corresponding target session line
                for (const [targetSession, functionResponses] of sessionGroups.entries()) {
                        try {
                                console.log(`⏱️ [Global Worker Engine] Flushing ${functionResponses.length} tasks to a model instance...`);

                                await targetSession.sendToolResponse({
                                        functionResponses: functionResponses
                                });

                                functionResponses.forEach(res => {
                                        res
                                })

                                console.log('✅ [Global Worker Engine] Target tool execution responses confirmed.');
                        } catch (err) {
                                console.error('❌ [Global Worker Engine] Failed to dispatch tool response batch to session:', err);
                        }
                }
        }, 200);

        return {
                streamText: async (text: string) => {

                        await geminiSession?.sendClientContent({
                                turns: [{
                                        role: 'user',
                                        parts: [{
                                                text,
                                        }]
                                }],
                                turnComplete: true// turnComplete: true, you are explicitly telling the Gemini Live API: "I am done inputting, it is now your turn to talk." By flipping it to false, you tell the session to swallow the text into its context window silently and wait for future user input.
                        });
                },
                streamAudio: async (data: any) => {

                        await geminiSession.sendRealtimeInput({
                                audio: {
                                        data,
                                        mimeType: "audio/pcm;rate=24000",
                                },
                        });
                },
                close: () => {

                        if (geminiSession) {
                                geminiSession.close();
                        }
                }
        }
}