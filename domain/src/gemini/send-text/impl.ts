import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import {
    GoogleGenAI,
    ThinkingLevel,
    type Content,
    type GenerateContentConfig,
    type GenerateContentResponseUsageMetadata,
    type Part,
} from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { MAX_INPUT_TOKENS } from '../../config.js';
import { Context } from '../../context.js';
import { TextStepOutputChunk, TextStepsInput } from '../../entities/Task.js';
import { JsonLineSplitter } from '../../functions/json-splitter.js';
import { calculateEstimatedToken } from '../../functions/others.js';
import { calculateCost } from '../../functions/pricing.js';
import { CompactForTextSteps } from '../../messages/compact-for-text-steps/index.js';
import { TEACH_PLAN_SOURCE_OF_TRUTH, TEACHING_PLAN } from '../../prompts/teaching-plan-4 - lines.js';
import { AgentLine } from '../../server/types.js';
import { CallTool } from '../../tools/call/index.js';
import { CreateUsage } from '../../usage/create/index.js';
import { GetTask } from '../../tasks/get/index.js';
import { OnTextStepChunk } from '../../tasks/index.js';
import { DocumentOptionsSchema, DocumentTeachingSchema } from '../../openai/schemas.js';
import { Def, serviceName } from './def.js';
import { zodResponseFormat } from 'openai/helpers/zod.js';
import { dataUrlToPart, mediaUrlToPart } from '../../functions/media-url-to-part.js';
import { pcmToWav } from '../../functions/pcm-to-wav.js';

const MODEL = 'gemini-3.5-flash-lite';

// ⚡ One client per process: reuses the HTTP connection pool, so no TLS
// handshake on every request.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const toGeminiSchema = (schema: any, name: string) => {
    const json = zodResponseFormat(schema, name).json_schema.schema as Record<string, any>;
    if (!json || !json.properties && !json.$ref && !json.anyOf) {
        throw new Error(`Schema "${name}" converted to an empty JSON Schema: ${JSON.stringify(json)}`);
    }
    return json;
};
const OPTIONS_SCHEMA = toGeminiSchema(DocumentOptionsSchema, 'options_payload');
const TEACHING_SCHEMA = toGeminiSchema(DocumentTeachingSchema, 'teaching_payload');

// Gemini needs image bytes inline. Data URLs cost nothing to convert;
// remote URLs are fetched (in parallel, see below).
async function imageUrlToPart(url: string): Promise<Part> {
    const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(url);
    if (m) return { inlineData: { mimeType: m[1], data: m[2] } };

    const r = await fetch(url);
    if (!r.ok) throw new Error(`IMAGE_FETCH_FAILED ${r.status}: ${url}`);
    const mimeType = r.headers.get('content-type')?.split(';')[0] ?? 'image/png';
    const data = Buffer.from(await r.arrayBuffer()).toString('base64');
    return { inlineData: { mimeType, data } };
}

