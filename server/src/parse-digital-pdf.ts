// import * as pdfjs from 'pdfjs-dist';
// import * as path from 'path';

// // Point pdfjs to its bundled modern parsing worker script natively
// import { fileURLToPath } from 'url';
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Configure the required background worker API module
// const pdfjsWorkerPath = path.join(__dirname, '../../node_modules/pdfjs-dist/build/pdf.worker.mjs');
// pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerPath;

// export interface ExtractedArabicText {
//   text: string;
//   x: number;
//   y: number;
//   w: number;
//   h: number;
//   fontSize: number;
// }

// /**
//  * Extracts crisp, non-corrupted Arabic text string layouts from a digital native PDF.
//  * Natively resolves CMap font mappings and handles Right-to-Left character paths.
//  */
// export async function parseArabicPDFCoordinates(filePath: string): Promise<ExtractedArabicText[]> {
//   try {
//     // 1. Load the target PDF document binary array into memory
//     const loadingTask = pdfjs.getDocument(filePath);
//     const pdfDocument = await loadingTask.promise;
//     const extractedElements: ExtractedArabicText[] = [];

//     // 2. Read through the file pages consecutively
//     for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
//       const page = await pdfDocument.getPage(pageNum);
      
//       // Extract the raw layout text tokens content map
//       const textContent = await page.getTextContent();
//       const viewport = page.getViewport({ scale: 1.0 });

//       for (const item of textContent.items) {
//         // Ensure we are working with standard text geometry items
//         if ('str' in item) {
//           const rawString = item.str.trim();
//           if (!rawString) continue;

//           // 📐 RESOLVE THE CANVAS MATRIX COORDINATES
//           // item.transform holds: [scaleX, skewY, skewX, scaleY, transformX, transformY]
//           const transform = item.transform;
//           const fontSize = Math.abs(transform[3]);
          
//           // Convert internal PDF matrix space directly to scalable viewport pixels
//           const [pixelX, pixelY] = viewport.transform([transform[4], transform[5]]);

//           extractedElements.push({
//             text: rawString,
//             x: Number(pixelX.toFixed(2)),
//             // PDFs compute Y from the bottom up; we invert it to match normal screen layouts
//             y: Number((viewport.height - pixelY).toFixed(2)), 
//             w: Number(item.width.toFixed(2)),
//             h: Number(item.height.toFixed(2)),
//             fontSize: Number(fontSize.toFixed(1))
//           });
//         }
//       }
//     }

//     console.log(`✅ [Font Engine Resolved] Successfully unpacked ${extractedElements.length} clean text nodes.`);
//     return extractedElements;

//   } catch (error) {
//     console.error('❌ Failed to extract Arabic fonts cleanly:', error);
//     throw error;
//   }
// }
