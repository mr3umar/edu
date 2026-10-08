import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { calculateCost } from "./pricing.js";
import { RecordUsage } from "./types.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// 🛠️ SCHEMA USING NORMALIZED COORDINATES (0-1000)
const documentAnalysisSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    language: { type: SchemaType.STRING, description: `example: en, ar..` },
    bookTitle: { type: SchemaType.STRING, description: `the title of the book, usually in the first pages.` },
    sections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          sectionIndex: { type: SchemaType.NUMBER, description: 'generate sequential number start with 0' },
          // level: { type: SchemaType.STRING, description: "chapter, lesson" },
          title: { type: SchemaType.STRING },
          // parent_id: { type: SchemaType.INTEGER, nullable: true }
        },
        // required: ["id", "level", "title"],
        required: ["sectionIndex", "title"],
      },
    },
    pages: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          pageIndex: { type: SchemaType.NUMBER, description: 'same pageNumber provided.' },
          sectionIndex: { type: SchemaType.NUMBER, description: 'which section belongs to.' },
        },
        required: ["pageIndex", "sectionIndex"],
      },
    },
  },
  required: ["language", "bookTitle", "sections", "pages"],
};

const SYSTEM_INSTRUCTION = `
Analyze the provided book pages and group them into meaningful **chapters, lessons, units, or topics** based on the book's actual content.

Input:

[
  {"pageIndex": 1, "text": "..."},
  {"pageIndex": 2, "text": "..."}
]

Rules:

* Detect the book's primary language and return its ISO 639-1 code (e.g. 'ar', 'en', 'fr').
* Identify the book title, usually from the first pages.
* Section titles and the book title must be in the **same language as the provided text**. Do not translate them.
* Use existing chapter/lesson titles when clearly present.
* Otherwise infer logical sections from topic changes and content.
* Keep related explanations, examples, and exercises together.
* Avoid unnecessary section splits.
* Every page must belong to exactly one section.
* Preserve the original page numbers.
* Section numbers start at 1 and are sequential.
* Use concise, accurate section titles.
* A section must represent meaningful book content. Never create sections based on page state or formatting, such as "Empty Page", "Blank Page", "Image Page", "Cover Page", "Separator", or similar.
* Pages with little or no text should be assigned to the most appropriate nearby section based on surrounding pages and book structure.

Return **only valid JSON**:

json
{
  "language": "ar",
  "bookTitle": "عنوان الكتاب",
  "sections": [
    {"sectionIndex": 1, "title": "مقدمة"}
  ],
  "pages": [
    {"pageIndex": 1, "sectionIndex": 1}
  ]
}

Ensure every input page appears exactly once and every referenced section exists.

`;
// - For shap and diagram parts, define type as diagram, add extra attribute in part object to include full_text_description. also add elements attibute which includes every geometric shape, line, charachter, number, or mathematical plot, create an element entry specifying its type, its coordinates/bounding box, and its exact mathematical representation in LaTeX. Explicitly describe how these elements relate to each other spatially (e.g., 'Line A intersects Line B at Point C') so a downstream text-based AI can mathematically reconstruct the layout.


export async function getBookStructure2(book: any, delegate: {recordUsage: RecordUsage}) {

  // gemini-pro-latest
//     gemini-2.5-flash
// gemini-2.5-pro
  const model = 'gemini-2.5-flash'

  const ai = genAI.getGenerativeModel({
    model,
    generationConfig: { responseMimeType: "application/json", responseSchema: documentAnalysisSchema },
    // systemInstruction: SYSTEM_INSTRUCTION,
  });

  const result = await ai.generateContent([
    SYSTEM_INSTRUCTION,
    JSON.stringify(book)
  ]);


  const usage = result.response.usageMetadata
  const tokensCount = {
      input: usage?.promptTokenCount ?? 0,
      cachedInput: usage?.cachedContentTokenCount ?? 0,
      output: usage?.candidatesTokenCount ?? 0,
  };
  const reasoningTokens = (usage as any)?.thoughtsTokenCount ?? 0;
  const cost = calculateCost(model, tokensCount);
  delegate.recordUsage(cost.total, {
    task: 'book-structure',
    model,
      type: 'tokens',
      tokens: tokensCount,
      info: `Input tokens: ${tokensCount.input} costs: ${cost.input}, Cached Input tokens: ${tokensCount.cachedInput} costs: ${cost.cachedInput}, output: ${tokensCount.output} includes reasoning tokens (${reasoningTokens}) costs: ${cost.output}. model: ${model}. Details: ${JSON.stringify(usage)}`,
  });
  
  const rawData = JSON.parse(result.response.text());

  return rawData
  ;
}