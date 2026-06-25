/**
 * Run a Supabase query, surfacing any error and returning a safe fallback.
 *
 * Supabase query builders are thenables that resolve to `{ data, error }`.
 * This wraps that pattern so callers don't silently swallow failures.
 *
 * @template T
 * @param {PromiseLike<{ data: T, error: any }>} builder - a Supabase query
 * @param {object}   [opts]
 * @param {T}        [opts.fallback]  value returned when the query fails (default null)
 * @param {(msg: string) => void} [opts.onError]  called with a user-facing message on failure
 * @param {string}   [opts.label]     short context for the error message (e.g. "papers")
 * @param {boolean}  [opts.throwOnError]  rethrow instead of returning the fallback (used by the cache,
 *                                        so a failed request is never stored as a real result)
 * @returns {Promise<T>} the query data, or the fallback on error
 */
export async function safeQuery(builder, { fallback = null, onError, label, throwOnError = false } = {}) {
  try {
    const { data, error } = await builder;
    if (error) {
      const msg = label ? `Failed to load ${label}: ${error.message}` : error.message;
      if (throwOnError) throw new Error(msg);
      if (onError) onError(msg);
      else console.error(msg);
      return fallback;
    }
    return data ?? fallback;
  } catch (err) {
    if (throwOnError) throw err;
    const msg = label ? `Failed to load ${label}.` : 'Something went wrong.';
    if (onError) onError(msg);
    else console.error(msg, err);
    return fallback;
  }
}

/**
 * Resolve a `select('id', { count: 'exact', head: true })` query to its row
 * count. Counting server-side transfers no rows, unlike selecting every row
 * and taking `.length` (which also silently caps at Supabase's 1000-row limit).
 * Throws on failure so callers/caches never mistake an error for a zero.
 */
export async function countRows(builder) {
  const { count, error } = await builder;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Escape `%`, `_` and `\` so user input is matched literally inside an `ilike` pattern. */
export function escapeLike(value) {
  return String(value).replace(/[\%_]/g, '\$&');
}
