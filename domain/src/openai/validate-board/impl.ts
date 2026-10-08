import { createBaseService, Service } from '@dija/gormic-service-kit-domain';
import { Context } from '../../context.js';
import { TTSPrepareInput, ValidateBoardInput } from '../../entities/Task.js';
import { calculateCost } from '../../functions/pricing.js';
import { CreateUsage } from '../../usage/create/index.js';
import { GetTask } from '../../tasks/get/index.js';
import { Def, serviceName } from './def.js';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod.js';



// 🛠️ DEFINE THE EXACT STRUCTURAL SCHEMA USING ZOD FOR OPENAI COMPLIANCE
const validateBoardContentSchema = z.object({
    isValid: z.boolean().describe("true of the shared by user is valid, false if it is not."),
    mistakes: z.string().nullable().describe("write the mistakes you find in the orginal text."),
    correctedContent: z.string().nullable().describe("only reurn corrected content when it the shared by user not valid."),
  });
  
  const SYSTEM_INSTRUCTION = `
  * user will share html content, check if content information and facts are valid or not. 
  * if valid just return isValid: true, if not, return isValid: false, and add correctedContent with the corrected version. 
  * the correction should be minimal.
  *If the content contains any mathematical expression, equation, formula, or mathematical notation, it must use MathML; if it does not, return isValid: false and provide correctedContent with the same content minimally corrected to use MathML.
  `
    ;

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

        const input = task.input as ValidateBoardInput

        // const model = 'gpt-5.4-mini-2026-03-17'

        const openai = await context.getOpenaiSession(scope)


        // const model = 'gpt-5.5-2026-04-23'
        // Input tokens: 3619 costs: 0.018095, output: 8110 costs: 0.24330000000000002 model: gpt-5.5-2026-04-23. Details: {"prompt_tokens":3619,"completion_tokens":8110,"total_tokens":11729,"prompt_tokens_details":{"cached_tokens":0,"audio_tokens":0},"completion_tokens_details":{"reasoning_tokens":2560,"audio_tokens":0,"accepted_prediction_tokens":0,"rejected_prediction_tokens":0}}

        // const model = 'gpt-5.4-2026-03-05'
        // Input tokens: 3566 costs: 0.008915000000000001, output: 6689 costs: 0.10033500000000001. Details: {"prompt_tokens":3566,"completion_tokens":6689,"total_tokens":10255,"prompt_tokens_details":{"cached_tokens":0,"audio_tokens":0},"completion_tokens_details":{"reasoning_tokens":0,"audio_tokens":0,"accepted_prediction_tokens":0,"rejected_prediction_tokens":0}}

        // const model = 'gpt-5.6-sol'
        // Input tokens: 3618 costs: 0.014471999999999999, output: 6811 costs: 0.13622 model: gpt-5.6-sol. Details: {"prompt_tokens":3618,"completion_tokens":6811,"total_tokens":10429,"prompt_tokens_details":{"cached_tokens":0,"audio_tokens":0},"completion_tokens_details":{"reasoning_tokens":723,"audio_tokens":0,"accepted_prediction_tokens":0,"rejected_prediction_tokens":0}}

        // const model = 'gpt-5.6-terra'
        // Input tokens: 3618 costs: 0.007235999999999999, output: 7229 costs: 0.086748 model: gpt-5.6-terra. Details: {"prompt_tokens":3618,"completion_tokens":7229,"total_tokens":10847,"prompt_tokens_details":{"cached_tokens":0,"audio_tokens":0},"completion_tokens_details":{"reasoning_tokens":321,"audio_tokens":0,"accepted_prediction_tokens":0,"rejected_prediction_tokens":0}}

        const model = 'gpt-5.6-luna'
        // 3. Request a Structured Output Completion from GPT-4o
        const response = await openai.chat.completions.create({
            //       model: 'gpt-4o', // Premium choice model for deep layout reasoning and structured schemas
            model,
            //       model: 'o3-mini', // Premium choice model for deep layout reasoning and structured schemas
            messages: [
                { role: 'system', content: SYSTEM_INSTRUCTION },
                {
                    role: 'user',
                    content: input.html,
                }
            ],
            response_format: zodResponseFormat(validateBoardContentSchema, 'validateBoardContent'), // Enforces structure natively
            //       temperature: 0.2 // Lower temp minimizes structural code formatting slip-ups
            // reasoning_effort: 'high'
        });


        const usage = response.usage
        const reasoningTokens = (usage?.prompt_tokens_details as any)?.reasoning_tokens ?? 0

        const tokensCount = {
            input: usage?.prompt_tokens ?? 0,
            cachedInput: usage?.prompt_tokens_details?.cached_tokens ?? 0,
            output: usage?.completion_tokens ?? 0,
        }
        const cost = calculateCost(model, tokensCount)
        

        await depends.createUsage({
            task: 'board-content-validate',
            model,
            type: 'tokens',
            cost: cost.total,
            tokens: tokensCount,
            info: `Input tokens: ${tokensCount.input} costs: ${cost.input}, Cached Input tokens: ${tokensCount.cachedInput} costs: ${cost.cachedInput}, output: ${tokensCount.output} includes reasoning tokens (${reasoningTokens}) costs: ${cost.output}. model: ${model}. Details: ${JSON.stringify(usage)}`
        }, scope)

        const jsonText = response.choices[0].message.content;
        if (!jsonText) {
            throw new Error('OpenAI successfully evaluated the step but returned an empty content string.');
        }

        console.log(`>>>>>`, jsonText)
        // Parse string text output back into a true JavaScript data block
        const data = JSON.parse(jsonText);

        return {
            output: {
                data
            },
        };
    });
