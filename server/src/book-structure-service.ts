import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// 🛠️ SCHEMA USING NORMALIZED COORDINATES (0-1000)
const documentAnalysisSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    sections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          level: { type: SchemaType.STRING, description: "chapter, lesson" },
          title: { type: SchemaType.STRING },
          parent_id: { type: SchemaType.INTEGER, nullable: true }
        },
        required: ["id", "level", "title"],
      },
    },
    pages: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          pageNumber: { type: SchemaType.STRING },
          sectionId: { type: SchemaType.STRING },
        },
        required: ["pageNumber", "sectionId"],
      },
    },
  },
  required: ["sections", "pages"],
};

const SYSTEM_INSTRUCTION = `
- Generate book structure.
- Use book index table of content if available.
`;
// - For shap and diagram parts, define type as diagram, add extra attribute in part object to include full_text_description. also add elements attibute which includes every geometric shape, line, charachter, number, or mathematical plot, create an element entry specifying its type, its coordinates/bounding box, and its exact mathematical representation in LaTeX. Explicitly describe how these elements relate to each other spatially (e.g., 'Line A intersects Line B at Point C') so a downstream text-based AI can mathematically reconstruct the layout.


export async function getBookStructure(book: any) {

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    // gemini-pro-latest
//     gemini-2.5-flash
// gemini-2.5-pro
    generationConfig: { responseMimeType: "application/json", responseSchema: documentAnalysisSchema },
    // systemInstruction: SYSTEM_INSTRUCTION,
  });

  const result = await model.generateContent([
    SYSTEM_INSTRUCTION,
    JSON.stringify(book)
  ]);

  const rawData = JSON.parse(result.response.text());

  return rawData
  ;
}