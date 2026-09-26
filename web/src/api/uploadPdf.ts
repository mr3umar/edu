import { uploadBinary } from './rest/uploadHttp';

export type UploadPdfOptions = {
  file: File;
  onProgress?: (fraction: number) => void;
};

// Uploads the raw file to /api/uploadPdf as application/octet-stream — same
// host/auth as listMyBooks (see rest/http.ts), file name passed via x-filename
// since the body is pure bytes rather than a JSON envelope.
export async function uploadPdf({ file, onProgress }: UploadPdfOptions): Promise<unknown> {
  const result = await uploadBinary({
    path: '/api/uploadPdf',
    file,
    headers: {
      'g-filename': encodeURIComponent(file.name),
    },
    onProgress,
  });

  if (result.error) {
    throw result.error;
  }

  return result.data;
}
