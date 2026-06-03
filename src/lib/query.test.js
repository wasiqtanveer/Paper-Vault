import { describe, it, expect, vi } from 'vitest';
import { safeQuery } from './query';

describe('safeQuery', () => {
  it('returns data when the query succeeds', async () => {
    const builder = Promise.resolve({ data: [1, 2, 3], error: null });
    const result = await safeQuery(builder);
    expect(result).toEqual([1, 2, 3]);
  });

  it('returns the fallback and calls onError when the query errors', async () => {
    const onError = vi.fn();
    const builder = Promise.resolve({ data: null, error: { message: 'boom' } });
    const result = await safeQuery(builder, { fallback: [], onError, label: 'papers' });
    expect(result).toEqual([]);
    expect(onError).toHaveBeenCalledWith('Failed to load papers: boom');
  });

  it('returns the fallback and calls onError when the promise rejects', async () => {
    const onError = vi.fn();
    const builder = Promise.reject(new Error('network'));
    const result = await safeQuery(builder, { fallback: 'x', onError, label: 'stats' });
    expect(result).toBe('x');
    expect(onError).toHaveBeenCalledWith('Failed to load stats.');
  });

  it('defaults the fallback to null', async () => {
    const builder = Promise.resolve({ data: null, error: { message: 'nope' } });
    const result = await safeQuery(builder);
    expect(result).toBeNull();
  });
});
