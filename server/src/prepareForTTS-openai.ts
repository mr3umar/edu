import * as dotenv from 'dotenv';
import OpenAI from 'openai'; // 1. Import 'toFile' here
import { calculateCost } from './pricing.js';
import { PROMPT_NORMALIZE_TEXT } from './prompts/normalize-text.js';


dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function prepareForTTS(text: string) {
  try {
    // const model = 'gpt-5.4-mini-2026-03-17'
    const model = 'gpt-5.6-luna'
    
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: PROMPT_NORMALIZE_TEXT },
        {
          role: 'user',
          content: text
        }
      ],
      max_completion_tokens: 300,
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

    console.log(JSON.stringify(response), ">>>>")
    const result = response.choices[0].message.content;

    return result

  } catch (error) {
    console.error('❌ OpenAI Prepare for TTS failed:', error);
    throw error;
  }
}
