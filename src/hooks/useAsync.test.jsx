import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAsync } from './useAsync';

describe('useAsync', () => {
  it('starts loading and resolves with data', async () => {
    const { result } = renderHook(() => useAsync(async () => 42, 'a'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe(42);
    expect(result.current.error).toBeNull();
  });

  it('exposes a rejection as error', async () => {
    const { result } = renderHook(() => useAsync(async () => { throw new Error('boom'); }, 'a'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error.message).toBe('boom');
    expect(result.current.data).toBeUndefined();
  });

  it('refetches when the key changes and ignores the stale response', async () => {
    let release;
    const slow = new Promise(r => { release = r; });
    const { result, rerender } = renderHook(
      ({ k }) => useAsync(() => (k === 'slow' ? slow : Promise.resolve('fast')), k),
      { initialProps: { k: 'slow' } },
    );
    rerender({ k: 'fast' });
    await waitFor(() => expect(result.current.data).toBe('fast'));
    await act(async () => { release('slow'); await slow; });
    expect(result.current.data).toBe('fast');
  });

  it('reload runs the function again', async () => {
    let n = 0;
    const { result } = renderHook(() => useAsync(async () => ++n, 'a'));
    await waitFor(() => expect(result.current.data).toBe(1));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toBe(2));
  });
});
