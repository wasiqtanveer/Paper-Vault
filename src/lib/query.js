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
 * @returns {Promise<T>} the query data, or the fallback on error
 */
export async function safeQuery(builder, { fallback = null, onError, label } = {}) {
  try {
    const { data, error } = await builder;
    if (error) {
      const msg = label ? `Failed to load ${label}: ${error.message}` : error.message;
      if (onError) onError(msg);
      else console.error(msg);
      return fallback;
    }
    return data ?? fallback;
  } catch (err) {
    const msg = label ? `Failed to load ${label}.` : 'Something went wrong.';
    if (onError) onError(msg);
    else console.error(msg, err);
    return fallback;
  }
}
