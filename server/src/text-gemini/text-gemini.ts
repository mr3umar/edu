import { GoogleGenAI, Type, createPartFromFunctionResponse } from "@google/genai";
import type {
  FunctionCall,
  GenerateContentResponse,
  Part,
  PartListUnion,
  SendMessageParameters,
} from "@google/genai";
import { WebSocket } from "ws";
import { TEACHING_PLAN } from "../prompts/teaching-plan-4 - lines.js";
import { JsonLinesStreamParser } from "./JsonLinesStreamParser.js";
import { sssTool, ToolRegistry, updateAssessmentScoreTool, writeOnTextbookTool } from "./tools.js";
import type { TextDelegate, TeachingLine } from "./types.js";
import { responseSchema } from "../text-gemini.js";
import { getBook, tutorial1 } from "../get-book.js";
// import { DEMO_PAGE_NUMBER } from "../index.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const toolRegistry = new ToolRegistry([updateAssessmentScoreTool, sssTool, writeOnTextbookTool]);

/**
 * The one method of the SDK's `Chat` class that the turn-running logic
 * actually depends on. Depending on this narrow interface (rather than the
 * full `Chat` class) keeps `runConversationTurn` decoupled from the SDK and
 * lets it be exercised in isolation against a lightweight fake — `Chat`
 * itself can't be mocked structurally since it has private fields.
 */
export interface MessageStreamSender {
  sendMessageStream(params: SendMessageParameters): Promise<AsyncGenerator<GenerateContentResponse>>;
}

/**
 * Thrown internally to unwind out of a turn when it has been superseded by
 * a newer call to `write()`. Caught and swallowed in `write()`; never
 * surfaces to the caller.
 */
class TurnAbortedError extends Error {
  constructor() {
    super("Turn aborted: superseded by a newer write().");
    this.name = "TurnAbortedError";
  }
}

export async function initGeminiLiveText2(bookId: string, wsClient: WebSocket, delegate: TextDelegate) {

      let systemInstruction = TEACHING_PLAN
  
      // const book = await getBook(bookId, { schema: true })
      // book.pages.forEach(p => {
      //   delete p.words
      // })
      
      //   const page = book.pages.find((p) => p.pageNumber == DEMO_PAGE_NUMBER.value)
      //   if(page) {
      //     const section = page.sectionId ? book.sections.find(s => s.id == page.sectionId) : undefined
      //     const relatedPages = section ? book.pages.filter(p => p.sectionId == page.sectionId && p.pageNumber != page.pageNumber) : []
          
      //     const pageContent =  { 
      //         page, 
      //         relatedPages, 
      //         section: {
      //             ...section, tutorials: [{id: '001', steps: tutorial1.steps}]
      //         } 
      //     }
      
      //     systemInstruction += `\n\n Book Content: ${JSON.stringify(pageContent)}`
      //   }
        
  const chat = ai.chats.create({
    model: "gemini-3.5-flash",
    // model: "gemini-3.1-flash-lite",
    // model: "gemini-2.5-pro",
    config: {
      systemInstruction,
      // responseMimeType: "application/json",
      // responseSchema,
      tools: [
        {
          functionDeclarations: [
            // {
            //   name: 'writeOnTextbook',
            //   description: 'Call this function whenever the user asks you to write on book, or generate a graphic vector layout on book.',
            //   parameters: {
            //           type: Type.OBJECT,
            //           properties: {
            //                   svgCode: {
            //                           type: Type.STRING,
            //                           description: 'The complete, raw, standard HTML/XML SVG code string (e.g., "<svg...><circle cx=\'50\'.../></svg>"). Do not wrap it in markdown code fences or backticks.'
            //                   }
            //           },
            //           required: ['svgCode']
            //   }
            // },
            // {
            //   name: "updateAssessmentScore",
            //   description: "Call this function to update the evaluation of user's understanding of a concept. Whenever the student provides evidence of understanding, misunderstanding, confusion, progress, regression, or mastery, call the tool.",
            //   parameters: {
            //     type: Type.OBJECT,
            //     properties: {
            //       conceptId: { type: Type.STRING, description: "Concept ID." },
            //       score: { type: Type.NUMBER, description: "Score from 1-10." },
            //     },
            //     required: ["conceptId", "score"],
            //   },
            // },
          ],
        },
      ],
    },
  });

  if (wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(JSON.stringify({ event: "status", data: "Connected to Gemini!" }));
  }

  // Tracks the AbortController for the *currently active* write() call, so
  // that a new write() can cancel a still-in-flight previous one.
  let activeAbortController: AbortController | null = null;

  return {
    write: async (text: string) => {
      // Cancel any still-running previous turn before starting a new one.
      activeAbortController?.abort();
      const controller = new AbortController();
      activeAbortController = controller;

      try {
        await runConversationTurn(chat, toolRegistry, delegate, text, controller.signal);
      } catch (err) {
        if (!(err instanceof TurnAbortedError)) {
          console.error("❌ Error during stream generation:", err);
        }
      } finally {
        if (activeAbortController === controller) {
          activeAbortController = null;
        }
      }
    },
    close: () => {
      activeAbortController?.abort();
    },
  };
}

