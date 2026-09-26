import { getAuthToken } from './token';
import { API_BASE_URL, ensureFreshToken } from './http';
import { ApiError } from './apiError';

export type UploadBinaryRequest = {
  path: string;
  file: File;
  headers?: Record<string, string>;
  onProgress?: (fraction: number) => void;
};

export type UploadBinaryResult<T> =
  | { statusCode: number; data: T; error?: undefined }
  | { statusCode?: number; data?: undefined; error: ApiError };

// Raw application/octet-stream upload (as opposed to httpFetch's JSON body) so
// large files go over the wire as bytes, not a base64-inflated JSON string.
// Uses XMLHttpRequest rather than fetch specifically because fetch has no
// upload-progress event — XHR's `upload.onprogress` is what makes real,
// byte-level progress reporting possible here.
export function uploadBinary<T = unknown>({
  path,
  file,
  headers,
  onProgress,
}: UploadBinaryRequest): Promise<UploadBinaryResult<T>> {
  return ensureFreshToken().then(() => new Promise<UploadBinaryResult<T>>(resolve => {
    const token = getAuthToken();

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}${path}`);

    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    for (const [key, value] of Object.entries(headers ?? {})) {
      xhr.setRequestHeader(key, value);
    }

    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };

    xhr.onload = () => {
      let data: T | undefined;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : undefined;
      } catch {
        data = undefined;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ statusCode: xhr.status, data: data as T });
      } else {
        // Same ServiceResult shape as httpFetch's JSON calls: { error: { code, description } }.
        const serviceError = (data as { error?: { code: string; description?: string } } | undefined)?.error;
        resolve({
          statusCode: xhr.status,
          error: serviceError?.code
            ? new ApiError(serviceError.code, serviceError.description, xhr.status)
            : new ApiError('HTTPError', xhr.statusText || `HTTP ${xhr.status}`, xhr.status),
        });
      }
    };

    xhr.onerror = () => resolve({ error: new ApiError('NetworkError', 'Network error') });

    xhr.send(file);
  }));
}
