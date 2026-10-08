import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import * as dotenv from 'dotenv';
import { calculateCost } from '../pricing.js';
import { RecordUsage } from '../types.js';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🛠️ DEFINE THE EXACT STRUCTURAL SCHEMA USING ZOD FOR OPENAI COMPLIANCE
const LongDivisionSchema = z.object({
  type: z.literal("longDivision"),
  parts: z.array(
    z.object({
      type: z.enum([
        "divisor",
        "dividend",
        "quotient",
        "product",
        "difference",
        "bringDown",
      ]),
      value: z.string(),
    })
  ),
});

const SYSTEM_INSTRUCTION = `
Parse the provided HTML according to the actual long-division procedure represented by its visual structure.

For every number below the dividend, determine its role from the operation sequence:

* A 'product' is the divisor multiplied by the current quotient digit.
* A 'difference' is the result directly produced by subtracting the product from the current value.
* A 'bringDown' is a digit taken from the dividend and appended to the difference to form the next value used in division.

A number that comes directly from the dividend is a 'bringDown', not a 'difference', even if it appears immediately after the difference or is displayed next to it.

Do not classify a number as a 'difference' merely because it appears below a product. First determine whether it is the result of subtraction or a digit brought down from the dividend.

Extract only what is explicitly represented in the HTML. Do not calculate or complete missing information.



`
  ;

/**
 * Generates or modifies an interactive step-by-step tutorial JSON layout payload using OpenAI.
 * 
 * @param sessionId - A unique string from the client tracking this workspace history context
 * @param promptTopic - What topic or procedure OpenAI should generate a tutorial about
 * @returns A promise resolving to a clean, validated structural tutorial data object
 */
export async function generateLongDiv(delegate: {recordUsage: RecordUsage}, content: string) {
  try {

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
          content
        }
      ],
      response_format: zodResponseFormat(LongDivisionSchema, 'longDivPayload'), // Enforces structure natively
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
      delegate.recordUsage(cost.total, {
        task: 'board-long-div',
          model,
          type: 'tokens',
          tokens: tokensCount,
          info: `Input tokens: ${tokensCount.input} costs: ${cost.input}, Cached Input tokens: ${tokensCount.cachedInput} costs: ${cost.cachedInput}, output: ${tokensCount.output} includes reasoning tokens (${reasoningTokens}) costs: ${cost.output}. model: ${model}. Details: ${JSON.stringify(usage)}`
      })
      
    const jsonText = response.choices[0].message.content;
    if (!jsonText) {
      throw new Error('OpenAI successfully evaluated the step but returned an empty content string.');
    }

    console.log(`>>>>>`, jsonText)
    // Parse string text output back into a true JavaScript data block
    const data = JSON.parse(jsonText);

    return data;

  } catch (error) {
    console.error('❌ Synchronous OpenAI Tutorial Service crashed:', error);
    throw error;
  }
}
