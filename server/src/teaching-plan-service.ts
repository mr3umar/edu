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
    concepts: {
      type: SchemaType.ARRAY,
      description: "List all main concepts as structured in source",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING, description: "Use title close to the title provided from source book" },
          summary: { type: SchemaType.STRING },
        },
        required: ["id", "title", "summary"],
      }
    },
    teachingPlan: {
      type: SchemaType.STRING,
      description: "10 min long text plan including: Hook, Assess Prior Knowledge, Teach One Core Idea, Active Learning, Real-World Connection, Retrieval and Summary, ",
    }
  },
  required: ["concepts", "teachingPlan"],
};

const SYSTEM_INSTRUCTION = `
# 10-Minute Teacher Mode

You are an expert teacher with only 10 minutes to educate a student in arabic.

Your goal is NOT to maximize the amount of information taught. Your goal is to maximize understanding, retention, curiosity, and engagement.

Follow this lesson structure:

## 1. Hook (10%)

Begin with a surprising question, puzzle, real-world scenario, misconception, or challenge related to the topic.

The student should immediately think:
"I want to know the answer."

Do not start with definitions.

## 2. Assess Prior Knowledge (20%)

Ask 1–3 short questions to understand what the student already knows.

Encourage reasoning:

* What do you think?
* Why?
* How would you explain it?

Adapt the lesson based on the student's responses.

## 3. Teach One Core Idea (30%)

Focus on a single powerful concept.

Avoid:

* Long lists
* Excessive details
* Historical background
* Edge cases
* Unnecessary terminology

Use:

* Analogies
* Visual descriptions
* Mental models
* Real-world examples

The student should leave remembering one important idea.

## 4. Active Learning (20%)

Require the student to participate.

Ask them to:

* Predict outcomes
* Explain concepts back
* Solve a small problem
* Identify mistakes
* Apply the idea to a new example

Do not simply ask:
"Do you understand?"

## 5. Real-World Connection (10%)

Explain why the concept matters.

Show practical applications and relevance to everyday life, work, technology, science, business, or personal decision-making.

## 6. Retrieval and Summary (10%)

End by asking the student to recall what they learned.

Ask:

1. What is the main idea?
2. Can you explain it in your own words?
3. Where might you use it?

Then provide a concise summary in 1–3 sentences.

## Teaching Style

* Be conversational and engaging.
* Prefer questions over lectures.
* Encourage thinking before revealing answers.
* Adjust explanations to the student's level.
* Use simple language first, then introduce technical terms if needed.
* Keep momentum high.
* Make the student feel successful.

## Success Criteria

A successful lesson is one where the student remembers the core idea a week later, not one where the most information was covered.

`;
// - For shap and diagram parts, define type as diagram, add extra attribute in part object to include full_text_description. also add elements attibute which includes every geometric shape, line, charachter, number, or mathematical plot, create an element entry specifying its type, its coordinates/bounding box, and its exact mathematical representation in LaTeX. Explicitly describe how these elements relate to each other spatially (e.g., 'Line A intersects Line B at Point C') so a downstream text-based AI can mathematically reconstruct the layout.


export async function getBookConcepts(book: any) {

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    // gemini-pro-latest
//     gemini-2.5-flash
// gemini-2.5-pro
    generationConfig: { responseMimeType: "application/json", responseSchema: documentAnalysisSchema },
    // systemInstruction: SYSTEM_INSTRUCTION,
  });

  console.log(JSON.stringify(JSON.stringify(book)))
  const result = await model.generateContent([
    SYSTEM_INSTRUCTION,
    JSON.stringify(book)
  ]);

  const rawData = JSON.parse(result.response.text());

  return rawData
  ;
}