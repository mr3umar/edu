import { GoogleGenAI, Type } from '@google/genai'; // FIX: Remove "ChatSession" from the import list
import * as dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ⚡ CRITICAL FIX: Use ReturnType to dynamically extract the exact chat class mapping schema
type ChatSessionInstance = ReturnType<typeof ai.chats.create>;

// Update your Global Server-Side Memory Map to use the extracted Type definition safely
const sessionStore = new Map<string, ChatSessionInstance>();

/**
 * Global service to generate or modify an SVG based on session context history.
 */
export async function generateContextualSVG(sessionId: string, promptDescription: string): Promise<string> {
  try {
    let chatInstance = sessionStore.get(sessionId);

    // 1. If this is a brand-new session, initialize an isolated Chat Context instance
    if (!chatInstance) {
      console.log(`🧠 [Memory Store] Initializing a brand-new contextual chat sequence for Session ID: ${sessionId}`);
      
      chatInstance = ai.chats.create({
        model: 'gemini-2.5-pro',
        // model: 'gemini-3.5-flash',
        // model: 'gemini-3.1-flash-lite',
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              svgStringContent: {
                type: Type.STRING,
                description: 'The raw, complete standard HTML/XML <svg>...</svg> vector code block. Do not wrap in markdown or markdown backticks.'
              }
            },
            required: ['svgStringContent']
          },
          systemInstruction: `Vector Graphic Illustrator.
             Your task is to generate or modify a fully compliant, scalable HTML/XML SVG element based on user instructions.
             Review the conversation history to track adjustments, keeping responses restricted to JSON formatting.

             Use Arabic language and Right to left (RTL) writing format.
             `
        }
      });

      // Save it into our global memory lookup map
      sessionStore.set(sessionId, chatInstance);
    } else {
      console.log(`🔄 [Memory Store] Reusing active chat sequence history for Session ID: ${sessionId}`);
    }

    // 2. Transmit the user's instructions into the stateful conversation chain
    const response = await chatInstance.sendMessage({
      message: promptDescription
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error('Gemini processed the contextual message step but returned an empty text string.');
    }

    const parsedData = JSON.parse(jsonText);
    const cleanSvg = parsedData.svgStringContent?.trim();

    if (!cleanSvg || !cleanSvg.startsWith('<svg')) {
      throw new Error('Conversation payload JSON missing valid structural <svg> root definitions.');
    }

    return cleanSvg;

  } catch (error) {
    console.error('❌ Contextual Global SVG Service breakdown:', error);
    throw error;
  }
}

/**
 * Clear a session memory context line completely to start fresh
 */
export function clearSvgSession(sessionId: string): boolean {
  return sessionStore.delete(sessionId);
}
