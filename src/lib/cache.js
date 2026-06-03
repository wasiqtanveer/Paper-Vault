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
