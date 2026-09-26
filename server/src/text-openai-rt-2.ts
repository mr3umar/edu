import OpenAI from "openai";
import { ResponsesWS } from "openai/resources/responses/ws";
import { TEACHING_PLAN } from "./prompts/teaching-plan-4 - lines.js";
import { TextDelegate } from "./types.js";

export interface GPT5SocketDelegate {
  onMessage(message: string): void;
  onError?(error: unknown): void;
}
export class GPT5Socket {
        private readonly socket: ResponsesWS;
        private previousResponseId?: string;
      
        constructor(
          private readonly delegate: TextDelegate,
          private instructions: string,
          private readonly model = "gpt-5",
        ) {
          const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });
      
          this.socket = new ResponsesWS(client);
      
          this.registerEvents();
        }
      
        private registerEvents(): void {
          this.socket.on("response.output_text.delta", (event) => {
            
                this.delegate.onMessage({
                        type: 'text',
                        data: { content: event.delta },
                        turnComplete: false,
                })
          });
      
          this.socket.on("response.completed", (event) => {
            this.previousResponseId = event.response.id;
            this.delegate.onMessage({
                    type: 'text',
                    data: { content: '' },
                    turnComplete: true,
            })
          });
      
          this.socket.on("error", (error) => {
        //     this.delegate.onError?.(error);
            console.error(error);
          });
        }
      
        sendMessage(text: string, role: 'system' | 'user'): void {
                if(role == 'system') {
                        this.instructions += `\n\n${text}`
                        return
                }
          this.socket.send({
            type: "response.create",
            model: this.model,
            instructions: this.instructions,
            previous_response_id: this.previousResponseId,
            input: text,
            stream: true,
            reasoning: {
                effort: 'low'
            }
          });
        }
      
        close(): void {
          this.socket.close();
        }
      }