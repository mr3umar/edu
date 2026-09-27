import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import he from 'he';
import { calculateCost } from "./pricing.js";
import { PageAnalysisE } from "edu-ai-domain";


dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// 🛠️ SCHEMA USING NORMALIZED COORDINATES (0-1000)
const documentAnalysisSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    parts: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.INTEGER },
          type: { type: SchemaType.STRING, description: "title, concept, example, question_group, question, answer_option, diagram, image, table, qr_code, answer-blank, line_mark, star_mark" },
          area: { type: SchemaType.STRING, description: "header, main, footer" },
          content: { type: SchemaType.STRING },
          parent_id: { type: SchemaType.INTEGER, nullable: true },
          coordinates: {
            type: SchemaType.OBJECT,
            properties: {
              min_x: { type: SchemaType.INTEGER, description: "Normalized 0-1000" },
              min_y: { type: SchemaType.INTEGER, description: "Normalized 0-1000" },
              max_x: { type: SchemaType.INTEGER, description: "Normalized 0-1000" },
              max_y: { type: SchemaType.INTEGER, description: "Normalized 0-1000" },
            },
            required: ["min_x", "min_y", "max_x", "max_y"],
          },
        },
        required: ["id", "type", "content", "coordinates"],
      },
    },
  },
  required: ["parts"],
};

// - for right-to-left (RTL) languages, ensure text is read from right, for example: formulas like 100 - 200, should be captures as 200 - 100.
// - Split text into individual visual words/tokens, wrapping normal words in [word x="100" y="100" style="underline,italic,..."], structural labels (such as question numbers, section numbers, or figure labels) in [label x="100" y="100"], blank areas intended for an answer in [answer_blank x="100" y="100"], and mathematical structures using [math_fraction_numerator x="100" y="100"], [math_fraction_denominator x="100" y="100"], [math_pow_base x="100" y="100"], and [math_pow_exponent x="100" y="100"] tags; output LTR text left-to-right and RTL text right-to-left, without reordering or modifying coordinates.
export const OCR_SYSTEM_INSTRUCTION = `
- Analyze the provided document image and generate a structured JSON. 
- YOU MUST USE NORMALIZED COORDINATES (0 to 1000). 0,0 is top-left, 1000,1000 is bottom-right.
- Coordinates are always physical bounding-box coordinates and must NEVER be reversed because of text direction. x is always the left edge of the word's bounding box, regardless of RTL/LTR. For Arabic, preserve the natural reading order (right-to-left), while each word's x remains its physical leftmost coordinate.
- Break down content into granular parts (title, concept, example, question_group, question...).
- Identify meaningful visual marks that convey information or indicate meaning, such as stars, or other intentional markings, and represent each as a separate part with its type and coordinates.
- Hierarchical Relationships: If a part is a sub-element of another part (for example, individual choices inside a multiple-choice question block, or a specific blank inside a multi-step problem), you must add a parent_id attribute inside the child object pointing to the ID of its overarching container.
- Split text into individual visual words/tokens, wrapping normal words in [word x="100" y="100" style="underline,italic,..."], structural labels (such as question numbers, section numbers, or figure labels) in [label x="100" y="100"], and blank areas intended for an answer in [answer_blank x="100" y="100"]; output LTR text left-to-right and RTL text right-to-left, without reordering or modifying coordinates.
- For mathematical expressions such as fractions, powers, subscripts, and roots, output inline MathML, preserving the visual structure and coordinates of the mathematical components, example <math display="inline"> <mfrac> <mn>١</mn> <mn>١٠٠</mn> </mfrac> </math>.
- When only part of a word has text styling like underline or bold, wrap that portion in <span style="underline">...</span> inside the [word] tag.
- Also make sub part or element as seperate part such as each answer_option, each answer value, blank to fill, etc. 
- For image and diagram parts, use attribute content to add all words and shap positions and description like [word x="" y="" style="underline,italic,..."]...[/word]  [label x="" y=""]...[/label] [shape x="" y="" width="" height=""]circle[/shape].
`;
// - For shap and diagram parts, define type as diagram, add extra attribute in part object to include full_text_description. also add elements attibute which includes every geometric shape, line, charachter, number, or mathematical plot, create an element entry specifying its type, its coordinates/bounding box, and its exact mathematical representation in LaTeX. Explicitly describe how these elements relate to each other spatially (e.g., 'Line A intersects Line B at Point C') so a downstream text-based AI can mathematically reconstruct the layout.

