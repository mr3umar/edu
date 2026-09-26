import * as dotenv from 'dotenv';
import * as fs from 'fs'; // 📁 Native File System integration
import * as path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { createAiSession } from './ai-session.js';
import { CryptoUtil } from './common/crypto.js';
import { CLOUD_PUBLIC_KEY } from './keys/index.js';
import { AccessKeyData } from './cloud/types.js';

dotenv.config();

const wss = new WebSocketServer({ port: 8080 });

console.log('🚀 Realtime Audio WebSocket proxy server running on ws://localhost:8080');

// export const MAX_OUTPUT_TOKENS = 1000; // was used as it would help to split output so whne user inturupt so to optimize cost but when it reaches, ai agent does not produce another sentence, it just stop.



wss.on('connection', async (wsClient: WebSocket) => {
  console.log('📱 Frontend browser client connected.');

  // let lastPageNumber = CURRENT_PAGE_NUMBER
  let notifyPageNumber = false

  // 🎙️ 📁 CREATE UNIQUE RAW AUDIO WRITE STREAM PER CONNECTION DESK
  // This saves files locally inside your backend/ directory
  const recordingFileName = `mic_record.pcm`;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const recordingFilePath = path.join(__dirname, '../', recordingFileName);
  const fileWriteStream = fs.createWriteStream(recordingFilePath);



  // - CRITICAL ASSIGNMENT: Immediately before you speak about any reference part, you MUST call the "setActiveReference" tool and pass the part IDs in its arguments. 
  // If you want to discuss multiple parts, pass them all together inside the ids string array. 
  // Never start speaking about a part until after you execute the tool call.
  // # Show Laser on book:
  // - Call tool showLaser before you reading each word from book.
  // - showLaser tool, help user track the part you are reading.

  // const book = await getBook("math-05-1", { schema: true })
  // book.pages.forEach(p => {
  //   delete p.words
  // })


  // const voiceAiSession = await initGeminiLive(wsClient, delegate);
  // const voiceAiSession = await initOpenAILive(wsClient, delegate)


  const tagRegex1 = /\[word\s+id="([^"]+)"\s+x="([^"]+)"\s+y="([^"]+)"\s+width="([^"]+)"\s+height="([^"]+)"\](.*?)\[\/word\]/g;
  const tagRegex2 = /\[word\s+id="([^"]+)"\s\](.*?)\[\/word\]/g;

  // const tagRegex = /\[word\s+([^\]]+)\](.*?)\[\/word\]/g;
  const tagRegex = /\[word\s+([^\]]+)\]([\s\S]*?)\[\/word\]/g;
  const labelTagRegex = /\[label\s+([^\]]+)\]([\s\S]*?)\[\/label\]/g;
  const tagOptionRegex = /\[option\s*([^\]]*)\]([\s\S]*?)\[\/option\]/g;
  // const optionRegexWithPrefix = /(?:^|\s)?(?:\d+[\.\-)]?|[•*+\-])?\s*\[option\s*([^\]]*)\]([\s\S]*?)\[\/option\]/g;
  const optionRegexWithPrefixAndXmlTag =   /(?:^|\s)?(?:\d+[\.\-)]?|[•*+\-])?\s*(?:\[option\s*|<option\s*)([^\]>]*)(?:\]|>)([\s\S]*?)(?:\[\/option\]|<\/option>)/g;
  const attrRegex = /(\w+)=(?:\\)?"([^"]+)"/g;

  // Instantiate our generic queue helper, feeding it the task-specific Gemini logic

  // const ttsAI = {
  //   send: async (text: string, wordsIds: string[], signal: AbortSignal) => {
  //     await initOpenAITTS(wsClient, text, wordsIds, signal)
  //   }
  // }
  // const close = async () => {
  //   console.log('🛑 Closing Gemini TTS Service pipeline.');

  //   // 1. Flush the remaining text out
  //   streamQueueSingle.flushRemaining();

  //   // 2. Wait for the audio streams currently running to complete cleanly
  //   await streamQueueSingle.waitForCompletion();

  //   // 3. Terminate everything and clean up memory structures
  //   streamQueueSingle.cancel();
  // }

  

  // const textAi = new OpenAIRealtimeClient({
  //   apiKey: process.env.OPENAI_API_KEY!,

  // }, {
  //   onMessage: (msg) => {
  //     streamQueue.push((msg.data?.content ?? '') + (msg.turnComplete ? '\n' : ''))
  //   },
  //   callTool: async () => {
  //     return {succeed: true}
  //   }
  // })
  // await textAi.connect()

  // const llm = new GPT5Socket({
  //   onMessage: (msg) => {
  //     console.log("GPT:", msg.data?.content);
  //     streamQueue.push((msg.data?.content ?? '') + (msg.turnComplete ? '\n' : ''))
  //   },

  //   // onError: (error) => {
  //   //   console.error("GPT error:", error);
  //   // },
  //   callTool: async () => {
  //     return {succeed: true}
  //   }
  // }, TEACHING_PLAN);


  // const p = book.pages.find(p => p.pageNumber == DEMO_PAGE_NUMBER.value)
  // const section = book.sections.find(s => s.id == p.sectionId)
  // console.log(p)
  // textStream.write(JSON.stringify({pages: [p], sections: [{
  //   ...section,
  //   tutorials: [{id: '001', steps: tutorial1.steps}]
  // }]}))
  // textAi.sendMessage(JSON.stringify({pages: [p], sections: [{
  //   ...section,
  //   tutorials: [{id: '001', steps: tutorial1.steps}]
  // }]}), 'system')
  // llm.sendMessage(JSON.stringify({pages: [p], sections: [{
  //     ...section,
  //     tutorials: [{id: '001', steps: tutorial1.steps}]
  //   }]}), 'system')

  // setTimeout(() => {
  // delegate.writeOnBook("<svg xmlns='http://www.w3.org/2000/svg' width='637' height='821'><text x='465' y='525' font-size='18' fill='red'>الرقم ٧ في منزلة عشرة آلاف، لذا قيمته المكانية هي سبعة آلاف.</text></svg>")
  // delegate.writeOnBook("<svg xmlns='http://www.w3.org/2000/svg' width='637' height='821'><text x='465' y='525' font-size='18' fill='red'>الرقم ٧ في منزلة عشرة آلاف، لذا قيمته المكانية هي سبعة آلاف.</text></svg>")

  // }, 5000)
  //   setTimeout(() => {

  //   wsClient.send(JSON.stringify({
  //     event: 'showLaser',
  //     wordsIds: ["31"],
  // }));

  //   }, 5000)


  // Listen for continuous raw microphone buffer chunks sent from the frontend
  // wsClient.on('message', async (messageData: string) => {
  //   try {
  //     const packet = JSON.parse(messageData.toString());

  //     if (packet.event === 'audio' && geminiSession) {
  //       // const base64MicChunk = packet.data;

  //       // // console.log(`Sending voice to Gemini`)
  //       // // Stream the chunk straight up to Gemini Live API instance
  //       // await geminiSession.sendRealtimeInput({
  //       //   audio: {
  //       //         mimeType: 'audio/pcm;rate=16000',
  //       //         data: base64MicChunk
  //       //       },
  //       // });


  //     const base64Chunk = packet.data;
  //     const rawAudioBuffer = Buffer.from(base64Chunk, 'base64');

  //     // 🧠 2. COST OPTIMIZATION: ACOUSTIC ENERGY GATEWAY (VAD FILTER)
  //     // We read the raw Int16 binary bytes directly from the audio chunk buffer
  //     const int16Array = new Int16Array(
  //       rawAudioBuffer.buffer, 
  //       rawAudioBuffer.byteOffset, 
  //       rawAudioBuffer.byteLength / 2
  //     );

  //     let totalAbsoluteEnergy = 0;
  //     for (let i = 0; i < int16Array.length; i++) {
  //       totalAbsoluteEnergy += Math.abs(int16Array[i]);
  //     }
  //     // Calculate the average volume/amplitude level of this specific packet chunk
  //     const averageChunkVolume = totalAbsoluteEnergy / int16Array.length;

  //     // 🚀 THE SAFETY VALVE THRESHOLD:
  //     // An average volume level below 25 means pure room silence or background static.
  //     // Dropping these silent packets prevents them from reaching Google, cutting token costs!

  //     if (averageChunkVolume < 25) {
  //       // Drop the packet locally on our server without forwarding it upstream
  //       return; 
  //     }

  //     console.log(`averageChunkVolume: ${averageChunkVolume}`)

  //       console.log(`Sending voice to Gemini`)

  //     // 3. Only send the packet if valid human speech activity or sound is detected
  //     await geminiSession.sendRealtimeInput({
  //         audio: {
  //               mimeType: 'audio/pcm;rate=16000',
  //               data: base64Chunk
  //             },
  //     });
  //     }
  //   } catch (err) {
  //     console.error('Error handling packet payload from frontend:', err);
  //   }
  // });
  // 🧠 Add these state tracking variables at the top of your connection block:
  let lastActiveSpeechTimestamp = 0;
  const HANGOVER_PADDING_MS = 3000; // Keep channel open for 400ms after volume drops

  // 🚀 Replace your wsClient.on('message') handler with this version:

  const aiSessions: {[key: string]: Awaited<ReturnType<typeof createAiSession>>} = {}

  wsClient.on('message', async (messageData: string) => {
    try {
      const packet = JSON.parse(messageData.toString());

      if(!packet.accessToken) {
        console.warn(`UNAUTHRIZED: missing accessToken in socket.packet`)
        return
      }

      let accessKeyData: AccessKeyData | undefined
      try {
        accessKeyData = CryptoUtil.verifyPayload(packet.accessToken, CLOUD_PUBLIC_KEY);
      }
      catch(err) {
        console.warn(`UNAUTHRIZED: invalid socket.packet.accessToken`)        
        return
      }
      if(!accessKeyData?.ownerId) {
        console.warn(`UNAUTHRIZED: missing ownerId in socket.packet.accessToken`)
        return
      }

      if(!aiSessions[accessKeyData.ownerId]) {
        aiSessions[accessKeyData.ownerId] = await createAiSession(wsClient)
      }
      const aiSession = aiSessions[accessKeyData.ownerId]

    
      aiSession.handleMsg(packet)
      
    } catch (err) {
      console.error('Error handling data frame coming from client web window:', err);
    }
  });

  wsClient.on('close', () => {
    console.log('📱 Frontend client disconnected.');
    // if (voiceAiSession) {
    //   voiceAiSession.close();
    // }
  });

});




