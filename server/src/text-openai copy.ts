import OpenAI from "openai";
import { WebSocket } from 'ws';
import { TEACHING_PLAN } from "./prompts/teaching-plan-4 - lines.js";
import { TextDelegate } from "./types.js";
import fs from 'fs'

// Initialize the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function initOpenAILiveText(wsClient: WebSocket, delegate: TextDelegate) {
    // 🧠 Maintain local state for conversation history (mimicking ai.chats state)
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: TEACHING_PLAN }
    ];

    if (wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({ event: 'status', data: 'Connected to OpenAI Text Stream!' }));
    }

    let activeAbortController: AbortController | null = null;

    return {
        write: async (text: string) => {
            try {
                if (activeAbortController) {
                    activeAbortController.abort();
                }

                activeAbortController = new AbortController();

                // 1. Push user's incoming message into the conversation thread
                messages.push({ role: "user", content: text });

                // 2. Request a streaming completion from OpenAI
                const responseStream = await openai.chat.completions.create({
                    model: "gpt-4o", // Equivalent tier to gemini-2.5-flash
                    messages: messages,
                    stream: true,
                    tools: [
                        {
                            type: "function",
                            function: {
                                name: "updateAssessmentScore",
                                description: "Call this function to update user assessment on a concept..",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        conceptId: {
                                            type: "string",
                                            description: "Concept ID."
                                        },
                                        score: {
                                            type: "number",
                                            description: "Score from 1-10."
                                        }
                                    },
                                    required: ["conceptId", "score"]
                                }
                            }
                        },
                        {
                                type: "function",
                                function: {
                                  name: 'writeOnTextbook',
                                  description: 'Call this function whenever the user asks you to write on book, or generate a graphic vector layout on book.',
                                  parameters: {
                                          type: 'object',
                                          properties: {
                                                  svgCode: {
                                                          type: 'string',
                                                          description: 'The complete, raw, standard HTML/XML SVG code string (e.g., "<svg...><circle cx=\'50\'.../></svg>"). Do not wrap it in markdown code fences or backticks.'
                                                  }
                                          },
                                          required: ['svgCode']
                                  }
                                },
                        }
                    ]
                }, {
                    signal: activeAbortController.signal
                });

                // 🌟 Peek-Ahead Manual Async Iterator Handling
                const iterator = responseStream[Symbol.asyncIterator]();
                let currentResult = await iterator.next();
                
                // Track full assistant content to append back to conversation context once complete
                let fullAssistantResponse = "";

                while (!currentResult.done) {
                    const chunk = currentResult.value;
                    const nextResult = await iterator.next();
                    const isLastChunk = nextResult.done ?? false;

                    // Extract text token from choices block
                    const textToken = chunk.choices[0]?.delta?.content;

                    if (textToken) {
                        fs.appendFileSync('./initOpenAILiveText.txt', textToken, 'utf-8')
                        fullAssistantResponse += textToken;
                        // console.log(`📋 Received Text Token [Last Chunk=${isLastChunk}]: ${textToken}`);
                        
                        delegate.onMessage({
                            type: 'text',
                            data: {
                                content: textToken,
                            },
                            turnComplete: false, //isLastChunk
                        });
                    }

                    // 🔍 Intercept potential tool calls
                    const toolCalls = chunk.choices[0]?.delta?.tool_calls;
                    if (toolCalls) {
                        for (const toolCall of toolCalls) {
                            // Note: OpenAI streams tool args as fragmented strings! 
                            // You collect them or handle completion if toolCall.function.arguments is ready
                            console.log(`🤖 OpenAI Tool call piece:`, toolCall.function);
                        }
                    }

                    currentResult = nextResult;
                }


                delegate.onMessage({
                        type: 'text',
                        turnComplete: true
                    });
                // 3. Keep chat context updated so subsequent write calls have memory
                if (fullAssistantResponse) {
                    messages.push({ role: "assistant", content: fullAssistantResponse });
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
            console.log('🤖 OpenAI text session closed cleanly.');
            if (activeAbortController) {
                activeAbortController.abort();
            }
            // Clear message history to prevent leaks
            messages.length = 0; 
        }
    };
}