import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import OpenAI from 'openai';
import { zodResponseFormat } from "openai/helpers/zod.js";
import { MAX_INPUT_TOKENS } from '../../config.js';
import { Context } from '../../context.js';
import { TextStepOutputChunk, TextStepsInput } from '../../entities/Task.js';
import { JsonLineSplitter } from '../../functions/json-splitter.js';
import { calculateEstimatedToken } from '../../functions/others.js';
import { calculateCost } from '../../functions/pricing.js';
import { CompactForTextSteps } from '../../messages/compact-for-text-steps/index.js';
import { TEACH_PLAN_SOURCE_OF_TRUTH, TEACHING_PLAN } from '../../prompts/teaching-plan-4 - lines.js';
import { AgentLine } from '../../server/types.js';
import { GetTask } from '../../tasks/get/index.js';
import { OnTextStepChunk } from '../../tasks/index.js';
import { CallTool } from '../../tools/call/index.js';
import { CreateUsage } from '../../usage/create/index.js';
import { DocumentOptionsSchema, DocumentTeachingSchema } from '../schemas.js';
import { Def, serviceName } from './def.js';

interface PendingToolCall {
    id: string;
    name: string;
    argsBuffer: string;
}

export const createService = (
    context: {
        getUserId: Context.GetUserId
        getOpenaiSession: Context.getOpenaiSession
        getTaskAbortContoller: Context.getTaskAbortContoller
    },
    depends: {
        // callTool: Service<CallTool>;
        onTextStepChunk: Service<OnTextStepChunk>;
        createUsage: Service<CreateUsage>;
        getTask: Service<GetTask>;
        compactForTextSteps: Service<CompactForTextSteps>;
        callTool: Service<CallTool>;
    },
) =>
    createBaseService<Def>(serviceName, ['taskUid'], async (params, scope, errorout, warn) => {

        const {task, taskGroup} = (await depends.getTask({uid: params.taskUid, include: ["taskGroup"]}, scope)).data

        const input = task.input as TextStepsInput

        const messages = (await depends.compactForTextSteps({conversationUid: taskGroup?.conversationUid!}, scope)).data.messages

        const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: input.instructions ?? TEACHING_PLAN },
        ];

        if(input.pageIndex) {
            openaiMessages[0].content += TEACH_PLAN_SOURCE_OF_TRUTH
        }

        for(const message of messages) {

            const estimatedTokens= calculateEstimatedToken([{content: message.content}])
            if(estimatedTokens > MAX_INPUT_TOKENS && message.type != "page-image") {
                console.error(`MAX_INPUT_TOKEN_EXCEEDED.`, message.type, message.content)
                throw new Error(`MAX_INPUT_TOKEN_EXCEEDED. tokens: ${estimatedTokens}. key: ${message.uid}`)
            }
            
            let role: 'system' | 'user' | 'assistant' = "user";

            // if(message.type == "page-image" || message.type == "page-analysis") {
            //     if(1 == 1)
            //     continue;
            // }
            switch(message.type) {
                case "instructions": role = "system"; break;
                case "page-analysis": role = "system"; break;
                case "page-image": role = "system"; break;
                case "user-text": role = "user"; break;
                case "assistant": role = "assistant"; break;
            }
            if(message.type == "page-image") {
                openaiMessages.push({
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: message.content,
                            },
                        },
                    ]
                })
            }
            else {
                openaiMessages.push({
                    role,
                    content: message.content
                })
            }
        }


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
                const result = await depends.callTool({ name: call.name, args }, scope);
                // callTool's return type is `any` — normalize to a string since
                // OpenAI's tool-result message content must be a string.
                return typeof result === 'string' ? result : JSON.stringify(result ?? { ok: true });
            } catch (err) {
                console.error(`❌ delegate.callTool failed for "${call.name}":`, err);
                return JSON.stringify({ ok: false, error: 'tool_execution_failed' });
            }
        }


        const activeAbortController = await context.getTaskAbortContoller(scope, task.uid)

        const splitter = new JsonLineSplitter<AgentLine>(async (index, line) => {

            if (activeAbortController?.signal.aborted) {
                return;
            }
            const chunk: TextStepOutputChunk = {
                stepIndex: index, 
                stepId: line.stepId, 
                language: line.lang as 'ar' | 'en', 
                textToSay: line.textToSay, 
                boardContent: line.boardContent,
            }
            await depends.onTextStepChunk({
                conversationUid: taskGroup?.conversationUid!,
                taskUid: params.taskUid,
                type: "step",
                chunk,
            }, scope);

        }, "steps");

        try {
            // const currentResId = generateReqId()


            const estimatedTokens = calculateEstimatedToken(openaiMessages)
            if (estimatedTokens > MAX_INPUT_TOKENS) {
                const byKey = messages.map((m, i) => ({ key: m.uid, tokens: calculateEstimatedToken([openaiMessages[i]]) }))
                // throw new Error(`MAX_INPUT_TOKEN_EXCEEDED. tokens: ${estimatedTokens}. Keys: ${JSON.stringify(byKey)}`)
            }


            // model: "gpt-4o", // Equivalent tier to gemini-2.5-flash
            // const model = "gpt-5.5-2026-04-23"
            // const model = "gpt-5.4-2026-03-05"
            // const model = "gpt-5.6-sol"
            // const model = 'gpt-5.4-mini-2026-03-17'
            const model = "gpt-5.6-luna"
            // 2. Request a streaming completion from OpenAI

            const openai = await context.getOpenaiSession(scope)
            const responseStream = await openai.chat.completions.create({
                model,
                messages: openaiMessages,
                stream: true,
                // tools: [
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
                    // {
                    //     type: "function",
                    //     function: {
                    //         name: "updateAssessmentScore",
                    //         description: "Call this function to update user assessment on a concept..",
                    //         parameters: {
                    //             type: "object",
                    //             properties: {
                    //                 conceptId: {
                    //                     type: "string",
                    //                     description: "Concept ID."
                    //                 },
                    //                 score: {
                    //                     type: "number",
                    //                     description: "Score from 1-10."
                    //                 }
                    //             },
                    //             required: ["conceptId", "score"]
                    //         }
                    //     }
                    // },
                    // {
                    //         type: "function",
                    //         function: {
                    //           name: 'writeOnTextbook',
                    //           description: 'Call this function whenever the user asks you to write on book, or generate a graphic vector layout on book.',
                    //           parameters: {
                    //                   type: 'object',
                    //                   properties: {
                    //                           svgCode: {
                    //                                   type: 'string',
                    //                                   description: 'The complete, raw, standard HTML/XML SVG code string (e.g., "<svg...><circle cx=\'50\'.../></svg>"). Do not wrap it in markdown code fences or backticks.'
                    //                           }
                    //                   },
                    //                   required: ['svgCode']
                    //           }
                    //         },
                    // },
                    // {
                    //         type: "function",
                    //         function: {
                    //           name: 'writeOnBoard',
                    //           description: `Use this function to write or draw on the virtual classroom whiteboard when a visual explanation would help the student understand the concept, including text, diagrams, equations, tables, graphs, MathML, or SVG drawings.

                    //           ### Examples include
                    //           * Drawing diagrams, number lines, tables, or simple graphs.
                    //           * Writing formulas, equations, or mathematical expressions.
                    //           * Comparing two concepts side by side.
                    //           * Showing the reasoning process.
                    //           * Creating examples that are not printed in the textbook.
                    //           * Summarizing the lesson at the end.

                    //           ### Rules
                    //           * Prefer the textbook when referring to existing page content.
                    //           * Switch to the whiteboard only when additional explanation or demonstration is needed.
                    //           * Call tool writeOnBoard before referring to what you have written.
                    //           * Write neatly and keep the board uncluttered.
                    //           * Reveal information progressively instead of writing everything at once.
                    //           * Keep each board view focused on a single teaching objective.
                    //           * After writing, guide the student's attention naturally by referring to specific parts of the board.
                    //           * When finished with the board explanation, continue the lesson normally. Return to the textbook only when the lesson requires referring to the page again.
                    //           * Board canvas width is 400px, height is 400px.
                    //           * When drawing symbols, ensure the correct direction if it has oppisite for RTL languages.
                    //           * For mathematical expressions, use inline MathML, example <math display="inline"> <mfrac> <mn>١</mn> <mn>١٠٠</mn> </mfrac> </math>.
                    //           `,
                    //           parameters: {
                    //                   type: 'object',
                    //                   properties: {
                    //                           html: {
                    //                                   type: 'string',
                    //                                   description: 'HTML content that includes tables, svg, MathMl, etc...'
                    //                           }
                    //                   },
                    //                   required: ['html']
                    //           }
                    //         },
                    // },
                    // {
                    //         type: "function",
                    //         function: {
                    //           name: 'openTutorial',
                    //           description: 'Call this function to open a tutorial defined in section.',
                    //           parameters: {
                    //                   type: 'object',
                    //                   properties: {
                    //                           tutorialId: {
                    //                                   type: 'string',
                    //                                   description: 'The ID of tutorial.'
                    //                           }
                    //                   },
                    //                   required: ['tutorialId']
                    //           }
                    //         },
                    // },
                    // {
                    //         type: "function",
                    //         function: {
                    //           name: 'changeTutorialStep',
                    //           description: 'Call this function to switch the current step of tutorial for user.',
                    //           parameters: {
                    //                   type: 'object',
                    //                   properties: {
                    //                         tutorialId: {
                    //                                 type: 'string',
                    //                                 description: 'The ID of tutorial.'
                    //                         },
                    //                         stepNumber: {
                    //                                 type: 'number',
                    //                                 description: 'The stepNumber.'
                    //                         }
                    //                   },
                    //                   required: ['stepNumber']
                    //           }
                    //         },
                    // },
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
                // ],
                // stream_options: {
                //     include_usage: true,
                // },
                response_format: input.mode === 'options' ? zodResponseFormat(DocumentOptionsSchema, 'options_payload') : zodResponseFormat(DocumentTeachingSchema, 'teaching_payload'),
                service_tier: 'priority',
            }, {
                signal: activeAbortController.signal
            });


            // 🌟 Peek-Ahead Manual Async Iterator Handling
            const iterator = responseStream[Symbol.asyncIterator]();
            let currentResult = await iterator.next();

            // Track full assistant content to append back to conversation context once complete
            let fullAssistantResponse = "";

            // 🔧 Accumulate streamed tool calls here, keyed by their index
            // in the tool_calls array (NOT by id — id may only show up
            // on the first delta for that index).
            const pendingToolCalls = new Map<number, PendingToolCall>();
            let finishReason: string | null | undefined = null;

            let usage;
            // {"prompt_tokens":10819,"completion_tokens":632,"total_tokens":11451,"prompt_tokens_details":{"cached_tokens":0,"audio_tokens":0},"completion_tokens_details":{"reasoning_tokens":512,"audio_tokens":0,"accepted_prediction_tokens":0,"rejected_prediction_tokens":0}}


            let i = -1;
            while (!currentResult.done) {
                i++;
                if (activeAbortController.signal.aborted) {
                    break;
                }
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
                    // if (writeToFile) {
                    //     fs.appendFileSync(`./${writeToFile}.txt`, textToken + (i === 0 ? '\n---------\n' : ''), 'utf-8')
                    // }
                    fullAssistantResponse += textToken;
                    // console.log(`📋 Received Text Token [Last Chunk=${isLastChunk}]: ${textToken}`);

                    splitter.push(textToken)

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

            if (!activeAbortController.signal.aborted) {
                // we should only used this when the response is completed, in aborted status, the response json object is not complete, so it will through error. 
                splitter.end()
            }

            const reasoningTokens = (usage?.prompt_tokens_details as any)?.reasoning_tokens ?? 0

            const tokensCount = {
                input: usage?.prompt_tokens ?? 0,
                cachedInput: usage?.prompt_tokens_details?.cached_tokens ?? 0,
                output: usage?.completion_tokens ?? 0,
            }
            const cost = calculateCost(model, tokensCount)

            await depends.createUsage({
                task: 'teaching',
                model,
                type: 'tokens',
                cost: cost.total,
                tokens: tokensCount,
                info: `Input tokens: ${tokensCount.input} costs: ${cost.input}, Cached Input tokens: ${tokensCount.cachedInput} costs: ${cost.cachedInput}, output: ${tokensCount.output} includes reasoning tokens (${reasoningTokens}) costs: ${cost.output}. model: ${model}. Details: ${JSON.stringify(usage)}`
            }, scope)

            // 3. If the model finished because it wants to call tool(s),
            //    execute each fully-assembled call now.
            if (finishReason === 'tool_calls' && pendingToolCalls.size > 0) {
                const orderedCalls = Array.from(pendingToolCalls.entries())
                    .sort(([a], [b]) => a - b)
                    .map(([, call]) => call);

                // Record the assistant's tool-call request in history so
                // the subsequent "tool" role messages have a matching
                // assistant turn to attach to (required by the API).
                openaiMessages.push({
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
                    console.log(`[text-openai-lines] 🤖 Executing tool call: ${call.name}(${call.argsBuffer})`);
                    const resultContent = await executeToolCall(call);

                    openaiMessages.push({
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
                // delegate.onMessage({
                //     type: 'text',
                //     turnComplete: true
                // });

                // Keep chat context updated so subsequent write calls have memory
                if (fullAssistantResponse) {
                    openaiMessages.push({ role: "assistant", content: fullAssistantResponse });
                }
            }

            // 🔁 Re-requests a completion using the current `messages`
            // (which now includes the tool call + tool result entries)
            // so the model can continue the turn after seeing tool output.
            async function continueAfterToolCalls() {
                const toolModel = 'gpt-4o-2024-08-06'
                const followUpStream = await openai.chat.completions.create({
                    model: toolModel,
                    messages: openaiMessages,
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
                        // if(writeToFile) {
                        //     fs.appendFileSync(`./${writeToFile}.txt`, token, 'utf-8')
                        // }
                        followUpText += token;
                        console.warn(`Not implemented..`)
                        // delegate.onMessage({
                        //     type: 'text',
                        //     data: { content: token },
                        //     turnComplete: false,
                        // });
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

                // delegate.onMessage({
                //     type: 'text',
                //     turnComplete: true,
                // });

                if (followUpText) {
                    openaiMessages.push({ role: "assistant", content: followUpText });
                }
            }

        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('Stream aborted safely by a new user input message.');
            } else {
                console.error('❌ Error during stream generation:', err.message);
            }
        } finally {
            // activeAbortController = null;
        }

        const output = await splitter.getJson() as Def["Data"]["output"];

        return {
            output,
        };
    });
