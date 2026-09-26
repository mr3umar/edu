import { GoogleGenAI, Type } from '@google/genai';
import * as dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Extract the typing model class map structure dynamically
type ChatSessionInstance = ReturnType<typeof ai.chats.create>;

// Memory Map to keep track of multi-turn conversation contexts per session token
const tutorialSessionStore = new Map<string, ChatSessionInstance>();

/**
 * Generates or modifies an interactive step-by-step tutorial JSON layout payload.
 * 
 * @param sessionId - A unique string from the client tracking this workspace history context
 * @param promptTopic - What topic or procedure Gemini should generate a tutorial about
 * @returns A promise resolving to a clean, validated structural tutorial data object
 */
export async function generateContextualTutorial(sessionId: string, promptTopic: string) {
  try {
    let chatInstance = tutorialSessionStore.get(sessionId);

    // 1. Initialize a fresh state context if this session identifier is new
    if (!chatInstance) {
      console.log(`🧠 [Tutorial Engine] Initializing a brand-new state tracking chat session for ID: ${sessionId}`);
      
      chatInstance = ai.chats.create({
        // model: 'gemini-2.5-pro', // Best choice for balancing multi-step narrative depth with explicit SVG constraints
        model: 'gemini-3.5-flash',
        config: {
          responseMimeType: 'application/json',
          
          // 🛠️ DEFINE THE EXACT NESTED TUTORIAL SCHEMATIC STRUCTURAL MAP
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'The overall title name of this visual guide sequence.'
              },
              steps: {
                type: Type.ARRAY,
                description: 'The sequential list containing the tutorial items arranged step by step.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stepNumber: {
                      type: Type.INTEGER,
                      description: 'The sequential placement counter index of this step (e.g., 1, 2, 3).'
                    },
                    textToSay: {
                      type: Type.STRING,
                      description: 'Clear, concise script narration explaining what is happening or what actions to perform in this step. Keep it conversational.'
                    },
                    svgCode: {
                      type: Type.STRING,
                      description: 'The raw, pure standard XML/HTML <svg>...</svg> canvas markup vector drawing that visually matches the textToSay payload. Use an adaptive viewBox config ("0 0 100 100" with 100% dimensions) so it matches overlays cleanly. Never fence this in markdown backticks.'
                    }
                  },
                  required: ['stepNumber', 'textToSay', 'svgCode']
                }
              }
            },
            required: ['title', 'steps']
          },
          systemInstruction: `You are an elite Educational Content and Frontend UI Vector Artist.
             Your assignment is to compose a comprehensive, multi-step visual training tutorial based on the user topic request. 
             
             CRITICAL LOGIC & VARIATION SPECIFICATIONS:
             1. Ensure the tutorial progresses smoothly across explicit logical increments.
             2. Every index item inside your 'steps' array MUST have a highly descriptive 'textToSay' explaining the lesson, alongside a customized 'svgCode' layout illustrating that specific coordinate position.
             3. CONTEXT REUSE MANDATE: If the user requests an adjustment, amendment, or addition (e.g., "Add a conclusion step", "Change step 2 fill color to red", "Rewrite step 3 language"), read the chat history logs carefully, update only the target variables or elements, and return the modified fully structured JSON matching your schema.
             4. Never include extra conversational output prose, markdown formatting, or thoughts. Output ONLY valid JSON.
             5. Ensure viewbox of svg tag for each step is calculate based on its content.
             6. Use Arabic language and Right to left (RTL) writing format.
             7. Users are kids between 10 to 15 years old.
             `
        }
      });

      tutorialSessionStore.set(sessionId, chatInstance);
    } else {
      console.log(`🔄 [Tutorial Engine] Leveraging existing history logs context line for Session ID: ${sessionId}`);
    }

    // 2. Dispatch the text message down into the stateful conversation pipeline
    const response = await chatInstance.sendMessage({
      message: promptTopic
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error('Gemini successfully evaluated the step but returned an empty structural string.');
    }

    // Parse string text output back into a true JavaScript data block
    const parsedTutorialData = JSON.parse(jsonText);
    return parsedTutorialData;

  } catch (error) {
    console.error('❌ Synchronous Contextual Tutorial Service crashed:', error);
    throw error;
  }
}

/**
 * Wipe session context memory completely to start fresh
 */
export function clearTutorialSession(sessionId: string): boolean {
  return tutorialSessionStore.delete(sessionId);
}
