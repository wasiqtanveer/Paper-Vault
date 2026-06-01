export const CONTACT = {
  email:    'mwasiqt@gmail.com',
  linkedin: 'https://www.linkedin.com/in/wasiq-tanveer/',
  github:   'https://github.com/wasiqtanveer',
};

// Copy rather than mailto: a webmail user has no desktop client to hand off
// to, so the address itself is the more useful thing to give them.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard API needs a secure context; fall back for plain http.
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}
