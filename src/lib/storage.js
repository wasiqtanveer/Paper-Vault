import { supabase } from './supabase';

const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** PUT the file with XMLHttpRequest, the only way to get upload progress events. */
async function uploadWithProgress(path, file, onProgress) {
  const { data: { session } } = await supabase.auth.getSession();
  const base = import.meta.env.VITE_SUPABASE_URL;
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${base}/storage/v1/object/papers/${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`);
    xhr.setRequestHeader('apikey', import.meta.env.VITE_SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300
      ? resolve()
      : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Network error while uploading. Please try again.'));
    xhr.send(file);
  });
}

/**
 * Upload an image to the papers bucket under papers/<uid>/.
 * @param {File} file
 * @param {string} userId
 * @param {(fraction: number) => void} [onProgress] called with 0..1 while uploading
 * @returns {Promise<{ url: string, path: string }>}
 */
export async function uploadImage(file, userId, onProgress) {
  // Derive the extension from the validated MIME type, never the client's filename.
  const ext  = EXT_BY_MIME[file.type] || 'jpg';
  const path = `papers/${userId}/${Date.now()}.${ext}`;

  if (onProgress) {
    await uploadWithProgress(path, file, onProgress);
  } else {
    const { error } = await supabase.storage.from('papers').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
  }

  const { data } = supabase.storage.from('papers').getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Remove a paper's image. Prefers the stored `image_path`; falls back to parsing the URL for old rows. */
export async function deleteImage(imageUrl, imagePath) {
  let path = imagePath;
  if (!path) {
    if (!imageUrl) return;
    const marker = '/object/public/papers/';
    const idx    = imageUrl.indexOf(marker);
    if (idx === -1) return;
    path = imageUrl.slice(idx + marker.length);
  }
  const { error } = await supabase.storage.from('papers').remove([path]);
  if (error) console.warn('[storage] could not delete image:', path, error.message);
}
