import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import { RecordUsage } from "../types.js";
import { calculateCost } from "../pricing.js";

dotenv.config();

const ai = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

`;

export async function beautifyHtmlClaude(
  delegate: { recordUsage: RecordUsage },
  html: string
) {
  const model = 'claude-sonnet-5';

  console.log('11111');

  const message = await ai.messages.create({
    model,
    max_tokens: 8192,

    system: SYSTEM_INSTRUCTION,

    messages: [
      {
        role: 'user',
        content: html,
      },
    ],
  });

  console.log('22222');

  const tokensCount = {
    input: message.usage?.input_tokens ?? 0,
    cachedInput: 0,
    output: message.usage?.output_tokens ?? 0,
  };

  const cost = calculateCost(model, tokensCount);

  delegate.recordUsage(cost.total, {
    type: 'tokens',
    tokens: tokensCount,
    info:
      `Input tokens: ${tokensCount.input} costs: ${cost.input}, ` +
      `Cached Input tokens: ${tokensCount.cachedInput} costs: ${cost.cachedInput}, ` +
      `output: ${tokensCount.output} costs: ${cost.output}. ` +
      `model: ${model}. Details: ${JSON.stringify(message.usage)}`,
  });

  let text = message.content
  .filter(block => block.type === 'text')
  .map(block => block.text)
  .join('');

text = text
  .replace(/^```html\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/\s*```$/i, '')
  .trim();


  console.log(`>>>>> ${text}`);

  return text;
}