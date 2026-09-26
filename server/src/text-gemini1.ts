import { GoogleGenAI, Type } from "@google/genai";
import { WebSocket } from 'ws';
import { TEACHING_PLAN } from "./prompts/teaching-plan-4 - lines.js";
import { TextDelegate } from "./types.js";
import { getBook, tutorial1 } from "./get-book.js";
// import { DEMO_PAGE_NUMBER } from "./index.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function initGeminiLiveText(bookId: string, wsClient: WebSocket, delegate: TextDelegate) {


        let systemInstruction = TEACHING_PLAN
    
        // const book = await getBook(bookId, { schema: true })
        // book.pages.forEach(p => {
        //   delete p.words
        // })
        
        //   const page = book.pages.find((p) => p.pageNumber == DEMO_PAGE_NUMBER.value)
        //   if(page) {
        //     const section = page.sectionId ? book.sections.find(s => s.id == page.sectionId) : undefined
        //     const relatedPages = section ? book.pages.filter(p => p.sectionId == page.sectionId && p.pageNumber != page.pageNumber) : []
            
        //     const pageContent =  { 
        //         page, 
        //         relatedPages, 
        //         section: {
        //             ...section, tutorials: [{id: '001', steps: tutorial1.steps}]
        //         } 
        //     }
        
        //     systemInstruction += `\n\n Book Content: ${JSON.stringify(pageContent)}`
        //   }
    
          
    // We maintain a chat session to preserve conversation history between 'write' calls
    const chat = ai.chats.create({
        // model: 'gemini-2.5-flash', // Use the standard flash model for pure text streaming
        // model: 'gemini-3.1-flash-lite', // Use the standard flash model for pure text streaming
    model: "gemini-2.5-pro",
    config: {
                systemInstruction,
            tools: [
                {
                        functionDeclarations: [
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
                                    name: 'createTutorial',
                                    description: '',
                                    parameters: {
                                            type: Type.OBJECT,
                                            properties: {
                                                    idea: {
                                                            type: Type.STRING,
                                                            description: ""
                                                    },
                                            },
                                            required: ['idea']
                                    }
                            }
                        ]
                }
            ]
        },
        
    });

    // Notify the client that the text pipeline is ready
    if (wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({ event: 'status', data: 'Connected to Gemini Text Stream!' }));
    }

    // Keep track of active requests so we can cancel them if close() is called mid-stream
    let activeAbortController: AbortController | null = null;

    return {
        send: () => {},
        write: async (text: string) => {
            try {
                // Cancel any unresolved text-generation streams still running
                if (activeAbortController) {
                    activeAbortController.abort();
                }

                activeAbortController = new AbortController();

                // Call the regular streaming endpoint
                const responseStream = await chat.sendMessageStream({
                    message: text,
                });

                const iterator = responseStream[Symbol.asyncIterator]();
                
                // Fetch the very first chunk frame
                let currentResult = await iterator.next();

                while (!currentResult.done) {
                    const chunk = currentResult.value;
                    
                    // Peek ahead to fetch the *next* block in line
                    const nextResult = await iterator.next();
                    
                    // If nextResult.done is true, then 'chunk' is guaranteed to be the last chunk!
                    const isLastChunk = nextResult.done ?? false;

                    if (chunk.text) {
                        console.log(`📋 Received Text Token [Last Chunk=${isLastChunk}]: ${chunk.text}`);
                        
                        delegate.onMessage({
                            type: 'text',
                            data: {
                                content: chunk.text,
                            },
                            turnComplete: isLastChunk
                        });
                    }

                    // Move down the line
                    currentResult = nextResult;
                }
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    console.log('Stream aborted safely by a new user input message.');
                } else {
                    console.error('❌ Error during stream generation:', err);
                }
            } finally {
                activeAbortController = null;
            }
        },
        close: () => {
            console.log('🤖 Gemini text session closed cleanly.');
            if (activeAbortController) {
                activeAbortController.abort();
            }
        }
    };
}