import { useCallback, useEffect, useEffectEvent, useState } from 'react';

/**
 * Run an async function whenever `key` changes and expose its state.
 *
 * Replaces the `alive` flag + loading + error pattern that was copy-pasted
 * across pages. It never calls setState synchronously inside the effect:
 * `loading` is derived (the stored result belongs to a different key than the
 * current one), and results are written only from the promise callbacks, so a
 * slow earlier request can't overwrite a newer one.
 *
 * @template T
 * @param {() => Promise<T>} fn   the work to do; always the latest closure is used
 * @param {string} key            primitive that identifies the request. Change it to refetch.
 * @returns {{ data: T | undefined, error: Error | null, loading: boolean, reload: () => void }}
 */
export function useAsync(fn, key) {
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState({ key: null, data: undefined, error: null });
  const run = useEffectEvent(fn);
  const fullKey = `${key}#${reloads}`;

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(run)
      .then(data  => { if (alive) setResult({ key: fullKey, data, error: null }); })
      .catch(error => { if (alive) setResult({ key: fullKey, data: undefined, error }); });
    return () => { alive = false; };
  }, [fullKey]);

  const reload = useCallback(() => setReloads(n => n + 1), []);
  const current = result.key === fullKey;
  return {
    data: current ? result.data : undefined,
    error: current ? result.error : null,
    loading: !current,
    reload,
  };
}
