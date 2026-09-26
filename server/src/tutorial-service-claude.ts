import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize the Anthropic client using the ANTHROPIC_API_KEY environment variable
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Define the shape of our message history per session
type MessageHistory = Anthropic.MessageParam[];

// Memory Map to keep track of multi-turn conversation contexts per session token
const tutorialSessionStore = new Map<string, MessageHistory>();

// Define the TypeScript interface matching your original schema
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
 * Generates or modifies an interactive step-by-step tutorial JSON layout payload using Anthropic Claude.
 * 
 * @param sessionId - A unique string from the client tracking this workspace history context
 * @param promptTopic - What topic or procedure Claude should generate a tutorial about
 * @returns A promise resolving to a clean, validated structural tutorial data object
 */
export async function generateContextualTutorial(sessionId: string, promptTopic: string): Promise<TutorialData> {
  try {
    let messageHistory = tutorialSessionStore.get(sessionId);

    // 1. Initialize a fresh message array if this session identifier is new
    if (!messageHistory) {
      console.log(`🧠 [Tutorial Engine] Initializing a brand-new state tracking message history for ID: ${sessionId}`);
      messageHistory = [];
      tutorialSessionStore.set(sessionId, messageHistory);
    } else {
      console.log(`🔄 [Tutorial Engine] Leveraging existing history logs context line for Session ID: ${sessionId}`);
    }

    // Append the user's incoming prompt to the session history
    messageHistory.push({
      role: 'user',
      content: promptTopic
    });

    const systemInstruction = `You are an elite Educational Content and Frontend UI Vector Artist.
Your assignment is to compose a comprehensive, multi-step visual training tutorial based on the user topic request. 

## SVG Whiteboard Drawing
A tool named drawSvg is available for creating instructional diagrams on the virtual whiteboard using SVG.
Use this tool whenever a visual explanation will help the student understand the lesson better than spoken words alone.
Examples include: Number lines, Place value charts, Long division, Fractions, Tables, Geometric figures, Coordinate planes, Mathematical models, Flowcharts, Scientific diagrams, Comparisons between concepts, Step by step worked examples.

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
* Do not use fixed canvas dimensions unless explicitly requested.
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
* Align numbers by place value.
* Keep equal spacing between digits.
* Maintain consistent baselines.
* Center titles, equations, and diagrams when appropriate.
* Leave enough empty space for future explanation steps.
* Never crowd numbers together.
* Ensure every mathematical expression is immediately readable without ambiguity.

### Long Division
When drawing long division: Follow the layout used in Saudi school textbooks, Draw the division bracket before placing any numbers, Place the divisor outside the bracket, Place the dividend inside the bracket, Place the quotient above the horizontal bar, Align all digits by place value, Reserve sufficient vertical space for every subtraction step, Extend the horizontal bar only as far as required, Keep intermediate calculations perfectly aligned beneath the corresponding digits.

### Progressive Teaching
When solving a problem: Do not reveal the complete solution immediately, Draw only the information needed for the current explanation, Add new elements as the explanation progresses, Keep each drawing focused on a single logical step, If several drawings are required, each one should clearly continue from the previous drawing.

### Updating Existing Drawings
When modifying an existing drawing: Preserve every unchanged element, Modify only the requested parts, Keep object positions, spacing, colors, and styling consistent, Return the complete updated SVG instead of only the modified fragment, The updated drawing should appear as a natural continuation of the previous one rather than a completely new drawing.

Before writing any SVG, internally compute the bounding box of every visual element, including text, shapes, and lines. Perform a complete layout pass, resolve overlaps, align objects to a consistent grid, then generate the final SVG. Never generate coordinates incrementally while thinking.
SVG generation is a two-pass process. First compute the layout. Second emit the SVG. Never decide coordinates while emitting element

### Right to Left Layout
Arabic text and mathematical notation follow different layout rules.
- Apply RTL only to natural language text.
- Do not mirror mathematical diagrams.
- Follow the conventions used in Saudi mathematics textbooks.
- Mathematical symbols, tables, number lines, equations, and long division must use their standard educational layout even when labels are Arabic.
- Digits must remain in their normal mathematical order.
- Do not reverse the order of numbers because of RTL.
- Treat mathematical notation as layout independent from paragraph direction.`;

    // 2. Dispatch the history payload to Anthropic API
    // We enforce structure by defining a tool and utilizing 'tool_choice' type: 'tool'
    const response = await anthropic.messages.create({
      // model: 'claude-sonnet-4-6', // Best option for reasoning and complex SVG layout instructions
      model: 'claude-opus-4-8', 
      // model: 'claude-haiku-4-5', 
      max_tokens: 4000,
      system: systemInstruction,
      messages: messageHistory,
      // thinking: {
      //   type: 'adaptive'
      // },
      // output_config: {
      //   effort: 'low' // Options: 'low' | 'medium' | 'high' | 'max'
      // },
      tool_choice: { type: 'tool', name: 'output_tutorial_data' },
      tools: [
        {
          name: 'output_tutorial_data',
          description: 'Outputs the generated structural tutorial data containing instructions and structural SVGs.',
          input_schema: {
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
                  required: ['stepNumber', 'textToSay', 'svgElements']
                }
              }
            },
            required: ['svg', 'steps']
          }
        }
      ]
    });

    // 3. Extract tool use blocks from the response content array
    const toolUseBlock = response.content.find(block => block.type === 'tool_use');

    if (!toolUseBlock) {
      throw new Error('Claude successfully evaluated the step but failed to execute the structured tool block.');
    }

    const parsedTutorialData = toolUseBlock.input as unknown as TutorialData;

    // Append Claude's response back into the history tracking instance to preserve context for consecutive turns
    messageHistory.push({
      role: 'assistant',
      content: [response.content[0]] // Saves Claude's structural payload answer natively back into your thread
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