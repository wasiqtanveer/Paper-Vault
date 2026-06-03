import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cachedQuery, invalidate } from './cache';

beforeEach(() => invalidate());

describe('cachedQuery', () => {
  it('calls the fetcher on a miss and returns its value', async () => {
    const fetcher = vi.fn().mockResolvedValue('hello');
    const result = await cachedQuery('k1', fetcher);
    expect(result).toBe('hello');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves a fresh value from cache without re-fetching', async () => {
    const fetcher = vi.fn().mockResolvedValue('v');
    await cachedQuery('k2', fetcher);
    await cachedQuery('k2', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('revalidates in the background once the entry is stale', async () => {
    const fetcher = vi.fn().mockResolvedValue('v');
    await cachedQuery('k3', fetcher, { ttl: 0 }); // immediately stale
    // Stale read returns the cached value but triggers a background refresh.
    const stale = await cachedQuery('k3', fetcher, { ttl: 0 });
    expect(stale).toBe('v');
    await Promise.resolve();
    expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('invalidate(key) forces a refetch', async () => {
    const fetcher = vi.fn().mockResolvedValue('v');
    await cachedQuery('k4', fetcher);
    invalidate('k4');
    await cachedQuery('k4', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
