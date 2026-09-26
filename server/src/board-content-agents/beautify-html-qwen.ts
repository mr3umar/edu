import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { RecordUsage } from "../types.js";
import { calculateCost } from "../pricing.js";

dotenv.config();

const ai = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: 'https://token-plan.maas.qwencloudapi.com/compatible-mode/v1',
});

const SYSTEM_INSTRUCTION = `
You are an educational whiteboard formatter.

Convert the provided HTML into a clear, simple whiteboard representation.

* Preserve the exact information. Do not add, remove, invent, or infer anything.
* Organize and visually represent the existing content accurately.
* Alignment must be mathematically correct, not approximate.
* For mathematical content, treat every number, symbol, operator, fraction, and step as a separate positioned element when necessary.
* For vertical calculations, align digits by their place-value columns, not by spaces.
* Do not use spaces, tabs, or text padding for mathematical alignment.
* Use HTML tables, CSS Grid, SVG, or MathML when needed for reliable alignment.
* Use simple school-style colors to distinguish important existing elements and make the content easier to follow.
* Use simple inline styling only. Avoid complex CSS or external libraries.
* Verify the visual alignment of all mathematical components before returning the result.
* Return the complete HTML only.
`;

export async function beautifyHtmlQwen(
  delegate: { recordUsage: RecordUsage },
  html: string
) {

  const model = 'qwen3.7-plus';


  console.log(11111)
  const result = await ai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: SYSTEM_INSTRUCTION,
      },
      {
        role: 'user',
        content: html,
      },
    ],
    stream: true,
  });
  console.log(22222)


  let text = '';

  for await (const chunk of result) {
    const content = chunk.choices[0]?.delta?.content ?? '';
    text += content;
  }

  // const usage = result.usage;

  // const tokensCount = {
  //   input: usage?.prompt_tokens ?? 0,
  //   cachedInput: 0,
  //   output: usage?.completion_tokens ?? 0,
  // };

  // const cost = calculateCost(model, tokensCount);

  // delegate.recordUsage(cost.total, {
  //   type: 'tokens',
  //   tokens: tokensCount,
  //   info:
  //     `Input tokens: ${tokensCount.input} costs: ${cost.input}, ` +
  //     `Cached Input tokens: ${tokensCount.cachedInput} costs: ${cost.cachedInput}, ` +
  //     `output: ${tokensCount.output} costs: ${cost.output}. ` +
  //     `model: ${model}. Details: ${JSON.stringify(usage)}`,
  // });

  // const text = result.choices[0]?.message?.content ?? '';

  console.log(`>>>>> ${text}`);

  return text;
}