import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the Google Gen AI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Sends an input audio buffer to Gemini and collects the real-time audio response stream.
 * @param inputAudioBuffer - The raw PCM or WAV audio buffer from the client
 * @param mimeType - The format of the incoming audio (e.g., 'audio/wav' or 'audio/mp3')
 * @returns A promise resolving to a single Buffer containing the complete output audio response
 */
export async function streamAudioToGemini(
  inputAudioBuffer: Buffer,
  mimeType: string = 'audio/wav'
): Promise<Buffer> {
  try {
    // 1. Convert the buffer to the inline data format required by the Gen AI SDK
    const audioPart = {
      inlineData: {
        data: inputAudioBuffer.toString('base64'),
        mimeType: mimeType,
      },
    };

    // 2. Request a streaming multimodal response
    // We request the model to reply explicitly with speech audio
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: [
        audioPart,
        'Listen to this audio. Reply to it directly using spoken audio voice output.',
      ],
      config: {
        // Requesting audio/wav response format instructs Gemini to output voice stream parts
        responseMimeType: 'audio/wav',
      },
    });

    const audioChunks: Buffer[] = [];

    // 3. Process the stream chunks as they arrive from Google's servers
    for await (const chunk of responseStream) {
      // Extract binary data parts if available in the multimodal response chunk
      const candidates = chunk.candidates;
      if (candidates && candidates[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
          // Check if the streaming part contains inline binary audio data
          if (part.inlineData && part.inlineData.data) {
            const base64Data = part.inlineData.data;
            const binaryBuffer = Buffer.from(base64Data, 'base64');
            audioChunks.push(binaryBuffer);
          }
        }
      }
    }

    if (audioChunks.length === 0) {
      throw new Error('Gemini processed the request but did not return any audio stream chunks.');
    }

    // 4. Combine all collected stream chunks into one final buffer
    return Buffer.concat(audioChunks);

  } catch (error) {
    console.error('Error during Gemini Audio Realtime Streaming:', error);
    throw error;
  }
}