/**
 * Run a single conversational turn:
 *   1. Send `message` to Gemini and stream the response.
 *   2. As text deltas arrive, feed them into the incremental parser and
 *      emit each completed `lines[i]` object immediately.
 *   3. If the model emits a function call, stop reading the stream right
 *      away (we don't wait for `finishReason === 'STOP'`), execute every
 *      requested tool locally, and recurse with the tool results as the
 *      next turn's message — this naturally supports multiple sequential
 *      tool calls, since each recursive call can itself trigger another
 *      round of function calls before any text is ever emitted.
 *   4. Once a turn produces no function calls, drain the rest of its text
 *      and let the parser signal completion of the `lines` array, then
 *      emit `turnComplete`.
 *
 * Exported standalone (rather than nested inside `initGeminiLiveText`) and
 * parameterized over `MessageStreamSender`/`ToolRegistry`/`TextDelegate` so
 * it can be unit-tested against lightweight fakes without needing a real
 * `Chat` instance or network access.
 */
export async function runConversationTurn(
  sender: MessageStreamSender,
  toolRegistry: ToolRegistry,
  delegate: TextDelegate,
  message: PartListUnion,
  signal: AbortSignal
): Promise<void> {
  console.log(`sending`, JSON.stringify(message))
  const stream = await sender.sendMessageStream({ message });
  // const parser = new JsonLinesStreamParser();
  const pendingFunctionCalls: FunctionCall[] = [];

  // Once a function call is seen, no further text from *this* stream is
  // parsed or emitted — tool calls take priority and we stop reacting to
  // text immediately, without waiting for finishReason. However, we must
  // keep iterating the loop (without acting on anything further) until the
  // underlying stream is fully drained: the SDK's `Chat` class only
  // commits this turn into its internal conversation history once its
  // response generator runs to completion. Breaking out of the loop early
  // triggers that completion asynchronously, but does not wait for it —
  // recursing immediately afterward races ahead of the history write and
  // sends the next request (the function response) with no matching
  // function-call turn in history, which the API rejects. Draining fully
  // — cheaply, since we stop doing any real work per chunk — avoids the
  // race deterministically.
  let sawFunctionCall = false;

  for await (const chunk of stream) {
    if (signal.aborted) {
      throw new TurnAbortedError();
    }

    if (sawFunctionCall) {
      // Already committed to handling tool calls for this turn; drain
      // remaining chunks without parsing or emitting their text.
      continue;
    }

    const functionCalls = extractFunctionCalls(chunk);
    if (functionCalls.length > 0) {
      console.log(functionCalls, )
      pendingFunctionCalls.push(...functionCalls);
      sawFunctionCall = true;
      continue;
    }

    const textDelta = extractTextDelta(chunk);
    if (textDelta) {
      // parser.feed(textDelta);
      // emitCompletedLines(parser, delegate);
      delegate.onMessage({ type: "text", data: {
        content: textDelta
      }, turnComplete: false });
    }
  }

  if (pendingFunctionCalls.length > 0) {
    const responseParts = await resolveFunctionCalls(toolRegistry, pendingFunctionCalls);
    // Continue the same logical turn by sending the tool results back —
    // recurse rather than waiting for STOP, per the "tool calls have
    // higher priority than text" requirement. By this point the stream
    // above has been fully drained, so the SDK has already recorded the
    // function-call turn into history, and this next call is safe.
    return runConversationTurn(sender, toolRegistry, delegate, responseParts, signal);
  }

  // No function calls in this turn: any remaining buffered text has
  // already been emitted line-by-line above as it completed. If the
  // model's JSON happened to end without the parser ever seeing a
  // closing `]` (e.g. a malformed or truncated response), `finished()`
  // will simply be false — we still signal turnComplete so the consumer
  // isn't left hanging.
  delegate.onMessage({ type: "text", data: null, turnComplete: true });
}

/** Execute every pending tool call, in order, and build the response parts to send back. */
async function resolveFunctionCalls(toolRegistry: ToolRegistry, calls: FunctionCall[]): Promise<Part[]> {
  const responseParts: Part[] = [];
  for (const call of calls) {
    const name = call.name ?? "";
    const args = call.args ?? {};
    const result = await toolRegistry.execute(name, args);
    responseParts.push(createPartFromFunctionResponse(call.id ?? name, name, asRecord(result)));
  }
  return responseParts;
}

/** Pop every completed line object out of the parser and emit it immediately. */
function emitCompletedLines(parser: JsonLinesStreamParser, delegate: TextDelegate): void {
  while (parser.hasObject()) {
    const line = parser.nextObject<TeachingLine>();
    if (line !== null) {
      delegate.onMessage2({ type: "text", data: line, turnComplete: false });
    }
  }
}

/** Extract any function calls present in a single streamed chunk. */
function extractFunctionCalls(chunk: GenerateContentResponse): FunctionCall[] {
  return chunk.functionCalls ?? [];
}

/** Extract the text delta (if any) from a single streamed chunk's first candidate. */
function extractTextDelta(chunk: GenerateContentResponse): string {
  const parts = chunk.candidates?.[0]?.content?.parts ?? [];
  return parts.find((part): part is Part & { text: string } => typeof part.text === "string")?.text ?? "";
}

/** Narrow an unknown tool result into the `Record<string, unknown>` shape the SDK expects. */
function asRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { output: value };
}