/**
 * Shared types for the Gemini live-text streaming pipeline.
 *
 * These are intentionally separate from `JsonLinesStreamParser.ts` (which
 * knows nothing about Gemini) and from `initGeminiLiveText.ts` (which wires
 * the parser, tool execution, and the Gemini SDK together).
 */

/**
 * One element of the `lines` array in the model's structured JSON output.
 * Adjust/extend this shape to match whatever fields `TEACHING_PLAN` actually
 * instructs the model to produce per line — `line` is the only field this
 * pipeline relies on structurally; everything else passes through as-is.
 */
export interface TeachingLine {
  line: string;
  [key: string]: unknown;
}

/**
 * A single local tool that can be executed in response to a Gemini function
 * call. Keyed by `name` so the dispatcher can look tools up without a long
 * `if/else`/`switch` chain, and so adding a new tool never requires touching
 * the stream-orchestration code.
 *
 * `execute` accepts the raw argument bag Gemini provides
 * (`Record<string, unknown>`) and is responsible for validating/narrowing
 * it to its own expected shape. This keeps `LocalTool` itself non-generic
 * over the argument type, which is what allows tools with different,
 * specific argument interfaces to live together in one `LocalTool[]` array
 * without variance errors.
 */
export interface LocalTool<TResult = unknown> {
  name: string;
  execute(args: Record<string, unknown>): Promise<TResult>;
}

/**
 * Message events delivered to the consumer of `initGeminiLiveText`.
 *
 * - `{ type: 'text', data: TeachingLine, turnComplete: false }` is emitted
 *   once per completed line object, as soon as it's parsed out of the
 *   stream — never batched, never delayed until the end of the turn.
 * - `{ type: 'text', data: null, turnComplete: true }` marks the end of the
 *   model's *final* turn (i.e. after any tool-call round trips have been
 *   resolved and the model has finished streaming its `lines` response).
 */
export type TextDelegateMessage2 =
  | { type: "text"; data: TeachingLine; turnComplete: false }
  | { type: "text"; data: null; turnComplete: true };

/**
 * The delegate interface the orchestration logic reports to. This mirrors
 * the shape already used by the existing `TextDelegate` type (imported from
 * `./types.js` in the original implementation) — defined here explicitly so
 * this module is self-contained and easy to test in isolation.
 */
export interface TextDelegate {
  onMessage: (msg: {type: string, data?: {content: string} | null, turnComplete: boolean}) => void
  onMessage2(message: TextDelegateMessage2): void;
}