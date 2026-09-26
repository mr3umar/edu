
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // 1. Import fileURLToPath
import { streamAudioToGemini } from './audio-service.js';
import { getBook } from './get-book.js';
import './server.js';
import './logger.js';
import './index-new.js'

export const BOOKS_URL = process.env.BOOKS_URL

export let CURRENT_PAGE_NUMBER: {value?: string} = {
  // value: "9"
}
// export let DEMO_PAGE_NUMBER: {value: string} = {
//   // value: "12" // math
//   value: "10" // english
//   // value: "11" // math-06-mawhibah
// }
export let DEMO_BOOK_ID: {value?: string} = {
  // value: "math-05-1"
  // value: "english-med-1-1",
  // value: "math-06-mawhibah",
}
// 2. Recreate __filename and __dirname manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5001;

app.use(cors());
// Increase limits so you can receive raw audio uploads from your web app
app.use(express.json({ limit: '50mb' })); 
app.use(express.raw({ type: 'audio/*', limit: '50mb' }));

// Endpoint that processes incoming audio and returns Gemini's audio response
app.post('/api/process-audio', async (req, res) => {
  try {
    // For testing, assuming the frontend sends raw binary audio data directly in the request body
    const incomingAudioBuffer = req.body;

    if (!incomingAudioBuffer || incomingAudioBuffer.length === 0) {
       res.status(400).json({ error: 'No audio data received in the body.' });
       return;
    }

    console.log(`🎙️ Received audio buffer (${incomingAudioBuffer.length} bytes). Contacting Gemini...`);

    // Call our streaming audio service
    const geminiAudioBuffer = await streamAudioToGemini(incomingAudioBuffer, 'audio/wav');

    // Scenario A: Save to File System (fs)
    const outputPath = path.join(__dirname, '../output_response.wav');
    await fs.promises.writeFile(outputPath, geminiAudioBuffer);
    console.log(`💾 Successfully cached copy locally to disk at: ${outputPath}`);

    // Scenario B: Stream back over HTTP response
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', 'attachment; filename="gemini_reply.wav"');
    res.send(geminiAudioBuffer);

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Audio Processing Error' });
  }
});


app.get('/book/:book_id', async (
  req,
  res
): Promise<void> => {

  console.log(`Downloading book..`)
  const { book_id } = req.params;

  res.setHeader("Content-Type", "application/json");

  const book = await getBook(book_id, {schema: true})
  
  res.end(JSON.stringify(book))

})


// app.post('/book/:bookId/current-page/:pageNumber', async (
//   req,
//   res
// ): Promise<void> => {

//   const { pageNumber } = req.params;

//   CURRENT_PAGE_NUMBER.value = pageNumber
//   res.setHeader("Content-Type", "application/json");

//   res.end()

// })

app.get('/book/:book_id/:page_id', (
  req,
  res
): void => {
  console.log(`Downloading page..`)
  const { book_id, page_id } = req.params;

  // 1. Construct the absolute path to the image
  // Adjust 'uploads', 'books' to match your actual folder structure
  const imageDirectory = path.join(__dirname, '..', 'books', 'images', book_id);
  const imageName = `${book_id}.${page_id}.png`; // Or .png, depending on your setup
  const fullPath = path.join(imageDirectory, imageName);

  // 2. Security Check: Prevent Directory Traversal Attacks
  // Ensures the resolved path stays inside the intended directory
  if (!fullPath.startsWith(path.join(__dirname, '..', 'books'))) {
    res.status(400).json({ error: 'Invalid path request' });
    return;
  }

  // 3. Check if the file exists before attempting to download
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: 'Book page image not found' });
    return;
  }

// 1. Explicitly set the content type so the browser knows it's an image
  // (Change to 'image/png' if your files are PNGs)
  res.setHeader('Content-Type', 'image/jpeg');

  // 2. Set Content-Disposition to 'inline' instead of 'attachment'
  res.setHeader('Content-Disposition', 'inline');

  // 3. Send the file directly to the browser view
  res.sendFile(fullPath, (err) => {
    if (err) {
      if (res.headersSent) {
        return;
      }
      res.status(500).json({ error: 'Could not display the image.' });
    }
  });
});
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
