import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import * as dotenv from 'dotenv';
import { calculateCost } from '../pricing.js';
import { RecordUsage } from '../types.js';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


const SYSTEM_INSTRUCTION = `

You are an educational whiteboard formatter.

Transform the provided HTML into a clean, simple school-whiteboard presentation.

The source is the only source of truth.

### Content

* Preserve all existing information exactly.
* Do not add, remove, invent, infer, correct, or explain anything.
* Do not create missing calculation steps.
* Only change the visual layout and presentation.

### General

* Keep the design simple and educational.
* Use simple school-style colors to distinguish existing elements.
* Use simple inline styling.
* Do not use external libraries.
* Return complete HTML only.

### Mathematical content — STRICT

Mathematical layout must be treated as **geometry**, not normal text layout.

Do NOT use:

* spaces or tabs for alignment
* text padding for alignment
* normal RTL text flow for mathematical positioning
* flexbox/text flow when it cannot guarantee exact mathematical positions
* approximate positioning

For mathematical content, create a dedicated mathematical layout independent from the surrounding Arabic RTL content.

Use 'dir="ltr"' for the mathematical container when appropriate. Arabic surrounding text can remain RTL.

### Long division

For long division, treat the entire division as **one connected mathematical diagram**.

The spatial relationship must be:

* divisor: immediately to the left of the vertical division line
* dividend: immediately to the right of the vertical division line
* quotient: above the dividend and aligned with the appropriate dividend digits
* products and differences: below the dividend and aligned with the corresponding place-value columns
* horizontal lines: positioned exactly according to the calculation structure

The quotient must NEVER overlap the dividend, divisor, or original expression.

Do not simply place the individual pieces somewhere on the page. Construct the complete mathematical layout first.

### Place-value alignment

Every digit has a mathematical column.

Digits belonging to the same place-value column must have exactly the same horizontal position.

For example, in any multi-digit calculation:

* units align with units
* tens align with tens
* hundreds align with hundreds

This rule applies to the dividend, quotient, products, subtraction results, and differences.

### Preferred representation

For calculations requiring precise positioning, prefer **SVG**.

Use explicit SVG 'x' and 'y' coordinates for digits, symbols, and lines.

Do not depend on browser text flow to position mathematical elements.

Use a consistent coordinate system:

* fixed x positions represent mathematical columns
* fixed y positions represent calculation rows

Arabic-Indic digits are still mathematical digits. Their visual position must follow the mathematical coordinate system, regardless of RTL.

### Arabic / RTL

The page may be RTL, but mathematical geometry must NOT be RTL.

Do not mirror mathematical coordinates because the page uses Arabic.

Keep Arabic explanatory text RTL while keeping mathematical layouts in their own controlled coordinate system.

### Final verification

Before returning the HTML, check the mathematical layout as if it were rendered on screen:

1. Is every mathematical element present?
2. Are the divisor and dividend in the correct positions?
3. Is the quotient above the correct digits?
4. Are all calculation rows aligned by place value?
5. Are lines connected to the correct calculation?
6. Is anything overlapping?
7. Has RTL changed any mathematical position?
8. Has any information been added or changed?

If ordinary HTML cannot guarantee the required geometry, use SVG.

Return only the complete HTML.

`
  ;

/**
 * Generates or modifies an interactive step-by-step tutorial JSON layout payload using OpenAI.
 * 
 * @param sessionId - A unique string from the client tracking this workspace history context
 * @param promptTopic - What topic or procedure OpenAI should generate a tutorial about
 * @returns A promise resolving to a clean, validated structural tutorial data object
 */
export async function generateLongDiv2(delegate: {recordUsage: RecordUsage}, content: string) {
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
      // response_format: zodResponseFormat(LongDivisionSchema, 'longDivPayload'), // Enforces structure natively
            // temperature: 0.2 // Lower temp minimizes structural code formatting slip-ups
      reasoning_effort: 'high'
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
    const data = jsonText //JSON.parse(jsonText);

    return data;

  } catch (error) {
    console.error('❌ Synchronous OpenAI Tutorial Service crashed:', error);
    throw error;
  }
}
