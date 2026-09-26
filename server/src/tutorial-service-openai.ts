import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🛠️ DEFINE THE EXACT STRUCTURAL SCHEMA USING ZOD FOR OPENAI COMPLIANCE
const TutorialSchema = z.object({
  title: z.string().describe('The overall title name of this visual guide sequence.'),
  steps: z.array(
    z.object({
      stepNumber: z.number().int().describe('The sequential placement counter index of this step (e.g., 1, 2, 3).'),
      textToSay: z.string().describe('Clear, concise script narration explaining what is happening or what actions to perform in this step. Keep it conversational.'),
      svgCode: z.string().describe('The raw, pure standard XML/HTML <svg>...</svg> canvas markup vector drawing that visually matches the textToSay payload. Use an adaptive viewBox config calculated based on content. Never fence this in markdown backticks.')
    })
  ).describe('The sequential list containing the tutorial items arranged step by step.')
});

// Define Chat History array type matching OpenAI requirements
type ChatMessageHistory = OpenAI.Chat.ChatCompletionMessageParam[];

// Global Server-Side memory map to track message logs per unique sessionId
const openaiSessionStore = new Map<string, ChatMessageHistory>();

const SYSTEM_INSTRUCTION = `You are an elite Educational Content and Frontend UI Vector Artist.
Your assignment is to compose a comprehensive, multi-step visual training tutorial based on the user topic request. 

CRITICAL LOGIC & VARIATION SPECIFICATIONS:
1. Ensure the tutorial progresses smoothly across explicit logical increments.
2. Every index item inside your 'steps' array MUST have a highly descriptive 'textToSay' explaining the lesson, alongside a customized 'svgCode' layout illustrating that specific coordinate position.
3. CONTEXT REUSE MANDATE: If the user requests an adjustment, amendment, or addition, read the chat history logs carefully, update only the target variables or elements, and return the modified fully structured JSON matching the schema.
4. Never include extra conversational output prose, markdown formatting, or thoughts. Output ONLY valid JSON matching the schema parameters exactly.
5. Ensure viewbox of svg tag for each step is calculated dynamically based on its coordinate content.
6. Use Arabic language and Right to left (RTL) writing format.
7. Users are kids between 10 to 15 years old, so keep the explanations engaging and age-appropriate.

SVG LAYOUT RULES:
1. Use a strict invisible 12-column grid system.
2. All coordinates must align to multiples of 10.
3. Maintain consistent spacing:
   - outer padding: 40
   - element gap: 24
   - text gap: 12
4. Never place elements randomly.
5. Keep compositions horizontally balanced.
6. Prefer large simple shapes over detailed drawings.

VISUAL STYLE:
- Flat educational infographic style
- Large readable typography
- Minimal decorations
- Strong hierarchy
- Clear focus point
- One learning idea per frame
- Use color only for emphasis
- Avoid realistic drawings

RTL TEXT RULES:
- All Arabic text must use:
  direction="rtl"
  unicode-bidi="plaintext"
  text-anchor="end"
- Align Arabic labels from right to left.
- Start layouts from right side first.
`
;

/**
 * Generates or modifies an interactive step-by-step tutorial JSON layout payload using OpenAI.
 * 
 * @param sessionId - A unique string from the client tracking this workspace history context
 * @param promptTopic - What topic or procedure OpenAI should generate a tutorial about
 * @returns A promise resolving to a clean, validated structural tutorial data object
 */
export async function generateOpenAITutorial(sessionId: string, promptTopic: string) {
  try {
    let history = openaiSessionStore.get(sessionId);

    // 1. If this is a brand-new session, initialize an isolated history log array
    if (!history) {
      console.log(`🧠 [OpenAI Tutorial Engine] Initializing a brand-new state tracking chat session for ID: ${sessionId}`);
      
      history = [
        { role: 'system', content: SYSTEM_INSTRUCTION }
      ];
      openaiSessionStore.set(sessionId, history);
    } else {
      console.log(`🔄 [OpenAI Tutorial Engine] Leveraging existing history logs context line for Session ID: ${sessionId}`);
    }

    // 2. Append the current user instruction turn to the persistent memory stack
    history.push({ role: 'user', content: promptTopic });

    // 3. Request a Structured Output Completion from GPT-4o
    const response = await openai.chat.completions.create({
//       model: 'gpt-4o', // Premium choice model for deep layout reasoning and structured schemas
      model: 'gpt-5', // Premium choice model for deep layout reasoning and structured schemas
//       model: 'o3-mini', // Premium choice model for deep layout reasoning and structured schemas
      messages: history,
      response_format: zodResponseFormat(TutorialSchema, 'tutorial_payload'), // Enforces structure natively
//       temperature: 0.2 // Lower temp minimizes structural code formatting slip-ups
        // reasoning_effort: 'high'
    });

    const jsonText = response.choices[0].message.content;
    if (!jsonText) {
      throw new Error('OpenAI successfully evaluated the step but returned an empty content string.');
    }

    // 4. Save the model's structural response turn back into history so it can read it next time!
    history.push({ role: 'assistant', content: jsonText });

    // Parse string text output back into a true JavaScript data block
    const parsedTutorialData = JSON.parse(jsonText);
    return parsedTutorialData;

  } catch (error) {
    console.error('❌ Synchronous OpenAI Tutorial Service crashed:', error);
    throw error;
  }
}

/**
 * Wipe session context memory completely to start fresh
 */
export function clearOpenAITutorialSession(sessionId: string): boolean {
  return openaiSessionStore.delete(sessionId);
}
