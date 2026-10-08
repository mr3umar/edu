import { Service, createBaseService } from '@dija/gormic-service-kit-domain';
import { Context } from '../../context.js';
import { TextStepsInput, TTSPrepareInput } from '../../entities/Task.js';
import { CreateUsage } from '../../usage/create/index.js';
import { GetTask } from '../../tasks/get/index.js';
import { Def, serviceName } from './def.js';
import { PROMPT_NORMALIZE_TEXT } from '../../prompts/normalize-text.js';
import { calculateCost } from '../../functions/pricing.js';

interface PendingToolCall {
    id: string;
    name: string;
    argsBuffer: string;
}

export const createService = (
    context: {
        getUserId: Context.GetUserId
        getOpenaiSession: Context.getOpenaiSession
    },
    depends: {
        createUsage: Service<CreateUsage>;
        getTask: Service<GetTask>;
    },
) =>
    createBaseService<Def>(serviceName, ['taskUid'], async (params, scope, errorout, warn) => {

        const task = (await depends.getTask({ uid: params.taskUid }, scope)).data.task

        const input = task.input as TTSPrepareInput

        // const model = 'gpt-5.4-mini-2026-03-17'
        const model = 'gpt-5.6-luna'

        const openai = await context.getOpenaiSession(scope)

        
        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: PROMPT_NORMALIZE_TEXT },
                {
                    role: 'user',
                    content: input.text
                }
            ],
            // max_completion_tokens: 300,
        });

        const usage = response.usage;

        const reasoningTokens = (usage?.prompt_tokens_details as any)?.reasoning_tokens ?? 0

        const tokensCount = {
            input: usage?.prompt_tokens ?? 0,
            cachedInput: usage?.prompt_tokens_details?.cached_tokens ?? 0,
            output: usage?.completion_tokens ?? 0,
        }

        const cost = calculateCost(model, tokensCount)
        console.log(`Input tokens: ${tokensCount.input} costs: ${cost.input}, Cached Input tokens: ${tokensCount.cachedInput} costs: ${cost.cachedInput}, output: ${tokensCount.output} includes reasoning tokens (${reasoningTokens}) costs: ${cost.output} model: ${model}. Details: ${JSON.stringify(usage)}`)


        await depends.createUsage({
            task: 'tts-prepare',
            model,
            type: 'tokens',
            cost: cost.total,
            tokens: tokensCount,
            info: `Input tokens: ${tokensCount.input} costs: ${cost.input}, Cached Input tokens: ${tokensCount.cachedInput} costs: ${cost.cachedInput}, output: ${tokensCount.output} includes reasoning tokens (${reasoningTokens}) costs: ${cost.output}. model: ${model}. Details: ${JSON.stringify(usage)}`
        }, scope)
        
        console.log('[prepareForTTS]', JSON.stringify(response))
        const result = response.choices[0].message.content;

        if(!result) {
            throw errorout({
                code: "EMPTY_RESPONSE"
            })
        }

        return {
            output: {
                text: result
            },
        };
    });
