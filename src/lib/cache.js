/**
 * Tiny module-level cache with TTL + stale-while-revalidate.
 *
 * Lives for the lifetime of the page (in-memory only — cleared on reload).
 * Intended for read-mostly lookups (subjects, teachers, years) and other data
 * that's expensive to refetch on every navigation but tolerant of being a few
 * seconds stale. Avoids pulling in a full data-fetching library.
 *
 * Usage:
 *   const subjects = await cachedQuery('subjects', () =>
 *     safeQuery(supabase.from('subjects').select('id, name').order('name'), { fallback: [] })
 *   );
 */

import { reportError } from './logger';
import { safeQuery } from './query';

const store = new Map(); // key -> { value, expires, inflight }

const DEFAULT_TTL = 60_000; // 60s

/**
 * Fetch a value through the cache.
 *
 * - Fresh hit (within TTL): returns cached value immediately, no fetch.
 * - Stale hit: returns cached value immediately AND revalidates in the
 *   background so the next call is fresh (stale-while-revalidate).
 * - Miss: awaits the fetcher, caches, and returns it.
 *
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} fetcher
 * @param {object}  [opts]
 * @param {number}  [opts.ttl]  freshness window in ms (default 60s)
 * @returns {Promise<T>}
 */
export async function cachedQuery(key, fetcher, { ttl = DEFAULT_TTL } = {}) {
  const now = Date.now();
  const entry = store.get(key);

  const revalidate = () => {
    if (entry?.inflight) return entry.inflight;
    const inflight = Promise.resolve(fetcher())
      .then(value => {
        store.set(key, { value, expires: Date.now() + ttl, inflight: null });
        return value;
      })
      .catch(err => {
        // Drop the inflight marker so a later call can retry.
        if (store.get(key)) store.get(key).inflight = null;
        throw err;
      });
    store.set(key, { ...(entry ?? { value: undefined, expires: 0 }), inflight });
    return inflight;
  };

  if (entry && entry.value !== undefined) {
    if (now < entry.expires) return entry.value; // fresh
    revalidate(); // stale: refresh in background, return stale now
    return entry.value;
  }

  return revalidate(); // miss
}

/** Invalidate one key (e.g. after a mutation), or everything if no key given. */
export function invalidate(key) {
  if (key === undefined) store.clear();
  else store.delete(key);
}

/** Synchronous read of a cached value (fresh or stale), or undefined. Lets a page
 *  paint instantly from the last visit instead of flashing a skeleton. */
export function peek(key) {
  return store.get(key)?.value;
}

/**
 * Cache a Supabase query without ever caching a failure.
 *
 * `safeQuery` normally swallows errors and returns a fallback — which, passed
 * through `cachedQuery`, would be stored as a legitimate empty result and served
 * for the whole TTL. Here the query rethrows, so the cache stays empty on
 * failure and the next call retries; the caller still gets the fallback and the
 * error callback.
 */
export async function cachedSafeQuery(key, makeBuilder, { fallback = null, onError, label, ttl } = {}) {
  try {
    return await cachedQuery(
      key,
      () => safeQuery(makeBuilder(), { fallback, label, throwOnError: true }),
      { ttl },
    );
  } catch (err) {
    if (onError) onError(err.message);
    else reportError(err);
    return fallback;
  }
}

/** Drop every entry whose key starts with `prefix`. */
export function invalidatePrefix(prefix) {
  for (const key of [...store.keys()]) if (key.startsWith(prefix)) store.delete(key);
}

/**
 * Drop every cache entry derived from the papers table. Call after any paper
 * mutation. Keys are namespaced with a `papers:` prefix so a new cached query can't
 * be forgotten here: name it `papers:<something>` and it is covered.
 */
export function invalidatePapers() {
  invalidatePrefix('papers:');
}
