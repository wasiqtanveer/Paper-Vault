import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keep keyboard focus inside a modal while it is open.
 *
 * Attach the returned ref to the dialog panel. On mount focus moves into the
 * panel (to `initialFocus` if given, otherwise the first focusable element),
 * Tab / Shift+Tab wrap at the ends, and on unmount focus returns to whatever
 * had it before the dialog opened.
 *
 * @param {{ initialFocus?: () => HTMLElement | null }} [options]
 */
export function useFocusTrap({ initialFocus } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const previouslyFocused = document.activeElement;
    const items = () => Array.from(panel.querySelectorAll(FOCUSABLE)).filter(el => !el.closest('[hidden]'));

    const first = initialFocus?.() ?? items()[0];
    if (first) first.focus();
    else { panel.setAttribute('tabindex', '-1'); panel.focus(); }

    function onKeyDown(e) {
      if (e.key !== 'Tab') return;
      const list = items();
      if (!list.length) { e.preventDefault(); return; }
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    }
    panel.addEventListener('keydown', onKeyDown);
    return () => {
      panel.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  // initialFocus is read once on mount by design.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
