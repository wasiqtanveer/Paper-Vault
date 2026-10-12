import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cachedSafeQuery, cachedQuery, invalidate, invalidatePapers, peek } from './cache';

beforeEach(() => invalidate());
afterEach(() => vi.restoreAllMocks());

describe('cachedSafeQuery', () => {
  it('caches a successful result', async () => {
    const make = vi.fn(() => Promise.resolve({ data: [1, 2], error: null }));
    expect(await cachedSafeQuery('ok', make, { fallback: [] })).toEqual([1, 2]);
    expect(await cachedSafeQuery('ok', make, { fallback: [] })).toEqual([1, 2]);
    expect(make).toHaveBeenCalledTimes(1);
  });

  it('never caches a failure: returns the fallback, reports, and retries next time', async () => {
    const onError = vi.fn();
    const make = vi.fn()
      .mockReturnValueOnce(Promise.resolve({ data: null, error: { message: 'boom' } }))
      .mockReturnValueOnce(Promise.resolve({ data: ['real'], error: null }));

    const first = await cachedSafeQuery('flaky', make, { fallback: [], onError, label: 'papers' });
    expect(first).toEqual([]);
    expect(onError).toHaveBeenCalledWith('Failed to load papers: boom');
    expect(peek('flaky')).toBeUndefined();

    const second = await cachedSafeQuery('flaky', make, { fallback: [] });
    expect(second).toEqual(['real']);
    expect(make).toHaveBeenCalledTimes(2);
  });

  it('logs to the console when no onError is given', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = await cachedSafeQuery('log', () => Promise.resolve({ data: null, error: { message: 'x' } }), { fallback: 'fb' });
    expect(out).toBe('fb');
    expect(err).toHaveBeenCalled();
  });
});

describe('invalidatePapers', () => {
  it('clears every paper-derived key but leaves others alone', async () => {
    for (const k of ['papers:recent', 'papers:stats', 'papers:years', 'subjects']) {
      await cachedQuery(k, () => Promise.resolve(k));
    }
    invalidatePapers();
    expect(peek('papers:recent')).toBeUndefined();
    expect(peek('papers:stats')).toBeUndefined();
    expect(peek('papers:years')).toBeUndefined();
    expect(peek('subjects')).toBe('subjects');
  });
});
