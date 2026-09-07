/**
 * Date formatting in one place, so the locale and the handful of styles the app
 * uses aren't re-declared at every call site.
 */
const LOCALE = 'en-US';

export const DATE_SHORT      = { month: 'short', day: 'numeric' };
export const DATE_SHORT_YEAR = { month: 'short', day: 'numeric', year: 'numeric' };
export const DATE_LONG       = { month: 'long',  day: 'numeric', year: 'numeric' };
export const MONTH_YEAR      = { year: 'numeric', month: 'long' };
export const DATE_TIME       = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
export const DATE_TIME_YEAR  = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' };

/** Format a date (string, number or Date). Returns '' for a missing or invalid value. */
export function formatDate(value, options = DATE_SHORT_YEAR) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(LOCALE, options);
}

/** Like formatDate but includes the time when `options` has hour/minute. */
export function formatDateTime(value, options = DATE_TIME) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(LOCALE, options);
}
