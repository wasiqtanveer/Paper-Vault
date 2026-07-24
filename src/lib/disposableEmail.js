/**
 * Best-effort block of the most common throwaway-email providers.
 *
 * This is a courtesy check, NOT a security control: any list is trivially
 * bypassed by a new domain, and the real protection is Supabase's email
 * confirmation. Kept in one place so it can be swapped for a maintained list.
 */
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com',
  'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempmail.net', 'tempmailo.com', 'tmpmail.org',
  '10minutemail.com', '10minutemail.net', '20minutemail.com', 'yopmail.com', 'yopmail.net', 'yopmail.fr',
  'trashmail.com', 'trashmail.net', 'trash-mail.com', 'sharklasers.com', 'grr.la', 'disposablemail.com',
  'throwawaymail.com', 'getnada.com', 'nada.email', 'maildrop.cc', 'mailnesia.com', 'mintemail.com',
  'dispostable.com', 'fakeinbox.com', 'mohmal.com', 'emailondeck.com', 'moakt.com', 'mytemp.email',
  'burnermail.io', 'spamgourmet.com', 'mailcatch.com', 'inboxkitten.com', 'discard.email', 'tempinbox.com',
]);

export function isDisposableEmail(email = '') {
  const domain = email.trim().toLowerCase().split('@')[1];
  return !!domain && DISPOSABLE_DOMAINS.has(domain);
}
