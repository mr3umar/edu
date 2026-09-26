import type { LocalTool } from "./types.js";

/**
 * Executes locally-implemented tools by name. Kept entirely separate from
 * the streaming/parsing pipeline: this module knows nothing about Gemini's
 * SDK types, the JSON-lines parser, or WebSocket delivery — it only knows
 * how to run a named tool against a bag of arguments.
 */
export class ToolRegistry {
  private readonly tools: Map<string, LocalTool>;

  constructor(tools: LocalTool[]) {
    this.tools = new Map(tools.map((tool) => [tool.name, tool]));
  }

  /**
   * Run the named tool. Throws if the tool is unknown, mirroring the
   * original implementation's behavior of failing loudly on an
   * unrecognized function call rather than silently swallowing it.
   */
  public async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return tool.execute(args);
  }
}

/**
 * The concrete tool set used by the teaching assistant. Defined here,
 * separate from both the registry mechanism and the stream orchestration,
 * so new tools can be added without touching either.
 */
/**
 * Documents the expected shape of `updateAssessmentScore`'s arguments. Not
 * used directly in `LocalTool`'s signature (which takes the raw
 * `Record<string, unknown>` bag from Gemini) — `execute` below narrows to
 * this shape internally.
 */
export interface UpdateAssessmentScoreArgs {
  conceptId: string;
  score: number;
}

export interface UpdateAssessmentScoreResult {
  status: "success";
}

export const updateAssessmentScoreTool: LocalTool<UpdateAssessmentScoreResult> = {
  name: "updateAssessmentScore",
  async execute(args: Record<string, unknown>): Promise<UpdateAssessmentScoreResult> {
    const conceptId = String(args.conceptId);
    const score = Number(args.score);
    console.log(`\n🛠️ Executing tool [updateAssessmentScore]:`, { conceptId, score });
    return {
      status: "success",
    };
  },
};

export const sssTool: LocalTool<UpdateAssessmentScoreResult> = {
  name: "sss",
  async execute(args: Record<string, unknown>): Promise<UpdateAssessmentScoreResult> {
    const conceptId = String(args.conceptId);
    const score = Number(args.score);
    console.log(`\n🛠️ Executing tool [updateAssessmentScore]:`, { conceptId, score });
    return {
      status: "success",
    };
  },
};
export const writeOnTextbookTool: LocalTool<UpdateAssessmentScoreResult> = {
  name: "writeOnTextbook",
  async execute(args: Record<string, unknown>): Promise<UpdateAssessmentScoreResult> {
    const svgCode = String(args.svgCode);
    console.log(`\n🛠️ Executing tool [writeOnTextbook]:`, { svgCode });
    return {
      status: "success",
    };
  },
};