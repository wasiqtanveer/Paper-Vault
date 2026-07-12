import imageCompression from 'browser-image-compression';

const MAX_RAW_SIZE_MB = 5;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImageSize(file) {
  if (file.size > MAX_RAW_SIZE_MB * 1024 * 1024) {
    throw new Error(`Image must be under ${MAX_RAW_SIZE_MB}MB`);
  }
}

/** Reject anything that isn't a JPEG, PNG or WEBP, then apply the size limit. */
export function validateImage(file) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Please choose a JPEG, PNG or WEBP image.');
  }
  validateImageSize(file);
}

export const MAX_PAGES = 4;

/**
 * Stack several page photos top-to-bottom into one JPEG, so a multi-page paper
 * is still stored as a single image. Pages are scaled to a common width.
 */
export async function combineImages(files) {
  const bitmaps = await Promise.all(files.map(f => createImageBitmap(f)));
  const width   = Math.min(1600, Math.max(...bitmaps.map(b => b.width)));
  const heights = bitmaps.map(b => Math.round(b.height * (width / b.width)));
  const canvas  = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = heights.reduce((a, b) => a + b, 0);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let y = 0;
  bitmaps.forEach((b, i) => { ctx.drawImage(b, 0, y, width, heights[i]); y += heights[i]; b.close?.(); });
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) throw new Error('Could not combine the pages.');
  return new File([blob], 'combined.jpg', { type: 'image/jpeg' });
}

/** @param {number} [pages] how many pages were stacked; scales the size and dimension caps */
export async function compressImage(file, pages = 1) {
  return imageCompression(file, {
    maxSizeMB: Math.min(pages, 4),
    maxWidthOrHeight: Math.min(1920 * pages, 8000),
    useWebWorker: true,
    // Always emit JPEG so the stored MIME type and extension match the bytes
    // (a PNG in, JPEG out would otherwise keep a .png name).
    fileType: 'image/jpeg',
  });
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
