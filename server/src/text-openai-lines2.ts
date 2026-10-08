import fs from 'fs';
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod.js";
import { WebSocket } from 'ws';

import { MAX_INPUT_TOKENS } from './config.js';
import { calculateCost, MODEL_PRICING } from "./pricing.js";
import { TEACHING_PLAN } from "./prompts/teaching-plan-4 - lines.js";
import {
    calculateEstimatedToken,
    DocumentOptionsSchema,
    DocumentTeachingSchema,
    generateReqId,
    JsonLineSplitter
} from './text-openai-lines.js';
import { LinesDelegate } from "./types.js";


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


interface PendingToolCall {
    id: string;
    name: string;
    argsBuffer: string;
}


/**
 * Structured output returned by the teaching model.
 */

export async function initOpenAILiveLines(
    bookId: string | undefined,
    wsClient: WebSocket,
    delegate: LinesDelegate,
    instructions?: string,
    writeToFile?: string
) {

    /**
     * ------------------------------------------------------------
     * Responses API conversation state
     * ------------------------------------------------------------
     *
     * Instead of keeping the complete assistant history locally,
     * we keep the ID of the last completed Responses API response.
     *
     * The next request uses previous_response_id.
     */
    let previousResponseId: string | undefined = undefined;


    /**
     * Base instructions.
     *
     * This corresponds to your original:
     *
     * { role: "system", content: instructions ?? TEACHING_PLAN }
     */
    const baseInstructions = instructions ?? TEACHING_PLAN;


    /**
     * We still keep a lightweight local history for:
     *
     * - estimating input size
     * - debugging
     * - logging
     * - tracking images/current user inputs
     *
     * It is NOT sent back to OpenAI when previousResponseId exists.
     */
    const localInputs: Array<{
        role: "user";
        content: any;
    }> = [];


    /**
     * If you later add Responses API function tools, put their
     * definitions here.
     *
     * Currently your original code has tools: [], so there are
     * no actual model-callable tools configured.
     */
    const tools: any[] = [];


    if (wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(
            JSON.stringify({
                event: 'status',
                data: 'Connected to OpenAI Text Stream!'
            })
        );
    }


    let lastAbortController: AbortController | undefined = undefined;


    /**
     * ------------------------------------------------------------
     * Tool execution
     * ------------------------------------------------------------
     */

    async function executeToolCall(
        call: PendingToolCall,
    ): Promise<string> {

        let args: any;

        try {
            args = call.argsBuffer
                ? JSON.parse(call.argsBuffer)
                : {};
        } catch (err) {

            console.error(
                `❌ Failed to parse arguments for tool "${call.name}":`,
                call.argsBuffer,
                err
            );

            return JSON.stringify({
                ok: false,
                error: 'invalid_arguments_json'
            });
        }


        try {

            console.log(
                `🤖 Delegating tool call: ${call.name}(${JSON.stringify(args)})`
            );

            const result = await delegate.callTool({
                name: call.name,
                args
            });

            return typeof result === 'string'
                ? result
                : JSON.stringify(result ?? { ok: true });

        } catch (err) {

            console.error(
                `❌ delegate.callTool failed for "${call.name}":`,
                err
            );

            return JSON.stringify({
                ok: false,
                error: 'tool_execution_failed'
            });
        }
    }


    /**
     * ------------------------------------------------------------
     * Main state
     * ------------------------------------------------------------
     */

    let _text = '';
    let _additionalInstructions = '';

    let msgsKeys: string[] = ["instructions-main"];


    /**
     * ------------------------------------------------------------
     * Continue a Responses API request after tool calls
     * ------------------------------------------------------------
     *
     * Responses API allows us to continue from the previous
     * response instead of resending the whole conversation.
     */
    async function continueAfterToolCalls(
        responseId: string,
        toolCalls: PendingToolCall[],
        activeAbortController: AbortController
    ): Promise<void> {

        if (toolCalls.length === 0) {
            return;
        }


        /**
         * Execute tools.
         *
         * They can be executed in parallel because they are
         * independent unless your application specifically
         * requires ordering.
         */
        const toolResults = await Promise.all(
            toolCalls.map(async (call) => {

                const resultContent = await executeToolCall(call);

                return {
                    type: "function_call_output" as const,
                    call_id: call.id,
                    output: resultContent
                };
            })
        );


        if (activeAbortController.signal.aborted) {
            return;
        }


        /**
         * Continue the SAME response conversation.
         */
        const followUpStream = await openai.responses.create({

            model: "gpt-4o-2024-08-06",

            previous_response_id: responseId,

            /**
             * Responses API function-call outputs.
             */
            input: toolResults,

            /**
             * Keep the same system/developer instructions because
             * instructions are request-level and should be supplied
             * again when continuing.
             */
            instructions: baseInstructions,

            stream: true,

            text: {
                format: zodTextFormat(
                    DocumentTeachingSchema,
                    "teaching_payload"
                )
            },

            /**
             * No further tools currently.
             *
             * Add tools here if chained tool calls are required.
             */
            tools: []

        }, {
            signal: activeAbortController.signal
        });


        let followUpText = '';

        let usage: any = undefined;

        let latestResponseId: string | undefined = undefined;


        let i = -1;
        for await (const event of followUpStream) {
            i++;

            if (activeAbortController.signal.aborted) {
                break;
            }


            /**
             * ----------------------------------------------------
             * Streamed text
             * ----------------------------------------------------
             */
            if (event.type === "response.output_text.delta") {

                const token = event.delta;

                if (!token) {
                    continue;
                }


                if (writeToFile) {
                    fs.appendFileSync(
                        `./${writeToFile}.txt`,
                        token + (i === 0 ? '\n---------\n' : '\n'),
                        'utf-8'
                    );
                }


                followUpText += token;

                splitterForFollowUp.push(token);
            }


            /**
             * ----------------------------------------------------
             * Function call argument streaming
             * ----------------------------------------------------
             */
            if (
                event.type ===
                "response.function_call_arguments.delta"
            ) {

                const itemId = event.item_id;

                let pending =
                    chainedToolCalls.get(itemId);


                if (!pending) {

                    pending = {
                        id: itemId,
                        name: '',
                        argsBuffer: ''
                    };

                    chainedToolCalls.set(
                        itemId,
                        pending
                    );
                }


                pending.argsBuffer += event.delta;
            }


            /**
             * ----------------------------------------------------
             * Completed output item
             * ----------------------------------------------------
             */
            if (event.type === "response.output_item.done") {

                const item = event.item;


                if (item.type === "function_call" && item.id) {

                    let pending =
                        chainedToolCalls.get(item.id);


                    if (!pending) {

                        pending = {
                            id: item.id,
                            name: item.name,
                            argsBuffer: item.arguments
                        };

                        chainedToolCalls.set(
                            item.id,
                            pending
                        );

                    } else {

                        pending.name = item.name;
                        pending.argsBuffer = item.arguments;
                    }
                }
            }


            /**
             * ----------------------------------------------------
             * Completed response
             * ----------------------------------------------------
             */
            if (event.type === "response.completed") {

                latestResponseId =
                    event.response.id;

                usage =
                    event.response.usage;
            }
        }


        if (
            !activeAbortController.signal.aborted &&
            latestResponseId
        ) {

            previousResponseId =
                latestResponseId;
        }


        /**
         * Record usage.
         */
        if (usage) {

            const reasoningTokens =
                usage.output_tokens_details
                    ?.reasoning_tokens ?? 0;


            const tokensCount = {
                input: usage.input_tokens ?? 0,

                cachedInput:
                    usage.input_tokens_details
                        ?.cached_tokens ?? 0,

                output:
                    usage.output_tokens ?? 0
            };


            const toolModel =
                "gpt-4o-2024-08-06";


            const cost =
                calculateCost(
                    toolModel,
                    tokensCount
                );


            delegate.recordUsage(
                cost.total,
                {
                    task: 'teaching',
                    model: toolModel,
                    type: 'tokens',

                    tokens: tokensCount,

                    info:
                        `Input tokens: ${tokensCount.input} ` +
                        `costs: ${cost.input}, ` +

                        `Cached Input tokens: ${tokensCount.cachedInput} ` +
                        `costs: ${cost.cachedInput}, ` +

                        `output: ${tokensCount.output} ` +
                        `includes reasoning tokens (${reasoningTokens}) ` +
                        `costs: ${cost.output}. ` +

                        `model: ${toolModel}. ` +

                        `Details: ${JSON.stringify(usage)}`
                }
            );
        }


        /**
         * --------------------------------------------------------
         * Chained tools
         * --------------------------------------------------------
         */
        const nextToolCalls =
            Array.from(
                chainedToolCalls.values()
            );


        if (
            !activeAbortController.signal.aborted &&
            nextToolCalls.length > 0 &&
            latestResponseId
        ) {

            chainedToolCalls.clear();

            await continueAfterToolCalls(
                latestResponseId,
                nextToolCalls,
                activeAbortController
            );

        } else {

            if (
                !activeAbortController.signal.aborted &&
                followUpText
            ) {
                // Response state is already maintained by OpenAI.
            }
        }
    }


    /**
     * Separate map used for chained tool calls.
     */
    const chainedToolCalls =
        new Map<string, PendingToolCall>();


    /**
     * Separate splitter for the continuation stream.
     *
     * It uses the same callbacks as the main splitter.
     */
    const splitterForFollowUp =
        new JsonLineSplitter(
            (index, line) => {

                if (
                    lastAbortController?.signal.aborted
                ) {
                    return;
                }

                delegate.onMessage(
                    "TBD",
                    index,
                    line.stepId,
                    line.lang,
                    line.textToSay,
                    line.boardContent,
                    lastAbortController!.signal
                );

            }, 
            (full, err) => {
                if(lastAbortController?.signal.aborted) {
                    return;
                }
                if(err) {
                    console.error(`Cannot read full json stream. Error: ${err.message}`)
                    return
                }
                delegate.onCompleted(full)
            }
        );


    /**
     * ------------------------------------------------------------
     * Public API
     * ------------------------------------------------------------
     */

    return {

        /**
         * --------------------------------------------------------
         * write()
         * --------------------------------------------------------
         */
        write: (
            key: string,
            text: string,
            force?: boolean,
            role?: 'system' | 'user',
            type?: 'base64'
        ) => {

            const estimatedTokens =
                calculateEstimatedToken([
                    { content: text }
                ]);


            if (
                estimatedTokens >
                MAX_INPUT_TOKENS
            ) {

                // throw new Error(
                //     `MAX_INPUT_TOKEN_EXCEEDED. tokens: ${estimatedTokens}. key: ${key}`
                // );
            }


            /**
             * We don't send system messages into the Responses
             * conversation history anymore.
             *
             * They should be represented by `instructions`.
             */
            if (role === "system") {

                msgsKeys.push(key);

                _additionalInstructions += text + '\n'
                return;
            }


            /**
             * Image input.
             *
             * Keep it locally and convert it to Responses input
             * when send() is called.
             */
            if (type === "base64") {

                msgsKeys.push(key);

                localInputs.push({
                    role: "user",

                    content: [
                        {
                            type: "input_image",

                            image_url: text
                        }
                    ]
                });

                return;
            }


            if (
                hasLettersOrNumbers(text) ||
                force
            ) {

                _text += text + "\n";
            }
        },


        /**
         * --------------------------------------------------------
         * send()
         * --------------------------------------------------------
         */
        send: async (
            additionalInstructions?: string,
            mode?: 'normal' | 'options',
        ) => {

            // commented to allow agent to speak without user message 
            // if (_text === "") {
            //     return;
            // }


            try {

                /**
                 * Abort previous generation.
                 */
                if (lastAbortController) {
                    lastAbortController.abort();
                }


                const activeAbortController =
                    new AbortController();


                lastAbortController =
                    activeAbortController;


                const currentResId = generateReqId()


                /**
                 * ------------------------------------------------
                 * User input
                 * ------------------------------------------------
                 */

                const userText = _text;

                _text = '';


                msgsKeys.push("user-text");


                /**
                 * Keep local state for debugging/token estimates.
                 */
                localInputs.push({
                    role: "user",

                    content: userText
                });
            
                if(additionalInstructions) {
                    _additionalInstructions += additionalInstructions + '\n'
                }

                /**
                 * Estimate only the NEW request locally.
                 *
                 * The previous response is maintained by
                 * previous_response_id rather than being copied
                 * into this HTTP request.
                 */
                const estimatedTokens =
                    calculateEstimatedToken([
                        {
                            content: userText
                        }
                    ]);


                if (
                    estimatedTokens >
                    MAX_INPUT_TOKENS
                ) {

                    console.warn(
                        `Input may exceed MAX_INPUT_TOKENS: ${estimatedTokens}`
                    );
                }


                /**
                 * ------------------------------------------------
                 * Model
                 * ------------------------------------------------
                 */
                // const model = "gpt-5.4-2026-03-05";
                const model = "gpt-5.6-luna"



                /**
                 * ------------------------------------------------
                 * Input
                 * ------------------------------------------------
                 *
                 * Only the new user input is sent when we have
                 * previousResponseId.
                 *
                 * OpenAI maintains the previous response chain.
                 */
                const input: any[] = [
                    {
                        role: "user",
                        content: userText
                    }
                ];

                if(_additionalInstructions) {
                    input.push({
                        role: 'system',
                        content: _additionalInstructions
                    })
                    _additionalInstructions = ''
                }


                /**
                 * ------------------------------------------------
                 * Responses API streaming request
                 * ------------------------------------------------
                 */
                const responseStream =
                    await openai.responses.create({

                        model,

                        // instructions:
                        //     additionalInstructions,

                        input,

                        /**
                         * Continue the previous conversation.
                         */
                        ...(previousResponseId
                            ? {
                                previous_response_id:
                                    previousResponseId
                            }
                            : {}),

                        stream: true,

                        /**
                         * Structured output.
                         */
                        text: {
                            format: mode === 'options' ? zodTextFormat(DocumentOptionsSchema, 'options_payload') : zodTextFormat(DocumentTeachingSchema, 'teaching_payload')
                        },

                        /**
                         * Your original code currently has
                         * tools: [].
                         */
                        tools,
                        "service_tier": "priority",

                    }, {
                        signal:
                            activeAbortController.signal
                    });


                console.log(
                    `[openai.responses.create after]`
                );


                /**
                 * ------------------------------------------------
                 * Streaming state
                 * ------------------------------------------------
                 */

                let fullAssistantResponse = '';

                let responseId:
                    string | undefined;

                let usage: any = undefined;


                const pendingToolCalls =
                    new Map<
                        string,
                        PendingToolCall
                    >();


                /**
                 * ------------------------------------------------
                 * JSON line splitter
                 * ------------------------------------------------
                 */

                const splitter =
                    new JsonLineSplitter(

                        (index, line) => {

                            if (
                                activeAbortController
                                    .signal.aborted
                            ) {
                                return;
                            }


                            delegate.onMessage(
                                currentResId,
                                index,
                                line.stepId,
                                line.lang,
                                line.textToSay,
                                line.boardContent,
                                activeAbortController.signal
                            );
                        },

                        (full, err) => {
                            if(activeAbortController?.signal.aborted) {
                                return;
                            }
                            if(err) {
                                console.error(`Cannot read full json stream. Error: ${err.message}`)
                                return
                            }
                            delegate.onCompleted(full)
                        }
                    );


                /**
                 * ------------------------------------------------
                 * Consume Responses stream
                 * ------------------------------------------------
                 */
                let i = -1;
                for await (
                    const event of responseStream
                ) {
                    i++;
                    
                    if (
                        activeAbortController
                            .signal.aborted
                    ) {
                        break;
                    }


                    /**
                     * --------------------------------------------
                     * Text delta
                     * --------------------------------------------
                     */
                    if (
                        event.type ===
                        "response.output_text.delta"
                    ) {

                        const textToken =
                            event.delta;


                        if (!textToken) {
                            continue;
                        }


                        if (writeToFile) {

                            fs.appendFileSync(
                                `./${writeToFile}.txt`,
                                textToken + (i === 0 ? '\n---------\n' : '\n'),
                                'utf-8'
                            );
                        }


                        fullAssistantResponse +=
                            textToken;


                        splitter.push(
                            textToken
                        );
                    }


                    /**
                     * --------------------------------------------
                     * Function-call argument delta
                     * --------------------------------------------
                     */
                    if (
                        event.type ===
                        "response.function_call_arguments.delta"
                    ) {

                        const itemId =
                            event.item_id;


                        let pending =
                            pendingToolCalls.get(
                                itemId
                            );


                        if (!pending) {

                            pending = {
                                id: itemId,
                                name: '',
                                argsBuffer: ''
                            };


                            pendingToolCalls.set(
                                itemId,
                                pending
                            );
                        }


                        pending.argsBuffer +=
                            event.delta;
                    }


                    /**
                     * --------------------------------------------
                     * Output item completed
                     * --------------------------------------------
                     */
                    if (
                        event.type ===
                        "response.output_item.done"
                    ) {

                        const item =
                            event.item;


                        if (
                            item.type ===
                            "function_call" && item.id
                        ) {

                            let pending =
                                pendingToolCalls.get(
                                    item.id
                                );


                            if (!pending) {

                                pending = {
                                    id: item.id,
                                    name: item.name,
                                    argsBuffer:
                                        item.arguments
                                };


                                pendingToolCalls.set(
                                    item.id,
                                    pending
                                );

                            } else {

                                pending.name =
                                    item.name;

                                pending.argsBuffer =
                                    item.arguments;
                            }
                        }
                    }


                    /**
                     * --------------------------------------------
                     * Response completed
                     * --------------------------------------------
                     */
                    if (
                        event.type ===
                        "response.completed"
                    ) {

                        responseId =
                            event.response.id;


                        usage =
                            event.response.usage;
                    }
                }


                /**
                 * ------------------------------------------------
                 * Finish JSON splitter
                 * ------------------------------------------------
                 */
                if (
                    !activeAbortController
                        .signal.aborted
                ) {

                    splitter.end();
                }


                /**
                 * ------------------------------------------------
                 * Usage
                 * ------------------------------------------------
                 */
                if (usage) {

                    const reasoningTokens =
                        usage.output_tokens_details
                            ?.reasoning_tokens ?? 0;


                    const tokensCount = {

                        input:
                            usage.input_tokens ?? 0,

                        cachedInput:
                            usage
                                .input_tokens_details
                                ?.cached_tokens ?? 0,

                        output:
                            usage.output_tokens ?? 0
                    };


                    const cost =
                        calculateCost(
                            model,
                            tokensCount
                        );


                    delegate.recordUsage(
                        cost.total,
                        {
                            task: 'teaching',
                            model,
                            type: 'tokens',

                            tokens:
                                tokensCount,

                            info:
                                `Input tokens: ${tokensCount.input} ` +
                                `costs: ${cost.input}, ` +

                                `Cached Input tokens: ${tokensCount.cachedInput} ` +
                                `costs: ${cost.cachedInput}, ` +

                                `output: ${tokensCount.output} ` +
                                `includes reasoning tokens (${reasoningTokens}) ` +
                                `costs: ${cost.output}. ` +

                                `model: ${model}. ` +

                                `Details: ${JSON.stringify(usage)}`
                        }
                    );
                }


                /**
                 * ------------------------------------------------
                 * Save response ID
                 * ------------------------------------------------
                 *
                 * Only save it after a successful completion.
                 *
                 * This is what allows the NEXT request to use:
                 *
                 * previous_response_id
                 *
                 * instead of resending all history.
                 */
                if (
                    !activeAbortController
                        .signal.aborted &&
                    responseId
                ) {

                    previousResponseId =
                        responseId;
                }


                /**
                 * ------------------------------------------------
                 * Tool calls
                 * ------------------------------------------------
                 */
                if (
                    !activeAbortController
                        .signal.aborted &&
                    responseId &&
                    pendingToolCalls.size > 0
                ) {

                    const orderedCalls =
                        Array.from(
                            pendingToolCalls.values()
                        );


                    await continueAfterToolCalls(
                        responseId,
                        orderedCalls,
                        activeAbortController
                    );
                }

            } catch (err: any) {

                if (
                    err?.name ===
                    'AbortError'
                ) {

                    console.log(
                        'Stream aborted safely by a new user input message.'
                    );

                } else {

                    console.error(
                        '❌ Error during stream generation:',
                        err?.message ?? err
                    );
                }

            } finally {

                // activeAbortController = null;
            }
        },


        /**
         * --------------------------------------------------------
         * close()
         * --------------------------------------------------------
         */
        close: () => {

            console.log(
                '🤖 OpenAI text session closed cleanly.'
            );


            if (lastAbortController) {
                lastAbortController.abort();
            }


            /**
             * Forget conversation continuation.
             */
            previousResponseId =
                undefined;


            /**
             * Clear local state.
             */
            localInputs.length = 0;

            msgsKeys.length = 0;
        },


        /**
         * --------------------------------------------------------
         * cancelLast()
         * --------------------------------------------------------
         */
        cancelLast: () => {

            if (lastAbortController) {
                lastAbortController.abort();
            }
        }
    };
}


/**
 * ------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------
 */

export function hasLettersOrNumbers(
    text: string
) {
    return /[\p{L}\p{N}]/u.test(text);
}