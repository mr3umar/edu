import WebSocket from "ws";
import { TextDelegate } from "./types.js";
import { getBook, tutorial1 } from "./get-book.js";
import { TEACHING_PLAN } from "./prompts/teaching-plan-4 - lines.js";

export interface OpenAITool {
  type: "function";
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

interface SendMessageOptions {
  onText?: (text: string) => void;
}

export class OpenAIRealtimeClient {
  private ws: WebSocket | null = null;
  private connected = false;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly tools: OpenAITool[];

  constructor(options: {
    apiKey: string;
    model?: string;
    tools?: OpenAITool[];
  }, private delegate: TextDelegate, private bookId: string) {
    this.apiKey = options.apiKey;
//     this.model = options.model ?? "gpt-realtime";
    this.model = options.model ?? "gpt-realtime-2.1";
    this.tools = options.tools ?? [];
  }

  async connect(): Promise<void> {
        if (this.connected) {
          return;
        }
      
        return new Promise((resolve, reject) => {
          const url =
            `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(
              this.model
            )}`;
      
          this.ws = new WebSocket(url, {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
          });
      
          this.ws.on("open", async () => {
            this.connected = true;
      
            console.log("OpenAI Realtime connected");
      
        const book = await getBook(this.bookId, { schema: true })
        book.pages.forEach(p => {
          delete p.words
        })

        //       const p = book.pages.find(p => p.pageNumber == DEMO_PAGE_NUMBER.value)
        //       const section = book.sections.find(s => s.id == p.sectionId)
        //       console.log(p)
        //       // textStream.write(JSON.stringify({pages: [p], sections: [{
        //       //   ...section,
        //       //   tutorials: [{id: '001', steps: tutorial1.steps}]
        //       // }]}))
        //        const pageContent = JSON.stringify({pages: [p], sections: [{
        //         ...section,
        //         tutorials: [{id: '001', steps: tutorial1.steps}]
        //       }]})

            this.send({
              type: "session.update",
      
              session: {
                type: "realtime",
      
                // IMPORTANT
                output_modalities: ["text"],
      
                instructions: TEACHING_PLAN,
      
                tools: this.tools,
                tool_choice: "auto",
              },
            });
      
            resolve();
          });
      
          this.ws.on("message", (data: WebSocket.RawData) => {
            const event = JSON.parse(data.toString());
      
            this.handleEvent(event);
          });
      
          this.ws.on("error", (error) => {
            console.error("OpenAI WebSocket error:", error);
      
            if (!this.connected) {
              reject(error);
            }
          });
      
          this.ws.on("close", () => {
            this.connected = false;
            this.ws = null;
          });
        });
      }

  private handleEvent(event: any): void {
        // console.log("AI:", JSON.stringify(event));
    switch (event.type) {
      case "session.created":
        console.log("Session created:", event.session.id);
        break;

      case "response.output_text.delta":
        if (event.delta) {
          this.delegate.onMessage({
                type: 'text',
                data: { content: event.delta },
                turnComplete: false,
          })
        }
        break;

      case "response.function_call_arguments.done":
        this.handleFunctionCall(event);
        break;

      case "response.done":
        console.log("Response completed");
        this.delegate.onMessage({
                type: 'text',
                data: { content: '' },
                turnComplete: true,
        })
        break;

      case "error":
        console.error("OpenAI error:", event.error);
        break;

      default:
        // Useful while developing
        // console.log("OpenAI event:", event.type);
        break;
    }
  }
  async sendMessage(
        text: string,
        role: 'user' | 'system',
        options?: SendMessageOptions,
      ): Promise<void> {
        if (!this.connected || !this.ws) {
          throw new Error("OpenAI Realtime is not connected");
        }
        if(role == 'system') {
                this.send({
                        type: "session.update",
                      
                        session: {
                                type: "realtime",

                          instructions: `${TEACHING_PLAN}\n\n\n Book content: \n${text}`,
                          output_modalities: ["text"],
                      
                          tools: this.tools,
                          tool_choice: "auto",
                        },
                      });
                      return
        }
      
        this.send({
          type: "conversation.item.create",
      
          item: {
            type: "message",
            role,
      
            content: [
              {
                type: "input_text",
                text,
              },
            ],
          },
        });
      
        this.send({
          type: "response.create",
        });
      }

  private async handleFunctionCall(event: any): Promise<void> {
    const callId = event.call_id;
    const name = event.name;

    let args: Record<string, unknown>;

    try {
      args = JSON.parse(event.arguments);
    } catch {
      args = {};
    }

    console.log("Function:", name);
    console.log("Arguments:", args);

    try {
      const result = await this.executeFunction(name, args);

      this.send({
        type: "conversation.item.create",

        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify(result),
        },
      });

      // Ask the model to continue
      this.send({
        type: "response.create",
      });
    } catch (error) {
      this.send({
        type: "conversation.item.create",

        item: {
          type: "function_call_output",
          call_id: callId,

          output: JSON.stringify({
            error:
              error instanceof Error
                ? error.message
                : String(error),
          }),
        },
      });

      this.send({
        type: "response.create",
      });
    }
  }

  private async executeFunction(
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    switch (name) {
      case "get_weather":
        return {
          city: args.city,
          temperature: 35,
        };

      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  private send(event: Record<string, unknown>): void {
    if (!this.ws || !this.connected) {
      throw new Error("WebSocket is not connected");
    }

    this.ws.send(JSON.stringify(event));
  }

  disconnect(): void {
    this.ws?.close();

    this.ws = null;
    this.connected = false;
  }
}