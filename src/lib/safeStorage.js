/**
 * localStorage that never throws. Storage can be blocked (private mode, strict
 * cookie settings, embedded browsers), and an uncaught SecurityError during
 * render would blank the whole app.
 */
export function readStorage(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