/**
 * Denormalizes coordinates back to pixel values
 */
export function denormalize(min_x: number, min_y: number, max_x: number, max_y: number, w: number, h: number) {
  return {
    x: Math.round((min_x / 1000) * w),
    y: Math.round((min_y / 1000) * h),
    width: Math.round(((max_x - min_x) / 1000) * w),
    height: Math.round(((max_y - min_y) / 1000) * h),
  };
}
export function denormalize2(min_x: number, min_y: number, w: number, h: number) {
  return {
    x: Math.round((min_x / 1000) * w),
    y: Math.round((min_y / 1000) * h),
  };
}

export const IMG_W = 637;
export const IMG_H = 821;

export async function analyzeTextbookImageWithGemini(filePath: string, imageWidth: number, imageHeight: number) {

  // const model = "gemini-2.5-pro";
  // Input tokens: 1044 costs: 0.0013050000000000002, output: 7893 costs: 0.07893 model: gemini-2.5-pro. Details: {"promptTokenCount":1044,"candidatesTokenCount":7893,"totalTokenCount":20604,"promptTokensDetails":[{"modality":"TEXT","tokenCount":786},{"modality":"IMAGE","tokenCount":258}],"thoughtsTokenCount":11667,"serviceTier":"standard"}  
  
  const model = "gemini-3.1-pro-preview";
  // Input tokens: 1888 costs: 0.003776, output: 8075 costs: 0.0969 model: gemini-3.1-pro-preview. Details: {"promptTokenCount":1888,"candidatesTokenCount":8075,"totalTokenCount":9963,"promptTokensDetails":[{"modality":"TEXT","tokenCount":786},{"modality":"IMAGE","tokenCount":1102}],"serviceTier":"standard"}
  // after removing width and height from word tag
  // Input tokens: 2084 costs: 0.004168, output: 5082 costs: 0.060984000000000003 model: gemini-3.1-pro-preview. Details: {"promptTokenCount":2084,"candidatesTokenCount":5082,"totalTokenCount":7166,"promptTokensDetails":[{"modality":"TEXT","tokenCount":982},{"modality":"IMAGE","tokenCount":1102}],"serviceTier":"standard"}

  const session = genAI.getGenerativeModel({
    // model: "gemini-2.5-pro",
    model,
//     gemini-2.5-flash // not accurate in reading numbers
// gemini-2.5-pro
    generationConfig: { responseMimeType: "application/json", responseSchema: documentAnalysisSchema },
    systemInstruction: OCR_SYSTEM_INSTRUCTION,
  });

  const imageBuffer = fs.readFileSync(filePath);
  const result = await session.generateContent([
    OCR_SYSTEM_INSTRUCTION,
    { inlineData: { data: imageBuffer.toString("base64"), mimeType: "image/png" } }
  ]);


  const usage = result.response.usageMetadata;

  console.log("Gemini usage:", usage);

  const inputTokens = usage?.promptTokenCount ?? 0;
  const outputTokens = usage?.candidatesTokenCount ?? 0;
  const thoughtsTokens = (usage as any)?.thoughtsTokenCount ?? 0
  const cachedTokens = usage?.cachedContentTokenCount ?? 0;

  const tokensCount = {
    input: inputTokens,
    cachedInput: cachedTokens,
    output: outputTokens + thoughtsTokens, // gemini does not include thoughts tokens in output
  }

  const cost = calculateCost(model, tokensCount)
  console.log(`Input tokens: ${tokensCount.input} costs: ${cost.input}, Cached Input tokens: ${tokensCount.cachedInput} costs: ${cost.cachedInput}, output: ${tokensCount.output} + thoughts tokens (${thoughtsTokens}) costs: ${cost.output} model: ${model}. Details: ${JSON.stringify(usage)}`)

  
  const rawData = JSON.parse(result.response.text());

  // Convert to absolute pixels for your final application use
  return rawData.parts.map((part: any) => {
  
        const partData: PageAnalysisE["data"]["parts"]["0"] = {
          id: part.id,
          type: part.type,
          content: he.decode(part.content),
          parentId: part.parent_id,
          coordinates: denormalize(
            part.coordinates.min_x, part.coordinates.min_y,
            part.coordinates.max_x, part.coordinates.max_y,
            imageWidth, imageHeight
          )
        }
        return partData
      });
}