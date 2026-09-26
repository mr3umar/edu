import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

const ai = new Anthropic({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/apps/anthropic',
});

const SYSTEM_INSTRUCTION = `
You are an educational whiteboard formatter.

Convert the provided HTML into a clear, simple whiteboard representation.

- Preserve the exact information. Do not add, remove, invent, or infer anything.
- Organize and visually represent the existing content accurately.
- Alignment must be mathematically correct, not approximate.
- For vertical calculations, align digits by their place-value columns.
- Never use spaces or tabs for mathematical alignment.
- Use HTML tables, SVG, or MathML when needed for reliable alignment.
- Use simple school-style colors.
- Use simple inline styling only.
- Return complete HTML only.
`;

export async function beautifyHtmlQwen2(html: string) {

  console.log('11111');

  const message = await ai.messages.create({
    model: 'qwen3.8-max',
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

  const text = message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  console.log(text);

  return text;
}