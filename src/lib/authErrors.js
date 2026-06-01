// Supabase surfaces a paused project as a failed request rather than a clean
// auth error, so match on the network-shaped failures, not on credentials.
export function looksLikePausedBackend(err) {
  const text = `${err?.name ?? ''} ${err?.message ?? ''}`;
  return /fetch|network|timeout|unavailable|retryable|\b5\d\d\b/i.test(text) || err?.status === 0;
}
