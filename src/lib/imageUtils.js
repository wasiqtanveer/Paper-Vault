import imageCompression from 'browser-image-compression';

const MAX_RAW_SIZE_MB = 5;

export function validateImageSize(file) {
  if (file.size > MAX_RAW_SIZE_MB * 1024 * 1024) {
    throw new Error(`Image must be under ${MAX_RAW_SIZE_MB}MB`);
  }
}

export async function compressImage(file) {
  return imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  });
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
