import fs from 'fs';
import { GoogleGenAI } from "@google/genai";
import type { Content, Part } from "@google/genai";
import * as path from 'path';
import { WebSocket } from 'ws';
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { pick } from "stream-json/filters/pick.js";
import { streamArray } from 'stream-json/streamers/stream-array.js';
import { fileURLToPath } from 'url';
import { calculateCost } from "./pricing.js";
import { TEACHING_PLAN } from "./prompts/teaching-plan-4 - lines.js";
import { LinesDelegate } from "./types.js";
import { MAX_INPUT_TOKENS } from './config.js';
import { AgentLine } from './text-openai-lines.js';

// NOTE: `@google/genai` is the required package (npm i @google/genai).
// Some field names below (usageMetadata shape, abortSignal wiring) can
// differ slightly between SDK versions — double-check against whatever
// version you have installed if something doesn't typecheck.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the Gemini client.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// -----------------------------------------------------------------------
// Response schema (plain JSON Schema). Gemini's `responseSchema` does not
// accept a Zod object the way OpenAI's `zodResponseFormat` did, so this
// replaces `DocumentTeachingSchema`.
// -----------------------------------------------------------------------
const TEACHING_RESPONSE_SCHEMA = {
    type: "object",
    properties: {
        steps: {
            type: "array",
            description: "split the response to lines.",
            items: {
                type: "object",
                properties: {
                        lang: {
                            type: "string",
                            description: "language of the content of textToSay in ISO 639-1 code (e.g. 'ar', 'en', 'fr')",
                        },
                        textToSay: {
                            type: "string",
                            description: "text only ready for text-to-speech, you can use only bbcode [option]...[/option].",
                        },
                    richHtmlAndSvgForBoard: {
                        type: "string",
                        nullable: true,
                        description: "to write to the board with rich html/svg content, or 'null' if no visual is needed. board dimensions: width: 200px, height: 250px.",
                    },
                },
                required: ["lang", "textToSay", "richHtmlAndSvgForBoard"],
            },
        },
    },
    required: ["steps"],
} as const;

// Gemini streams each function call as a single, already-complete object
// (unlike OpenAI, which fragments `arguments` across many chunk deltas).
// We keep a small holder type so the rest of the pipeline (execute → push
// result back into history) reads the same way it used to.
interface PendingToolCall {
    id: string;
    name: string;
    args: Record<string, any>;
}

