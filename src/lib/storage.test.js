import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const remove = vi.fn();
const fromBucket = vi.fn(() => ({ remove }));
vi.mock('./supabase', () => ({ supabase: { storage: { from: (...a) => fromBucket(...a) } } }));

import { deleteImage } from './storage';

const PUBLIC = 'http://localhost:54321/storage/v1/object/public/papers/';

beforeEach(() => {
  remove.mockReset().mockResolvedValue({ error: null });
  fromBucket.mockClear();
});
afterEach(() => vi.restoreAllMocks());

describe('deleteImage', () => {
  it('prefers the stored image_path over the URL', async () => {
    await deleteImage(`${PUBLIC}papers/u1/other.jpg`, 'papers/u1/stored.jpg');
    expect(fromBucket).toHaveBeenCalledWith('papers');
    expect(remove).toHaveBeenCalledWith(['papers/u1/stored.jpg']);
  });

  it('falls back to parsing the public URL for old rows', async () => {
    await deleteImage(`${PUBLIC}papers/u1/123.jpg`, null);
    expect(remove).toHaveBeenCalledWith(['papers/u1/123.jpg']);
  });

  it('ignores URLs that are not from the papers bucket', async () => {
    await deleteImage('https://example.com/img.jpg', null);
    expect(remove).not.toHaveBeenCalled();
  });

  it('does nothing when given neither a URL nor a path', async () => {
    await deleteImage(null, null);
    await deleteImage(undefined);
    expect(remove).not.toHaveBeenCalled();
  });

  it('logs a warning when removal fails, without throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    remove.mockResolvedValue({ error: { message: 'denied' } });
    await expect(deleteImage(null, 'papers/u1/x.jpg')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.any(String), 'papers/u1/x.jpg', 'denied');
  });
});