export const createService = (
    context: {
        getUserId: Context.GetUserId
        getTaskAbortContoller: Context.getTaskAbortContoller
    },
    depends: {
        onTextStepChunk: Service<OnTextStepChunk>;
        createUsage: Service<CreateUsage>;
        getTask: Service<GetTask>;
        compactForTextSteps: Service<CompactForTextSteps>;
        callTool: Service<CallTool>; // kept for DI compatibility; unused (see notes)
    },
) =>
    createBaseService<Def>(serviceName, ['taskUid'], async (params, scope, errorout, warn) => {

        const { task, taskGroup } = (await depends.getTask({ uid: params.taskUid, include: ["taskGroup"] }, scope)).data
        const input = task.input as TextStepsInput

        // ⚡ Start the abort-controller lookup in parallel with message loading.
        const [abortController, messages] = await Promise.all([
            context.getTaskAbortContoller(scope, task.uid),
            depends.compactForTextSteps({ conversationUid: taskGroup?.conversationUid! }, scope)
                .then(r => r.data.messages),
        ]);

        // ⚡ Fetch any remote page images concurrently instead of one by one.
        // const mediaParts = await Promise.all(messages.map(m =>
        //     m.type === 'page-image' ? mediaUrlToPart(m.content, 'image/png') :
        //     m.type === 'user-audio' ? mediaUrlToPart(m.content, 'audio/wav') :
        //     null
        // ));

        // Gemini has a single systemInstruction and only user/model turns.
        // Keeping systemInstruction stable (just the plan) maximizes implicit
        // prefix caching, which lowers time-to-first-token on repeat calls.
        // Mid-conversation "system" messages (instructions, page-analysis)
        // become user text so their position in the conversation is kept.
        let systemInstruction = input.instructions ?? TEACHING_PLAN;
        if(input.pageIndex) {
            systemInstruction += TEACH_PLAN_SOURCE_OF_TRUTH
        }
        const contents: Content[] = [];
        const push = (role: 'user' | 'model', part: Part) => {
            const last = contents[contents.length - 1];
            if (last?.role === role) last.parts!.push(part);
            else contents.push({ role, parts: [part] });
        };

        messages.forEach((message, i) => {
            const estimatedTokens = calculateEstimatedToken([{ content: message.content }])
            if (estimatedTokens > MAX_INPUT_TOKENS && message.type != "page-image" && message.type != "user-audio") {
                console.error(`MAX_INPUT_TOKEN_EXCEEDED.`, message.type, message.content)
                throw new Error(`MAX_INPUT_TOKEN_EXCEEDED. tokens: ${estimatedTokens}. key: ${message.uid}`)
            }

            switch (message.type) {
                case "page-image":
                case "user-audio": 
                    const pcm = Buffer.from(message.content, 'base64'); // all chunks of one utterance
                    const wav = pcmToWav(pcm, 24000, 1, 16);
                    push('user', { inlineData: { mimeType: 'audio/wav', data: wav.toString('base64') } });
                    break;
                case "assistant": push('model', { text: message.content }); break;
                default: push('user', { text: message.content }); break;
            }
        });

        // Flash-Lite 3.5 rejects requests whose last turn is the model's.
        if (contents[contents.length - 1]?.role !== 'user') {
            push('user', { text: 'Continue.' });
        }

        const config: GenerateContentConfig = {
            systemInstruction,
            responseMimeType: 'application/json',
            responseJsonSchema: input.mode === 'options' ? OPTIONS_SCHEMA : TEACHING_SCHEMA,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }, // ⚡ fastest setting
            abortSignal: abortController.signal,
            // ⚡ Optional: fewer image tokens = faster prefill. Test quality first,
            // since textbook pages with small print may need the default.
            // mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
        };

        // Resolves when the splitter has the full JSON; rejects on error/abort
        // so the caller never hangs.
        let resolveOut!: (v: Def["Data"]["output"]) => void;
        let rejectOut!: (e: unknown) => void;
        // const done = new Promise<Def["Data"]["output"]>((res, rej) => { resolveOut = res; rejectOut = rej; });

        const splitter = new JsonLineSplitter<AgentLine>(async (index, line) => {
            if (abortController.signal.aborted) return;
            const chunk: TextStepOutputChunk = {
                stepIndex: index,
                stepId: line.stepId,
                language: line.lang as 'ar' | 'en',
                textToSay: line.textToSay,
                boardContent: line.boardContent,
            }
            console.log(chunk, 33333)
            await depends.onTextStepChunk({
                conversationUid: taskGroup?.conversationUid!,
                taskUid: params.taskUid,
                type: "step",
                chunk,
            }, scope);
        }, "steps");

        // const run = async () => {
            let usage: GenerateContentResponseUsageMetadata | undefined;

            try {
                const stream = await ai.models.generateContentStream({ model: MODEL, contents, config });

                // ⚡ Plain for-await: each chunk goes to the splitter the moment it
                // arrives (the old peek-ahead waited for the *next* chunk first).
                for await (const chunk of stream) {
                    if (abortController.signal.aborted) break;
                    if (chunk.usageMetadata) usage = chunk.usageMetadata;
                    const text = chunk.text;
                    if (text) splitter.push(text);
                }

                if (abortController.signal.aborted) {
                    const e = new Error('Aborted'); e.name = 'AbortError'; throw e;
                }
                // Only end on a complete response; a partial JSON would throw.
                splitter.end();
            } catch (err: any) {
                if (err?.name === 'AbortError' || abortController.signal.aborted) {
                    console.log('Stream aborted safely by a new user input message.');
                } else {
                    console.error('❌ Error during stream generation:', err?.message);
                }
                rejectOut(err);
            }

            // Usage is recorded after the output has already been handed back.
            if (usage) {
                const thoughts = usage.thoughtsTokenCount ?? 0;
                const tokensCount = {
                    input: usage.promptTokenCount ?? 0,
                    cachedInput: usage.cachedContentTokenCount ?? 0,
                    output: (usage.candidatesTokenCount ?? 0) + thoughts, // thoughts bill as output
                }
                const cost = calculateCost(MODEL, tokensCount)
                await depends.createUsage({
                    task: 'teaching',
                    model: MODEL,
                    type: 'tokens',
                    cost: cost.total,
                    tokens: tokensCount,
                    info: `Input tokens: ${tokensCount?.input} costs: ${cost?.input}, Cached Input tokens: ${tokensCount?.cachedInput} costs: ${cost?.cachedInput}, output: ${tokensCount?.output} includes reasoning tokens (${thoughts}) costs: ${cost?.output}. model: ${MODEL}. Details: ${JSON.stringify(usage)}`
                }, scope)
            }
        // };

        // run().catch((err: any) => console.error('❌ Usage recording failed:', err.message, err.stack));

        const output = await splitter.getJson() as Def["Data"]["output"];

        return { output };
    });