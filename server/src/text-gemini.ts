import { GoogleGenAI, Type, Schema } from "@google/genai";
import { WebSocket } from 'ws';
import { TEACHING_PLAN } from "./prompts/teaching-plan-4 - lines.js";
import { TextDelegate } from "./types.js";
import { getBook, tutorial1 } from "./get-book.js";
// import { DEMO_PAGE_NUMBER } from "./index.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Enforce a root schema that encapsulates your required row specifications
export const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        lines: {
            type: Type.ARRAY,
            description: "Sequenced list of dialogue nodes the AI agent will utter to the user.",
            items: {
                type: Type.OBJECT,
                properties: {
                    line: { 
                        type: Type.STRING, 
                        description: "The targeted script dialogue text statement." 
                    },
                    view: { 
                        type: Type.STRING, 
                        enum: ["textbook", "tutorial"],
                        description: "Target interface container orientation layout state."
                    },
                    step: { 
                        type: Type.NUMBER, 
                        description: "Index step tracking position integer. Include only if view equals tutorial." 
                    },
                },
                required: ["line", "view"]
            }
        }
    },
    required: ["lines"]
};

export async function initGeminiLiveText(bookId: string, wsClient: WebSocket, delegate: TextDelegate) {

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
        model: 'gemini-3.1-flash-lite',
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema, // <-- Passing the fully formed structure here
            tools: [
                {
                    functionDeclarations: [
                        {
                            name: 'updateAssessmentScore',
                            description: 'Call this function to update user assessment on a concept.',
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    conceptId: { type: Type.STRING, description: "Concept ID." },
                                    score: { type: Type.NUMBER, description: "Score from 1-10." }
                                },
                                required: ['conceptId', 'score']
                            }
                        }
                    ]
                }
            ]
        },
    });

    if (wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({ event: 'status', data: 'Connected to Gemini Text Stream!' }));
    }

    let activeAbortController: AbortController | null = null;

    return {
        write: async (text: string) => {
            try {
                if (activeAbortController) activeAbortController.abort();
                activeAbortController = new AbortController();
    
                const responseStream = await chat.sendMessageStream({ message: text, config: {systemInstruction}});
    
                let buffer = "";
                let processedItemsCount = 0;
    
                for await (const chunk of responseStream) {
                    const candidateParts = chunk.candidates?.[0]?.content?.parts;
                    const textDelta = candidateParts?.find(part => part.text)?.text || "";
    
                    console.log(chunk, JSON.stringify(chunk.candidates?.[0]?.content), textDelta)
                    if (textDelta) {
                        buffer += textDelta;
    
                        // Match structurally complete objects inside the lines array mid-stream
                        // Looks for: { "line": "...", "view": "..." }
                        const objectRegex = /\{\s*"line"[\s\S]*?\}(?=\s*,|\s*\])/g;
                        
                        let match;
                        let matchIndex = 0;
    
                        while ((match = objectRegex.exec(buffer)) !== null) {
                            matchIndex++;
                            
                            // Skip items we already processed and emitted in earlier loop iterations
                            if (matchIndex <= processedItemsCount) {
                                continue;
                            }
    
                            try {
                                const parsedItem = JSON.parse(match[0]);
                                processedItemsCount++;
    
                                delegate.onMessage({
                                    type: 'text',
                                    data: parsedItem,
                                    turnComplete: false
                                });
                            } catch (e) {
                                // Syntax fragment incomplete; skip and let the next iteration pick it up
                            }
                        }
                    }
    
                    const candidate = chunk.candidates?.[0];
                    const isLastChunk = candidate?.finishReason === 'STOP' || candidate?.finishReason != null;
    
                    if (isLastChunk) {
                        // Fallback to absolute JSON parsing on the final chunk block
                        try {
                            const finalClean = buffer.trim();
                            if (finalClean) {
                                const parsedRoot = JSON.parse(finalClean);
                                const finalLines = parsedRoot.lines || [];
    
                                // Emit any trailing elements missed by the streaming regex lookahead
                                if (finalLines.length > processedItemsCount) {
                                    for (let i = processedItemsCount; i < finalLines.length; i++) {
                                        delegate.onMessage({
                                            type: 'text',
                                            data: finalLines[i],
                                            turnComplete: i === finalLines.length - 1
                                        });
                                    }
                                } else {
                                    delegate.onMessage({ type: 'text', data: null, turnComplete: true });
                                }
                            } else {
                                delegate.onMessage({ type: 'text', data: null, turnComplete: true });
                            }
                        } catch (e) {
                            console.error("❌ Final block structural parse recovery failed:", e);
                            delegate.onMessage({ type: 'text', data: null, turnComplete: true });
                        }
                        buffer = "";
                        processedItemsCount = 0;
                    }
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('❌ Error during stream generation:', err);
                }
            } finally {
                activeAbortController = null;
            }
        },
        // ... close() ...
    };
}