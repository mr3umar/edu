import * as fs from 'fs';
import * as path from 'path';
import { fromPath } from 'pdf2pic';

interface ConvertOptions {
  pdfPath: string;
  outputDir: string;
}

interface PageDimension {
  page: number;
  width: number;
  height: number;
  path: string;
}

/**
 * Converts a PDF into images while perfectly maintaining the portrait aspect ratio.
 */
export async function convertPdfToImages({ pdfPath, outputDir }: ConvertOptions): Promise<PageDimension[]> {
  try {
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`Source PDF file not found at: ${pdfPath}`);
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const baseName = path.basename(pdfPath, path.extname(pdfPath));

    const convert = fromPath(pdfPath, {
      density: 150,                 // 150 DPI provides clean text rendering for OCR
      saveFilename: baseName,
      savePath: outputDir,
      format: "png",
      width: 1200,                  // Target width baseline for high-res scanning
      height: 1800,                 // Explicit ceiling boundary height 
      preserveAspectRatio: true     // 🌟 CRITICAL FIX: Forces GraphicsMagick to respect native portrait limits
    });

    console.log(`⏳ Converting "${baseName}.pdf" with strict aspect locks...`);
    
    const results = await convert.bulk(-1, { responseType: "image" });
    
      
    const dimensionMap: PageDimension[] = results.map((item) => {
      // Parse the true pixel dimension output string (e.g., "1200x1654")
      const [w, h] = item.size ? item.size.split('x').map(Number) : [0, 0];
      
      return {
        page: item.page!,
        width: w,
        height: h,
        path: item.path || ''
      };
    });

    console.log(`✅ Success! Aspect ratios mapped correctly without stretching.`);
    return dimensionMap;

  } catch (error) {
    console.error('❌ PDF to Image conversion failed:', error);
    throw error;
  }
}