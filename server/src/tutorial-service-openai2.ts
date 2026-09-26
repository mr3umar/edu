import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize the OpenAI client using the OPENAI_API_KEY environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the shape of our message history per session
type MessageHistory = OpenAI.Chat.ChatCompletionMessageParam[];

// Memory Map to keep track of multi-turn conversation contexts per session token
const tutorialSessionStore = new Map<string, MessageHistory>();

// Define TypeScript interfaces matching your required layout schema
export interface TutorialStep {
  stepNumber: number;
  textToSay: string;
  svgElements: string[];
}

export interface TutorialData {
  svg: string;
  steps: TutorialStep[];
}

/**
 * Generates or modifies an interactive step-by-step tutorial JSON layout payload using OpenAI GPT-5.
 * 
 * @param sessionId - A unique string from the client tracking this workspace history context
 * @param promptTopic - What topic or procedure GPT-5 should generate a tutorial about
 * @returns A promise resolving to a clean, validated structural tutorial data object
 */
export async function generateContextualTutorial(sessionId: string, promptTopic: string): Promise<TutorialData> {
  try {
    let messageHistory = tutorialSessionStore.get(sessionId);

    // 1. Initialize a fresh message array if this session identifier is new
    if (!messageHistory) {
      console.log(`🧠 [Tutorial Engine] Initializing a brand-new state tracking message history for ID: ${sessionId}`);
      
      // Define the system instructions guiding the layout rules
      const systemInstruction = `You are an elite Educational Content and Frontend UI Vector Artist.
Your assignment is to compose a comprehensive, multi-step visual training tutorial based on the user topic request. 

## SVG Whiteboard Drawing
A tool named drawSvg is available for creating instructional diagrams on the virtual whiteboard using SVG.
Use this tool whenever a visual explanation will help the student understand the lesson better than spoken words alone.

### Teaching Principles
* Think like a classroom teacher drawing on a whiteboard.
* Every drawing should explain exactly one teaching objective.
* Draw only what is needed for the current explanation.
* Build diagrams progressively instead of revealing everything at once.
* Keep previous information visible only when it helps understanding.
* Highlight only the elements currently being discussed.
* Prefer simple and clear diagrams over decorative illustrations.
* Every new drawing should naturally continue the previous explanation whenever possible.

### Layout Planning
Before generating the SVG: Understand the mathematical or educational structure, Plan the complete layout before drawing any element, Estimate the required space for every object, Position the largest objects first, Position labels and text afterwards, Calculate the final bounding box of the complete drawing, Add comfortable padding around the content, Generate the viewBox from the final layout rather than using arbitrary values.
Never place objects sequentially without considering the overall composition.

### SVG Requirements
* Produce valid SVG.
* Generate a dynamic viewBox that tightly fits the content with comfortable margins.
* Use proportional coordinates so drawings scale correctly.
* Maintain consistent spacing and alignment throughout the drawing.
* Prevent text from overlapping lines, shapes, or other text.
* Keep all labels close to the objects they describe.
* Prefer SVG elements such as text, line, rect, circle, ellipse, polygon, path, and g.
* Avoid unnecessary decorations, gradients, shadows, filters, animations, or complex styling.
* Use Arabic text with right to left writing.
* Ensure all text remains readable at normal viewing sizes.

### Mathematical Drawing Rules
Mathematical notation must follow standard educational conventions rather than normal text layout.
* Align numbers by place value. Maintain consistent baselines.
* Center titles, equations, and diagrams when appropriate.
* Leave enough empty space for future explanation steps. Never crowd numbers together.

### Long Division
When drawing long division: Follow the layout used in Saudi school textbooks, Draw the division bracket before placing any numbers, Place the divisor outside the bracket, Place the dividend inside the bracket, Place the quotient above the horizontal bar, Align all digits by place value.

### Progressive Teaching
When solving a problem: Do not reveal the complete solution immediately, Draw only the information needed for the current explanation, Add new elements as the explanation progresses.

### Updating Existing Drawings
When modifying an existing drawing: Preserve every unchanged element. Return the complete updated SVG instead of only the modified fragment.

### Right to Left Layout
Arabic text and mathematical notation follow different layout rules.
- Apply RTL only to natural language text. Do not mirror mathematical diagrams.
- Follow the conventions used in Saudi mathematics textbooks.
- Mathematical symbols, tables, number lines, equations, and long division must use their standard educational layout even when labels are Arabic.
- Digits must remain in their normal mathematical order. Do not reverse the order of numbers because of RTL.`;

      messageHistory = [
        {
          role: 'system',
          content: systemInstruction
        }
      ];
      tutorialSessionStore.set(sessionId, messageHistory);
    } else {
      console.log(`🔄 [Tutorial Engine] Leveraging existing history logs context line for Session ID: ${sessionId}`);
    }

    // Append the user's incoming query to the session history array
    messageHistory.push({
      role: 'user',
      content: promptTopic
    });

    // 2. Dispatch the payload execution parameters down to OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-5.5', // Targets the standard frontier generation model
      // model: 'gpt-5.4', 
      // model: 'gpt-5.4-mini', 
      reasoning_effort: 'medium', // Options: 'low' | 'medium' | 'high' (Balances logic execution costs)
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'tutorial_response',
            strict: true, // Forces absolute adherence to the schema
            schema: {
              type: 'object',
              properties: {
                svg: {
                  type: 'string',
                  description: 'Full valid code string of the SVG canvas data.'
                },
                steps: {
                  type: 'array',
                  description: 'The sequential list containing the tutorial items arranged step by step.',
                  items: {
                    type: 'object',
                    properties: {
                      stepNumber: {
                        type: 'integer',
                        description: 'The sequential placement counter index of this step (e.g., 1, 2, 3).'
                      },
                      textToSay: {
                        type: 'string',
                        description: 'Clear, concise script narration explaining what is happening. Conversational.'
                      },
                      svgElements: {
                        type: 'array',
                        description: 'The IDs of elements that should be highlighted/present in this sequence.',
                        items: {
                          type: 'string'
                        }
                      }
                    },
                    required: ['stepNumber', 'textToSay', 'svgElements'],
                    additionalProperties: false
                  }
                }
              },
              required: ['svg', 'steps'],
              additionalProperties: false
            }
          }
        },
      messages: messageHistory
    });

    const jsonText = response.choices[0].message.content;
    if (!jsonText) {
      throw new Error('GPT-5 evaluated the step successfully but returned an empty text response block.');
    }

    // Parse the output string text back into a true structured JavaScript data block
    const parsedTutorialData = JSON.parse(jsonText) as TutorialData;

    // Append the assistant response to the session history array to maintain multi-turn memory
    messageHistory.push({
      role: 'assistant',
      content: jsonText
    });

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