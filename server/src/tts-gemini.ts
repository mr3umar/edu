import { GoogleGenAI } from "@google/genai";
import { WebSocket } from 'ws';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

let streamSeq = -1
export async function initGeminiTTS(wsClient: WebSocket, textToken: string, wordsIds: string[]) {
        streamSeq++;
        try {
                console.log(`🗣️ Dispatching line to Gemini TTS: "${textToken.trim()}"`);

                const interaction = await ai.models.generateContentStream({
                        model: "gemini-3.1-flash-tts-preview",
                        // model: "gemini-2.5-flash-preview-tts",
                        contents: [{
                        role: "user",
                        parts: [{ text: textToken }] 
                        }],
                        config: {
                        responseModalities: ["audio"],
                        speechConfig: {
                                voiceConfig: {
                                        prebuiltVoiceConfig: { voiceName: "Zephyr" }
                                }
                        }
                        }
                });

                let chunkSeq = -1
                for await (const chunk of interaction) {
                        
                        const audioContent = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData;
                        if (audioContent && audioContent.data) {
                                if (wsClient.readyState === WebSocket.OPEN) {
                                        chunkSeq++;
                                        wsClient.send(JSON.stringify({
                                        event: 'audio',
                                        data: audioContent.data,
                                        wordsIds,
                                        seq: chunkSeq,
                                        streamId: `${streamSeq}`
                                        }));
                                }
                        }
                }
                } catch (err: any) {
                if (err.name !== 'AbortError') {
                        console.error('❌ Gemini 3.1 TTS error:', err);
                }
                }
}