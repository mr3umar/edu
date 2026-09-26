import fs from 'fs';
import OpenAI from "openai";
import { WebSocket } from 'ws';
import { calculateCost } from "./pricing.js";
import { TEACHING_PLAN } from "./prompts/teaching-plan-4 - lines.js";
import { TextDelegate } from "./types.js";

// Initialize the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Shape used to accumulate a single streamed tool call across many chunks.
// OpenAI streams tool_calls as deltas keyed by array `index`: the `id` and
// `name` typically arrive once on the first chunk for that index, then
// `arguments` arrives as a sequence of string fragments that must be
// concatenated (NOT parsed) until the call is complete.
interface PendingToolCall {
    id: string;
    name: string;
    argsBuffer: string;
}

export async function initOpenAILiveText(bookId: string, wsClient: WebSocket, delegate: TextDelegate, instructions?: string, writeToFile?: string) {
    // 🧠 Maintain local state for conversation history (mimicking ai.chats state)


    
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: instructions ?? TEACHING_PLAN },
        
    ];


    if (wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({ event: 'status', data: 'Connected to OpenAI Text Stream!' }));
    }

    let activeAbortController: AbortController | null = null;

    // 🔧 Executes a fully-assembled tool call via delegate.callTool and
    // returns the string result that gets fed back to OpenAI as a
    // `role: "tool"` message. The delegate owns *what* each tool actually
    // does (rendering SVG to the textbook UI, persisting an assessment
    // score, etc) — this function's job is just parsing args, calling
    // through, and normalizing whatever comes back into a string.
    async function executeToolCall(call: PendingToolCall): Promise<string> {
        let args: any;
        try {
            args = call.argsBuffer ? JSON.parse(call.argsBuffer) : {};
        } catch (err) {
            console.error(`❌ Failed to parse arguments for tool "${call.name}":`, call.argsBuffer, err);
            return JSON.stringify({ ok: false, error: 'invalid_arguments_json' });
        }

        try {
            console.log(`🤖 Delegating tool call: ${call.name}(${JSON.stringify(args)})`);
            const result = await delegate.callTool({ name: call.name, args });
            // callTool's return type is `any` — normalize to a string since
            // OpenAI's tool-result message content must be a string.
            return typeof result === 'string' ? result : JSON.stringify(result ?? { ok: true });
        } catch (err) {
            console.error(`❌ delegate.callTool failed for "${call.name}":`, err);
            return JSON.stringify({ ok: false, error: 'tool_execution_failed' });
        }
    }

    let _text = '';
    

    return {
        write: (text: string, force?: boolean, role?: 'system' | 'user') => {
            if(role == "system") {
                messages.push({role: 'system', content: text})
                return
            }
            if(hasLettersOrNumbers(text) || force)
                _text += text + "\n"
        },
        send: async (instructions?: string) => {
            if(_text == "") {
                console.log(`[text ai sending ignored] ${_text}`)
                return
            }
            
            console.log(`[text ai sending..] ${_text}`)
            try {
                if (activeAbortController) {
                    activeAbortController.abort();
                }

                activeAbortController = new AbortController();

                // 1. Push user's incoming message into the conversation thread
                messages.push({ role: "user", content: _text });

                _text = ''


                // model: "gpt-4o", // Equivalent tier to gemini-2.5-flash
                // const model = "gpt-5.5-2026-04-23"
                const model = "gpt-5.4-2026-03-05"
                // const model = 'gpt-5.4-mini-2026-03-17'
                // 2. Request a streaming completion from OpenAI
                const responseStream = await openai.chat.completions.create({
                    model,
                    messages: instructions ? [...messages, {role: 'system', content: instructions}] : messages,
                    stream: true,
                    tools: [
                        // {
                        //     type: "function",
                        //     function: {
                        //         name: "getPageContent",
                        //         description: "Call this function to load all page content. This function should be load once per page because page content is static.",
                        //         parameters: {
                        //             type: "object",
                        //             properties: {
                        //                 pageNumber: {
                        //                     type: "string",
                        //                     description: "page number"
                        //                 },
                        //             },
                        //             required: ["pageNumber"]
                        //         }
                        //     }
                        // },
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
                        },
                        {
                                type: "function",
                                function: {
                                  name: 'writeOnBoard',
                                  description: `Use this function to write or draw on the virtual classroom whiteboard when a visual explanation would help the student understand the concept, including text, diagrams, equations, tables, graphs, MathML, or SVG drawings.
                                  
                                  ### Examples include
                                  * Drawing diagrams, number lines, tables, or simple graphs.
                                  * Writing formulas, equations, or mathematical expressions.
                                  * Comparing two concepts side by side.
                                  * Showing the reasoning process.
                                  * Creating examples that are not printed in the textbook.
                                  * Summarizing the lesson at the end.
                                  
                                  ### Rules
                                  * Prefer the textbook when referring to existing page content.
                                  * Switch to the whiteboard only when additional explanation or demonstration is needed.
                                  * Call tool writeOnBoard before referring to what you have written.
                                  * Write neatly and keep the board uncluttered.
                                  * Reveal information progressively instead of writing everything at once.
                                  * Keep each board view focused on a single teaching objective.
                                  * After writing, guide the student's attention naturally by referring to specific parts of the board.
                                  * When finished with the board explanation, continue the lesson normally. Return to the textbook only when the lesson requires referring to the page again.
                                  * Board canvas width is 400px, height is 400px.
                                  * When drawing symbols, ensure the correct direction if it has oppisite for RTL languages.
                                  * For mathematical expressions, use inline MathML, example <math display="inline"> <mfrac> <mn>١</mn> <mn>١٠٠</mn> </mfrac> </math>.
                                  `,
                                  parameters: {
                                          type: 'object',
                                          properties: {
                                                  html: {
                                                          type: 'string',
                                                          description: 'HTML content that includes tables, svg, MathMl, etc...'
                                                  }
                                          },
                                          required: ['html']
                                  }
                                },
                        },
                        {
                                type: "function",
                                function: {
                                  name: 'openTutorial',
                                  description: 'Call this function to open a tutorial defined in section.',
                                  parameters: {
                                          type: 'object',
                                          properties: {
                                                  tutorialId: {
                                                          type: 'string',
                                                          description: 'The ID of tutorial.'
                                                  }
                                          },
                                          required: ['tutorialId']
                                  }
                                },
                        },
                        {
                                type: "function",
                                function: {
                                  name: 'changeTutorialStep',
                                  description: 'Call this function to switch the current step of tutorial for user.',
                                  parameters: {
                                          type: 'object',
                                          properties: {
                                                tutorialId: {
                                                        type: 'string',
                                                        description: 'The ID of tutorial.'
                                                },
                                                stepNumber: {
                                                        type: 'number',
                                                        description: 'The stepNumber.'
                                                }
                                          },
                                          required: ['stepNumber']
                                  }
                                },
                        },
                        // {
                        //         type: "function",
                        //         function: {
                        //           name: 'showOptions',
                        //           description: 'Call this function to show to user a list options.',
                        //           parameters: {
                        //                   type: 'object',
                        //                   properties: {
                        //                         options: {
                        //                                 type: 'array',
                        //                                 description: 'List of options.',
                        //                                 items: {
                        //                                     type: 'object',
                        //                                     properties: {
                        //                                       content: {
                        //                                         type: 'string',
                        //                                         description: 'content of the option. could be Text or Html .'
                        //                                       }
                        //                                     },
                        //                                     required: ['content'],
                        //                                     additionalProperties: false
                        //                                   }
                        //                         }
                        //                   },
                        //                   required: ["options"],
                        //                   additionalProperties: false
                        //           }
                        //         },
                        // }
                    ],       
                    stream_options: {
                        include_usage: true,
                    },
                }, {
                    signal: activeAbortController.signal
                });
                console.log(`[openai.chat.completions.create after]`)


                // 🌟 Peek-Ahead Manual Async Iterator Handling
                const iterator = responseStream[Symbol.asyncIterator]();
                let currentResult = await iterator.next();
                console.log(`[iterator.next after]`)

                // Track full assistant content to append back to conversation context once complete
                let fullAssistantResponse = "";

                // 🔧 Accumulate streamed tool calls here, keyed by their index
                // in the tool_calls array (NOT by id — id may only show up
                // on the first delta for that index).
                const pendingToolCalls = new Map<number, PendingToolCall>();
                let finishReason: string | null | undefined = null;

                let usage;
                // {"prompt_tokens":10819,"completion_tokens":632,"total_tokens":11451,"prompt_tokens_details":{"cached_tokens":0,"audio_tokens":0},"completion_tokens_details":{"reasoning_tokens":512,"audio_tokens":0,"accepted_prediction_tokens":0,"rejected_prediction_tokens":0}}

                while (!currentResult.done) {
                    const chunk = currentResult.value;
                    const nextResult = await iterator.next();
                    const isLastChunk = nextResult.done ?? false;

                    const choice = chunk.choices[0];

                    if (choice?.finish_reason) {
                        finishReason = choice.finish_reason;
                    }

                    if (chunk.usage) {
                        usage = chunk.usage;
                    }

                    // Extract text token from choices block
                    const textToken = choice?.delta?.content;

                    if (textToken) {
                        if(writeToFile) {
                            fs.appendFileSync(`./${writeToFile}.txt`, textToken, 'utf-8')
                        }
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

                    // 🔍 Accumulate streamed tool call fragments by index
                    const toolCalls = choice?.delta?.tool_calls;
                    if (toolCalls) {
                        for (const toolCallDelta of toolCalls) {
                            const idx = toolCallDelta.index;

                            let pending = pendingToolCalls.get(idx);
                            if (!pending) {
                                pending = {
                                    id: toolCallDelta.id ?? '',
                                    name: toolCallDelta.function?.name ?? '',
                                    argsBuffer: '',
                                };
                                pendingToolCalls.set(idx, pending);
                            }

                            // id and name usually only appear on the first
                            // delta for this index, but guard anyway in case
                            // a provider sends them again/late.
                            if (toolCallDelta.id) {
                                pending.id = toolCallDelta.id;
                            }
                            if (toolCallDelta.function?.name) {
                                pending.name = toolCallDelta.function.name;
                            }
                            if (toolCallDelta.function?.arguments) {
                                pending.argsBuffer += toolCallDelta.function.arguments;
                            }
                        }
                    }

                    currentResult = nextResult;
                }

                const reasoningTokens = (usage?.prompt_tokens_details as any)?.reasoning_tokens ?? 0

                const tokensCount = {
                    input: usage?.prompt_tokens ?? 0,
                    cachedInput: usage?.prompt_tokens_details?.cached_tokens ?? 0,
                    output: usage?.completion_tokens ?? 0,
                }
                const cost = calculateCost(model, tokensCount)
                delegate.recordUsage(cost.total, {
                    type: 'tokens',
                    tokens: tokensCount,
                    info: `Input tokens: ${tokensCount.input} costs: ${cost.input}, Cached Input tokens: ${tokensCount.cachedInput} costs: ${cost.cachedInput}, output: ${tokensCount.output} includes reasoning tokens (${reasoningTokens}) costs: ${cost.output}. model: ${model}. Details: ${JSON.stringify(usage)}`
                })
                
                // 3. If the model finished because it wants to call tool(s),
                //    execute each fully-assembled call now.
                if (finishReason === 'tool_calls' && pendingToolCalls.size > 0) {
                    const orderedCalls = Array.from(pendingToolCalls.entries())
                        .sort(([a], [b]) => a - b)
                        .map(([, call]) => call);

                    // Record the assistant's tool-call request in history so
                    // the subsequent "tool" role messages have a matching
                    // assistant turn to attach to (required by the API).
                    messages.push({
                        role: "assistant",
                        content: fullAssistantResponse || null,
                        tool_calls: orderedCalls.map(call => ({
                            id: call.id,
                            type: "function",
                            function: {
                                name: call.name,
                                arguments: call.argsBuffer,
                            },
                        })),
                    } as OpenAI.Chat.ChatCompletionMessageParam);

                    for (const call of orderedCalls) {
                        console.log(`🤖 Executing tool call: ${call.name}(${call.argsBuffer})`);
                        const resultContent = await executeToolCall(call);

                        messages.push({
                            role: "tool",
                            tool_call_id: call.id,
                            content: resultContent,
                        } as OpenAI.Chat.ChatCompletionMessageParam);
                    }

                    // The model is now waiting on tool results before it can
                    // produce its next chunk of user-facing text. Recurse
                    // back into the same flow by re-invoking write() with no
                    // new user text — instead we directly re-run the request
                    // so the model can react to the tool outputs and keep
                    // streaming text to the user in the same turn.
                    await continueAfterToolCalls();
                } else {
                    delegate.onMessage({
                        type: 'text',
                        turnComplete: true
                    });

                    // Keep chat context updated so subsequent write calls have memory
                    if (fullAssistantResponse) {
                        messages.push({ role: "assistant", content: fullAssistantResponse });
                    }
                }

                // 🔁 Re-requests a completion using the current `messages`
                // (which now includes the tool call + tool result entries)
                // so the model can continue the turn after seeing tool output.
                console.log(messages)
                async function continueAfterToolCalls() {
                    const toolModel = 'gpt-4o-2024-08-06'
                    const followUpStream = await openai.chat.completions.create({
                        model: toolModel,
                        messages: messages,
                        stream: true,
                        tools: undefined, // optional: omit/keep depending on whether chained tool calls are desired
                    }, {
                        signal: activeAbortController?.signal,
                    });

                    let followUpText = "";

                    let toolUsage;
                    for await (const chunk of followUpStream) {

                        if (chunk.usage) {
                            toolUsage = chunk.usage;
                        }
                        const token = chunk.choices[0]?.delta?.content;
                        if (token) {
                            if(writeToFile) {
                                fs.appendFileSync(`./${writeToFile}.txt`, token, 'utf-8')
                            }
                            followUpText += token;
                            delegate.onMessage({
                                type: 'text',
                                data: { content: token },
                                turnComplete: false,
                            });
                        }
                    }


                    const reasoningTokens = (toolUsage?.prompt_tokens_details as any)?.reasoning_tokens ?? 0

                    const tokensCount = {
                        input: toolUsage?.prompt_tokens ?? 0,
                        cachedInput: toolUsage?.prompt_tokens_details?.cached_tokens ?? 0,
                        output: toolUsage?.completion_tokens ?? 0,
                    }
                    const cost = calculateCost(toolModel, tokensCount)
                    console.log(`[tool cost] Input tokens: ${tokensCount.input} costs: ${cost.input}, Cached Input tokens: ${tokensCount.cachedInput} costs: ${cost.cachedInput}, output: ${tokensCount.output} includes reasoning tokens (${reasoningTokens}) costs: ${cost.output}. model: ${model}. Details: ${JSON.stringify(toolUsage)}`)
            
                    
                    delegate.onMessage({
                        type: 'text',
                        turnComplete: true,
                    });

                    if (followUpText) {
                        messages.push({ role: "assistant", content: followUpText });
                    }
                }

            } catch (err: any) {
                if (err.name === 'AbortError') {
                    console.log('Stream aborted safely by a new user input message.');
                } else {
                    console.error('❌ Error during stream generation:', err);
                }
            } finally {
                // activeAbortController = null;
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

export function hasLettersOrNumbers(text: string) {
    return /[\p{L}\p{N}]/u.test(text);
  }