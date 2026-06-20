import { supabase } from './supabase';

const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function uploadImage(file, userId) {
  // Derive the extension from the validated MIME type, never the client's filename.
  const ext      = EXT_BY_MIME[file.type] || 'jpg';
  const path     = `papers/${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('papers').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

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