export async function initGeminiLiveLines(bookId: string, wsClient: WebSocket, delegate: LinesDelegate, instructions?: string, writeToFile?: string) {
    // 🧠 Maintain local state for conversation history.
    // Gemini has no "system" role inside `contents` — system-ish messages
    // (write(..., role: 'system')) get folded into a single
    // `systemInstructionText` string that's resent as `systemInstruction`
    // with every request, instead of being interleaved into the history.
    let systemInstructionText = instructions ?? TEACHING_PLAN;

    const contents: Content[] = [];

    if (wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({ event: 'status', data: 'Connected to Gemini Text Stream!' }));
    }

    let lastAbortController: AbortController | undefined = undefined;

    // Parses a data: URL ("data:image/png;base64,AAA...") into
    // { mimeType, data }. Falls back to treating the whole string as raw
    // base64 with the given default mime type if it isn't a data URL.
    function parseInlineData(text: string, defaultMimeType: string): { mimeType: string; data: string } {
        const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(text);
        if (match) {
            return { mimeType: match[1], data: match[2] };
        }
        return { mimeType: defaultMimeType, data: text };
    }

    // 🔧 Executes a fully-assembled tool call via delegate.callTool and
    // returns the value fed back to Gemini as a functionResponse part.
    // Gemini requires `functionResponse.response` to be a JSON object
    // (not a raw string), so string/primitive results get wrapped.
    async function executeToolCall(call: PendingToolCall): Promise<Record<string, any>> {
        try {
            console.log(`🤖 Delegating tool call: ${call.name}(${JSON.stringify(call.args)})`);
            const result = await delegate.callTool({ name: call.name, args: call.args });
            if (result == null) return { ok: true };
            if (typeof result === 'object') return result;
            return { result };
        } catch (err) {
            console.error(`❌ delegate.callTool failed for "${call.name}":`, err);
            return { ok: false, error: 'tool_execution_failed' };
        }
    }

    // Parts queued via write() for the *next* user turn, sent on send().
    let pendingParts: Part[] = [];

    let msgsKeys: string[] = ["instructions-main"];

    return {
        // `type` now also accepts "audio" — pass either a data URL
        // (e.g. "data:audio/mp3;base64,...") or raw base64 bytes (assumed
        // audio/wav if no data-URL prefix is given).
        write: (key: string, text: string, force?: boolean, role?: 'system' | 'user', type?: 'base64' | 'audio') => {
            const estimatedTokens = calculateEstimatedToken([{ content: text }]);
            if (estimatedTokens > MAX_INPUT_TOKENS) {
                // throw new Error(`MAX_INPUT_TOKEN_EXCEEDED. tokens: ${estimatedTokens}. key: ${key}`)
            }

            if (role === "system") {
                msgsKeys.push(key);
                systemInstructionText += "\n" + text;
                return;
            }

            if (type === "base64") {
                msgsKeys.push(key);
                const { mimeType, data } = parseInlineData(text, "image/png");
                pendingParts.push({ inlineData: { mimeType, data } });
                return;
            }

            if (type === "audio") {
                msgsKeys.push(key);
                const { mimeType, data } = parseInlineData(text, "audio/wav");
                pendingParts.push({ inlineData: { mimeType, data } });
                return;
            }

            if (hasLettersOrNumbers(text) || force) {
                pendingParts.push({ text });
            }
        },
        send: async (instructions?: string) => {
            if (pendingParts.length === 0) {
                return;
            }

            try {
                if (lastAbortController) {
                    lastAbortController?.abort();
                }

                const activeAbortController = new AbortController();
                lastAbortController = activeAbortController;

                // 1. Push the user's incoming turn (text + any queued
                //    images/audio) into the conversation thread.
                msgsKeys.push("user-text");
                contents.push({ role: "user", parts: pendingParts });
                pendingParts = [];

                const estimatedTokens = calculateEstimatedToken(contents.map(c => ({ content: JSON.stringify(c.parts) })));
                if (estimatedTokens > MAX_INPUT_TOKENS) {
                    // throw new Error(`MAX_INPUT_TOKEN_EXCEEDED. tokens: ${estimatedTokens}.`)
                }

                // const model = "gemini-2.5-pro"
                const model = "gemini-2.5-flash";

                const effectiveSystemInstruction = instructions
                    ? `${systemInstructionText}\n${instructions}`
                    : systemInstructionText;

                // 2. Request a streaming completion from Gemini.
                const streamResult = await ai.models.generateContentStream({
                    model,
                    contents,
                    config: {
                        systemInstruction: effectiveSystemInstruction,
                        responseMimeType: "application/json",
                        responseSchema: TEACHING_RESPONSE_SCHEMA,
                        // abortSignal: activeAbortController.signal, // wire up if your installed SDK version supports it
                        tools: [
                            // Gemini's tool shape: one or more `functionDeclarations`
                            // per tool entry, with plain JSON Schema `parameters`
                            // (no OpenAI-style `type: "function"` wrapper).
                            // {
                            //     functionDeclarations: [
                            //         {
                            //             name: "writeOnBoard",
                            //             description: `Use this function to write or draw on the virtual classroom whiteboard when a visual explanation would help the student understand the concept, including text, diagrams, equations, tables, graphs, MathML, or SVG drawings.
                            //
                            //             ### Examples include
                            //             * Drawing diagrams, number lines, tables, or simple graphs.
                            //             * Writing formulas, equations, or mathematical expressions.
                            //             * Comparing two concepts side by side.
                            //             * Showing the reasoning process.
                            //             * Creating examples that are not printed in the textbook.
                            //             * Summarizing the lesson at the end.
                            //
                            //             ### Rules
                            //             * Prefer the textbook when referring to existing page content.
                            //             * Switch to the whiteboard only when additional explanation or demonstration is needed.
                            //             * Call tool writeOnBoard before referring to what you have written.
                            //             * Write neatly and keep the board uncluttered.
                            //             * Reveal information progressively instead of writing everything at once.
                            //             * Keep each board view focused on a single teaching objective.
                            //             * After writing, guide the student's attention naturally by referring to specific parts of the board.
                            //             * When finished with the board explanation, continue the lesson normally. Return to the textbook only when the lesson requires referring to the page again.
                            //             * Board canvas width is 400px, height is 400px.
                            //             * When drawing symbols, ensure the correct direction if it has opposite for RTL languages.
                            //             * For mathematical expressions, use inline MathML, example <math display="inline"> <mfrac> <mn>١</mn> <mn>١٠٠</mn> </mfrac> </math>.
                            //             `,
                            //             parameters: {
                            //                 type: "object",
                            //                 properties: {
                            //                     html: {
                            //                         type: "string",
                            //                         description: "HTML content that includes tables, svg, MathMl, etc...",
                            //                     },
                            //                 },
                            //                 required: ["html"],
                            //             },
                            //         },
                            //         {
                            //             name: "updateAssessmentScore",
                            //             description: "Call this function to update user assessment on a concept.",
                            //             parameters: {
                            //                 type: "object",
                            //                 properties: {
                            //                     conceptId: { type: "string", description: "Concept ID." },
                            //                     score: { type: "number", description: "Score from 1-10." },
                            //                 },
                            //                 required: ["conceptId", "score"],
                            //             },
                            //         },
                            //         {
                            //             name: "getPageContent",
                            //             description: "Call this function to load all page content. This function should be called once per page because page content is static.",
                            //             parameters: {
                            //                 type: "object",
                            //                 properties: {
                            //                     pageNumber: { type: "string", description: "page number" },
                            //                 },
                            //                 required: ["pageNumber"],
                            //             },
                            //         },
                            //         {
                            //             name: "openTutorial",
                            //             description: "Call this function to open a tutorial defined in section.",
                            //             parameters: {
                            //                 type: "object",
                            //                 properties: {
                            //                     tutorialId: { type: "string", description: "The ID of tutorial." },
                            //                 },
                            //                 required: ["tutorialId"],
                            //             },
                            //         },
                            //         {
                            //             name: "changeTutorialStep",
                            //             description: "Call this function to switch the current step of tutorial for user.",
                            //             parameters: {
                            //                 type: "object",
                            //                 properties: {
                            //                     tutorialId: { type: "string", description: "The ID of tutorial." },
                            //                     stepNumber: { type: "number", description: "The stepNumber." },
                            //                 },
                            //                 required: ["stepNumber"],
                            //             },
                            //         },
                            //         {
                            //             name: "showOptions",
                            //             description: "Call this function to show to user a list options.",
                            //             parameters: {
                            //                 type: "object",
                            //                 properties: {
                            //                     options: {
                            //                         type: "array",
                            //                         description: "List of options.",
                            //                         items: {
                            //                             type: "object",
                            //                             properties: {
                            //                                 content: { type: "string", description: "content of the option. could be Text or Html." },
                            //                             },
                            //                             required: ["content"],
                            //                         },
                            //                     },
                            //                 },
                            //                 required: ["options"],
                            //             },
                            //         },
                            //     ],
                            // },
                        ],
                    },
                });
                console.log(`[generateContentStream after]`);

                // 🌟 Peek-ahead manual async iterator handling (kept for parity
                // with the OpenAI version's isLastChunk bookkeeping).
                const iterator = streamResult[Symbol.asyncIterator]();
                let currentResult = await iterator.next();
                console.log(`[iterator.next after]`);

                let fullAssistantResponse = "";

                // Gemini hands back each function call fully formed inside a
                // chunk's `functionCalls` — no cross-chunk fragment buffering
                // needed like OpenAI's `tool_calls` deltas.
                const pendingToolCalls: PendingToolCall[] = [];
                let finishReason: string | undefined = undefined;
                let usage: any;
                // Gemini usageMetadata shape: { promptTokenCount, candidatesTokenCount,
                // totalTokenCount, cachedContentTokenCount?, thoughtsTokenCount? }

                const splitter = new JsonLineSplitter((index, line) => {
                    console.log("LLLL:" + JSON.stringify(line));
                    delegate.onMessage(index, line.stepId, line.lang, line.textToSay, line.richHtmlAndSvgForBoard, activeAbortController!.signal);
                });

                while (!currentResult.done) {
                    if (activeAbortController.signal.aborted) {
                        break;
                    }
                    const chunk: any = currentResult.value;
                    const nextResult = await iterator.next();
                    const isLastChunk = nextResult.done ?? false;

                    const candidate = chunk.candidates?.[0];
                    if (candidate?.finishReason) {
                        finishReason = candidate.finishReason;
                    }
                    if (chunk.usageMetadata) {
                        usage = chunk.usageMetadata;
                    }

                    const textToken = chunk.text;
                    if (textToken) {
                        if (writeToFile) {
                            fs.appendFileSync(`./${writeToFile}.txt`, textToken, 'utf-8');
                        }
                        fullAssistantResponse += textToken;
                        console.log(`📋 Received Text Token [Last Chunk=${isLastChunk}]: ${textToken}`);
                        splitter.push(textToken);
                    }

                    const functionCalls = chunk.functionCalls;
                    if (functionCalls) {
                        for (const fc of functionCalls) {
                            pendingToolCalls.push({
                                id: fc.id ?? fc.name ?? `${pendingToolCalls.length}`,
                                name: fc.name ?? '',
                                args: fc.args ?? {},
                            });
                        }
                    }

                    currentResult = nextResult;
                }

                if (!activeAbortController.signal.aborted) {
                    splitter.end();
                }

                const tokensCount = {
                    input: usage?.promptTokenCount ?? 0,
                    cachedInput: usage?.cachedContentTokenCount ?? 0,
                    output: usage?.candidatesTokenCount ?? 0,
                };
                const reasoningTokens = usage?.thoughtsTokenCount ?? 0;
                const cost = calculateCost(model, tokensCount);
                delegate.recordUsage(cost.total, {
                    type: 'tokens',
                    tokens: tokensCount,
                    info: `Input tokens: ${tokensCount.input} costs: ${cost.input}, Cached Input tokens: ${tokensCount.cachedInput} costs: ${cost.cachedInput}, output: ${tokensCount.output} includes reasoning tokens (${reasoningTokens}) costs: ${cost.output}. model: ${model}. Details: ${JSON.stringify(usage)}`,
                });

                // 3. If the model wants to call tool(s), execute each now.
                if (pendingToolCalls.length > 0) {
                    // Record the model's function-call turn so the subsequent
                    // functionResponse turn has a matching "model" turn to
                    // attach to.
                    contents.push({
                        role: "model",
                        parts: pendingToolCalls.map(call => ({
                            functionCall: { id: call.id, name: call.name, args: call.args },
                        })),
                    });

                    const responseParts: Part[] = [];
                    for (const call of pendingToolCalls) {
                        console.log(`[gemini-live-lines] 🤖 Executing tool call: ${call.name}(${JSON.stringify(call.args)})`);
                        const resultContent = await executeToolCall(call);
                        responseParts.push({
                            functionResponse: {
                                id: call.id,
                                name: call.name,
                                response: resultContent,
                            },
                        });
                    }
                    contents.push({ role: "user", parts: responseParts });

                    // The model is now waiting on tool results before it can
                    // produce its next chunk of user-facing text. Recurse
                    // back into the same flow by re-running the request so
                    // the model can react to the tool outputs.
                    await continueAfterToolCalls();
                } else {
                    if (fullAssistantResponse) {
                        contents.push({ role: "model", parts: [{ text: fullAssistantResponse }] });
                    }
                }

                // 🔁 Re-requests a completion using the current `contents`
                // (now including the functionCall + functionResponse turns)
                // so the model can continue after seeing tool output.
                async function continueAfterToolCalls() {
                    const toolModel = 'gemini-2.5-flash';
                    const followUpStream = await ai.models.generateContentStream({
                        model: toolModel,
                        contents,
                        config: {
                            systemInstruction: effectiveSystemInstruction,
                            // omit tools here unless you want chained tool calls
                        },
                    });

                    let followUpText = "";
                    let toolUsage: any;

                    for await (const chunk of followUpStream) {
                        if (chunk.usageMetadata) {
                            toolUsage = chunk.usageMetadata;
                        }
                        const token = chunk.text;
                        if (token) {
                            if (writeToFile) {
                                fs.appendFileSync(`./${writeToFile}.txt`, token, 'utf-8');
                            }
                            followUpText += token;
                            console.warn(`Not implemented..`);
                            // delegate.onMessage(...) once the follow-up path is wired up
                        }
                    }

                    const tokensCount = {
                        input: toolUsage?.promptTokenCount ?? 0,
                        cachedInput: toolUsage?.cachedContentTokenCount ?? 0,
                        output: toolUsage?.candidatesTokenCount ?? 0,
                    };
                    const reasoningTokens = toolUsage?.thoughtsTokenCount ?? 0;
                    const cost = calculateCost(toolModel, tokensCount);
                    console.log(`[tool cost] Input tokens: ${tokensCount.input} costs: ${cost.input}, Cached Input tokens: ${tokensCount.cachedInput} costs: ${cost.cachedInput}, output: ${tokensCount.output} includes reasoning tokens (${reasoningTokens}) costs: ${cost.output}. model: ${toolModel}. Details: ${JSON.stringify(toolUsage)}`);

                    if (followUpText) {
                        contents.push({ role: "model", parts: [{ text: followUpText }] });
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
        },
        close: () => {
            console.log('🤖 Gemini text session closed cleanly.');
            if (lastAbortController) {
                lastAbortController.abort();
            }
            contents.length = 0;
            pendingParts = [];
        },
    };
}

export function hasLettersOrNumbers(text: string) {
    return /[\p{L}\p{N}]/u.test(text);
}


export class JsonLineSplitter {
    private pipeline = chain([
        parser(),
        pick({ filter: "steps" }),
        streamArray(),
    ]);

    constructor(
        private readonly handleLine: (index: number, line: AgentLine) => void,
    ) {
        this.pipeline.on('data', ({ key, value }: { key: number; value: AgentLine }) => {
            this.handleLine(key, value);
        });

        this.pipeline.on('error', (error) => {
            console.error('JSON stream error:', error, error.message, error.stack);
        });
    }

    push(delta: string) {
        this.pipeline.write(delta);
    }

    end() {
        this.pipeline.end();
    }
}

export const calculateEstimatedToken = (messages: { content?: string | {} | null }[]) => {
    const estimatedTokens = Math.ceil(
        JSON.stringify(messages).length / 3.5
    );
    return estimatedTokens;
};