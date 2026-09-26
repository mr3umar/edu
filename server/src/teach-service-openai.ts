import OpenAI, { toFile } from 'openai'; // 1. Import 'toFile' here
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🛠️ DEFINE THE EXACT STRUCTURAL SCHEMA USING ZOD FOR DOCUMENT ANALYSIS
const DocumentAnalysisSchema = z.object({
  parts: z.array(
    z.object({
      seq_id: z.number().int().describe('A unique sequential identifier for this specific part.'),
      type: z.string().describe('The structural type of the element (e.g., paragraph, heading, question, option, blank).'),
      content: z.string().describe('The textual content of the part. Inline markers must be wrapped in tags like <blank id="1" ...>content</blank>.'),
      label: z.string().nullable().describe('The explicit title or number associated with the part (e.g., "Question 1", "Exercise A"). Null if none.'),
      parent_id: z.number().int().nullable().describe('The seq_id of the parent element to establish hierarchy. Null if it is a root element.'),
      coordinates: z.object({
        min_x: z.number(),
        min_y: z.number(),
        max_x: z.number(),
        max_y: z.number()
      }).describe('The bounding box coordinates of the element. Strictly ordered from left to right.')
    })
  ).describe('The complete array of analyzed document elements, broken down into granular parts.')
});

const SYSTEM_INSTRUCTION = `
I will share with you image of textbook, and genrate json of the content each part contains the seq id, type, content and coordinates (do not name bbox, name it coordinates), ... and other document analysis attributes. also reference the parent for each part. Always use left to right for coordinates even if language RTL like arabic. I will till you the image diminsions. add the label title or number for each part. Also make sub part or element as seperate part such as each option, each answer value, blank to fill, etc. Ensure min Y and max Y is accurate and fit well with the image height. for right-to-left (RTL) languages, ensure text is read from right, for example: formulas like 100 - 200, should be captures as 200 - 100.
Inline markers inside the passage treat them like tag and wrap them in specific and add the coordinates of these markers as well.format example: <blank id="1" answer="enormous" x="10" y="20" width="30" height="15">enormous</blank> and <blank id="2" given_letter="a" x="110" y="210" width="30" height="15">a________</blank>.`;

/**
 * Helper function to determine the mime type based on file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    default: return 'image/jpeg';
  }
}

/**
 * Analyzes a textbook image file from a local path and returns the structural JSON payload.
 * * @param filePath - The local system path to the image file
 * @returns A promise resolving to the validated structured document analysis data object
 */
export async function analyzeTextbookImage(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at specified path: ${filePath}`);
    }
    
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = getMimeType(filePath);

    // Request a Structured Output Completion from OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Model optimized for multimodal vision and JSON schema compliance
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: zodResponseFormat(DocumentAnalysisSchema, 'analysis_payload'),
    });

    const jsonText = response.choices[0].message.content;
    if (!jsonText) {
      throw new Error('OpenAI evaluated the image but returned an empty content string.');
    }

    return JSON.parse(jsonText);

  } catch (error) {
    console.error('❌ OpenAI Document Analysis Service failed:', error);
    throw error;
  }
}


// ... keep your other imports and schema setup the same ...
// the source text in pdf for arabic is curropted.
export async function analyzeTextbookPdfPage(pdfPageBytes: Uint8Array) {
        try {
          const fileBuffer = Buffer.from(pdfPageBytes);
      
          // Upload PDF
          const fileUpload = await openai.files.create({
            file: await toFile(fileBuffer, 'page.pdf', {
              type: 'application/pdf',
            }),
            purpose: 'user_data',
          });
      
          // Responses API
          const response = await openai.responses.create({
            model: 'gpt-5.5',
            input: [
              {
                role: 'system',
                content: SYSTEM_INSTRUCTION,
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text: 'Analyze the text and layout coordinates of this native PDF page snippet according to the system instructions.',
                  },
                  {
                    type: 'input_file',
                    file_id: fileUpload.id,
                  },
                ],
              },
            ],
          });
      
          const jsonText = response.output_text;
      
          if (!jsonText) {
            throw new Error(
              'OpenAI parsed the PDF page successfully but returned empty output.'
            );
          }
      
          return JSON.parse(jsonText);
      
        } catch (error) {
          console.error('❌ OpenAI PDF Page Analysis Service failed:', error);
          throw error;
        }
      }