// Define the interface matching your document structure
interface DocumentPart {
  seq_id: number;
  id: string;
  parent_id: string | null;
  type: string;
  label: string;
  content: string;
  coordinates: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
  };
}

/**
 * Finds a target part and recurses downward to collect all of its nested children.
 * 
 * @param partId - The ID of the parent part to search for
 * @param allParts - The full flat database array of document elements
 * @returns A flat array containing the parent element and all its nested sub-parts
 */
export function getPartWithNestedChildren(partId: string, allParts: DocumentPart[]): DocumentPart[] {
  const resultList: DocumentPart[] = [];

  // 1. Locate the requested parent object node inside the dataset pool
  const targetParent = allParts.find(part => part.id === partId);

  if (!targetParent) {
    console.warn(`⚠️ Part with ID "${partId}" was not found in the dataset.`);
    return [];
  }

  // 2. Add the parent node itself as the first index in our tracking array
  resultList.push(targetParent);

  // 3. Define an internal recursive function to sweep downward through child layers
  function collectDescendants(currentParentId: string) {
    // Locate all items whose parent_id points to our active node
    const immediateChildren = allParts.filter(part => part.parent_id === currentParentId);

    for (const child of immediateChildren) {
      resultList.push(child);

      // Recurse downward immediately to catch any nested grandchildren/sub-parts
      collectDescendants(child.id);
    }
  }

  // 4. Start the recursive extraction engine
  collectDescendants(partId);

  return resultList;
}


/**
 * Traverses up the hierarchy tree to find the ancestor element with type = "question".
 * If the starting part itself is a "question", it returns its own ID.
 * 
 * @param partId - The ID of the starting part
 * @param allParts - The full flat array of document elements
 * @returns The ID of the question parent, or null if no question ancestor exists
 */
export function getQuestionParentId(partId: string, allParts: DocumentPart[]): string | null {
  // 1. Find the starting element
  let currentPart = allParts.find(part => part.id === partId);

  if (!currentPart) {
    console.warn(`⚠️ Part with ID "${partId}" was not found in the dataset.`);
    return null;
  }

  // 2. Walk up the tree using parent_id references
  while (currentPart) {
    // If the current node we are inspecting is a question, we have found our target!
    if (currentPart.type === "question") {
      return currentPart.id;
    }

    // If there is no parent_id, we have hit the top root of the tree without finding a question
    if (!currentPart.parent_id) {
      break;
    }

    // Move up to the next parent element in the hierarchy
    currentPart = allParts.find(part => part.id === currentPart!.parent_id);
  }

  console.warn(`ℹ️ No ancestor with type "question" was found for part ID "${partId}".`);
  return null;
}
