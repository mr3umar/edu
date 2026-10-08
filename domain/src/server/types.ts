
export type BoardContentType = "general" | "simpleDivision" | "longDivision" | "longMultiplication" | "columnArithmetic" | "polynomialDivision" | "syntheticDivision" | "numberLine" | "coordinateGraph" | "geometryDiagram" | "factorTree" | "probabilityTree"
  export type AgentLine = {
    stepId: string;
    lang: string;
    textToSay: string;
    boardContent?: {
        type: BoardContentType,
        richHtmlWithSVGAndMathML: string;
    };
  };