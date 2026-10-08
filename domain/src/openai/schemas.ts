import z from "zod";

export const DocumentTeachingSchema = z.object({
        steps: z.array(
            z.object({
                stepId: z.string().describe(`random unique id for this step.`),
                lang: z.string().describe(`language of the content of textToSay in ISO 639-1 code (e.g. 'ar', 'en', 'fr').`),
                textToSay: z.string().describe('text only ready for text-to-speach.'),
                // richHtmlAndSvgForBoard: z.string().nullable().describe("to write to the board with rich html/svg/MathML content, or 'null' if no visual is needed. board dimensions: width: 400px, height: 250px." ),
    
    
                boardContent: z.object({
                    type: z.enum([
                        "general",
                        "simpleDivision",
                        "longDivision",
                        "longMultiplication",
                        "columnArithmetic",
                        "polynomialDivision",
                        "syntheticDivision",
                        "numberLine",
                        "coordinateGraph",
                        "geometryDiagram",
                        "factorTree",
                        "probabilityTree"
                    ]).describe(
                        "Identifies what the board content represents. Use the most specific applicable type; use general only when no specialized type applies. Specialized types include 'longDivision', 'longMultiplication', 'columnArithmetic', 'polynomialDivision', 'syntheticDivision', 'numberLine', 'coordinateGraph', 'geometryDiagram', 'factorTree', and 'probabilityTree'."
                    ),
    
                    richHtmlWithSVGAndMathML: z.string().describe(
                        "Rich html content inside root div, sized for a 400px × 250px board. Include inline SVG when shapes or diagrams are needed, and use MathML (<math>...</math>) for all mathematical expressions and notation."
                    )
                }).nullable().describe(
                    "Visual content for the board, or null when no visual is needed."
                ),
            })
      ).describe('split the response to lines.'),
      options: z.array(
          z.string()
      ).nullable().describe("optional array for user to choose. array of simple html elemnt with span root element. Use MathML if need to represent mathematical expressions.")
    });
    
    export const DocumentOptionsSchema = z.object({
      options: z.array(
          z.string()
      ).nullable().describe("array of simple html elemnt with span root element. Use MathML if need to represent mathematical expressions.")
    });