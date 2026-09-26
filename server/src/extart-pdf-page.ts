import * as fs from 'fs';
import { PDFDocument } from 'pdf-lib';

interface ExtractPageOptions {
  sourcePdfPath: string;
  pageNumber: number; // 1-indexed (e.g., Page 1, Page 2)
}

/**
 * Extracts a single page from a PDF and saves it to a new file.
 * * @param options - Object containing source path, destination path, and the target page number.
 */
export async function extractSinglePdfPage({
  sourcePdfPath,
  pageNumber
}: ExtractPageOptions) {
  try {
    // 1. Validate inputs
    if (!fs.existsSync(sourcePdfPath)) {
      throw new Error(`Source PDF not found at: ${sourcePdfPath}`);
    }
    if (pageNumber < 1) {
      throw new Error('Page number must be 1 or greater.');
    }

    // 2. Load the existing PDF document
    const existingPdfBytes = fs.readFileSync(sourcePdfPath);
    const srcPdfDoc = await PDFDocument.load(existingPdfBytes);

    // 3. Check if requested page exists (pdf-lib uses 0-indexed arrays internally)
    const totalPages = srcPdfDoc.getPageCount();
    if (pageNumber > totalPages) {
      throw new Error(`Requested page ${pageNumber} exceeds total document pages (${totalPages}).`);
    }

    // 4. Create a brand new PDF document
    const newPdfDoc = await PDFDocument.create();

    // 5. Copy the specific page from the source document into the new document
    const zeroIndexedPage = pageNumber - 1;
    const [copiedPage] = await newPdfDoc.copyPages(srcPdfDoc, [zeroIndexedPage]);
    
    // 6. Insert the copied page into the new document structure
    newPdfDoc.addPage(copiedPage);

    // 7. Serialize the PDF document to bytes and write to disk
    const newPdfBytes = await newPdfDoc.save();
    return newPdfBytes

  } catch (error) {
    console.error(' Extraction failed:', error);
    throw error;
  }
}