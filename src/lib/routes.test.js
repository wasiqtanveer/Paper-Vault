import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.doUnmock('../pages/About');
});

const flush = () => new Promise(r => setTimeout(r, 0));

describe('prefetchRoute', () => {
  it('imports a route chunk only once however often it is called', async () => {
    const factory = vi.fn(() => ({ default: () => null }));
    vi.doMock('../pages/About', factory);
    const { prefetchRoute } = await import('./routes');

    prefetchRoute('/about');
    prefetchRoute('/about');
    await flush();
    prefetchRoute('/about');
    await flush();

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('ignores unknown paths', async () => {
    const { prefetchRoute } = await import('./routes');
    expect(() => prefetchRoute('/nope')).not.toThrow();
  });

  it('retries after a failed load', async () => {
    let calls = 0;
    vi.doMock('../pages/About', () => {
      calls += 1;
      throw new Error('chunk failed');
    });
    const { prefetchRoute } = await import('./routes');

    prefetchRoute('/about');
    await flush();
    expect(calls).toBe(1);

    prefetchRoute('/about');
    await flush();
    expect(calls).toBe(2);
  });
});
