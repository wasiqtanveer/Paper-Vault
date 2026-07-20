import { readStorage, writeStorage } from './safeStorage';

const KEY = 'pv-chunk-reload';

/**
 * After a deploy, a tab still running the old build asks for chunk files that no
 * longer exist. Vite fires `vite:preloadError` for that; reload once to pick up
 * the new build. The sessionStorage-style guard stops a reload loop if the
 * failure is something else (e.g. offline).
 */
export function installChunkReload() {
  window.addEventListener('vite:preloadError', event => {
    const last = Number(readStorage(KEY, '0'));
    if (Date.now() - last < 10_000) return;
    writeStorage(KEY, String(Date.now()));
    event.preventDefault();
    window.location.reload();
  });
}
