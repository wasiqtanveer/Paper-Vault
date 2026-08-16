import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { playSound, unlockAudio } from '../lib/sound';

const SoundContext = createContext(null);

const STORAGE_KEY = 'pv_sound_enabled';

/**
 * What each kind of control sounds like.
 *
 * Ordered most specific first and resolved by first match, so `.btn-primary`
 * wins over the bare `.btn` it also carries. Adding a control to the app means
 * adding one row here — or nothing at all, since the trailing generic rows catch
 * any button or link that isn't called out.
 */
const SOUND_MAP = [
  // Content
  { sel: '.paper-card',                                   hover: 'hoverCard',    click: 'clickCard' },

  // Navigation
  { sel: '.nav-link, .sidebar-logo, .mobile-topbar-logo',  hover: 'hoverNav',     click: 'clickNav' },
  { sel: '.sidebar-user',                                  hover: 'hoverUser',    click: 'clickUser' },

  // Menus and selects
  { sel: '.cselect-option, [role="option"]',               hover: 'hoverOption',  click: 'clickOption' },
  { sel: '.cselect-trigger',                               hover: 'hoverSelect',  click: 'clickSelect' },
  { sel: '.sidebar-user-dropdown a, .sidebar-user-dropdown button',
                                                           hover: 'hoverOption',  click: 'clickOption' },

  // Small mechanical controls
  { sel: '.numfield-step',                                 hover: 'hoverStep',    click: 'clickStep' },
  { sel: '.wm-close, .epm-close, .sidebar-collapse-btn, .mobile-hamburger, .pw-toggle, .title-reset-btn',
                                                           hover: 'hoverIcon',    click: 'clickIcon' },

  // Tabs and switches
  { sel: '.mod-tabs button, .tab',                         hover: 'hoverTab',     click: 'clickTab' },
  { sel: '.theme-toggle-sidebar, .exam-type-btn, input[type="checkbox"], input[type="radio"]',
                                                           hover: 'hoverToggle',  click: null /* resolved from pressed state */ },

  // Destructive — checked before primary, since some carry both classes
  { sel: '.btn-danger, .btn-reject',                       hover: 'hoverDanger',  click: 'clickDanger' },

  // Primary actions
  { sel: '.btn-primary, .form-submit, .btn-sidebar-primary, .btn-approve, .btn-google, .btn-mod-edit',
                                                           hover: 'hoverPrimary', click: 'clickPrimary' },

  // Drop zone
  { sel: '.upload-zone',                                   hover: 'hoverZone',    click: 'clickZone' },

  // Generic fallbacks
  { sel: 'a[href]',                                        hover: 'hoverNav',     click: 'clickNav' },
  { sel: 'button, [role="button"], .btn, label[for]',      hover: 'hoverButton',  click: 'clickButton' },
];

/** One selector matching anything in the map, for a single cheap `closest()`. */
const INTERACTIVE = SOUND_MAP.map(r => r.sel).join(',');

/** Which row governs this element. */
function resolve(el) {
  return SOUND_MAP.find(row => el.matches(row.sel)) ?? null;
}

/** Fields where each keystroke gets a tick. */
const TEXTUAL = 'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea';

/** Hover fires as fast as the pointer moves; without a floor, dragging across a
 *  grid of cards machine-guns the speaker. 55ms is under the threshold where a
 *  deliberate hover feels unacknowledged. */
const HOVER_THROTTLE_MS = 55;

/** Same idea for keystrokes — a held-down key repeats far faster than this. */
const KEY_THROTTLE_MS = 28;

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // Default on: the feature is invisible until it makes noise, and browsers
    // already withhold every sound until the visitor's first real gesture.
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

export function SoundProvider({ children }) {
  const [enabled, setEnabled] = useState(readStored);

  // Read through a ref inside the global listeners so toggling doesn't tear
  // down and rebuild them. Synced in an effect rather than during render —
  // mutating a ref while rendering is not safe under concurrent React.
  const enabledRef = useRef(enabled);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const play = useCallback(name => {
    if (!enabledRef.current) return;
    playSound(name);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch { /* private mode */ }
  }, [enabled]);

  // Gestures unlock the audio context. Registered capture-phase so nothing can
  // stop propagation before we see them, and kept attached until the context is
  // genuinely running rather than removed after one attempt — `resume()` settles
  // asynchronously, so a single try can silently fail and mute the whole kit.
  useEffect(() => {
    const events = ['pointerdown', 'touchstart', 'keydown'];
    const detach = () => events.forEach(ev => window.removeEventListener(ev, unlock, true));
    function unlock() {
      if (unlockAudio()) detach();
    }
    events.forEach(ev => window.addEventListener(ev, unlock, true));
    return detach;
  }, []);

  /**
   * One delegated listener per event type, rather than props threaded through
   * every component. Interactive elements are matched structurally, so anything
   * added later is covered without being wired up.
   */
  useEffect(() => {
    // Hover sounds only where hover is a real, deliberate state. On touch,
    // `pointerover` fires on tap and would double up with the click sound.
    const canHover = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

    let lastHoverEl = null;
    let lastHoverAt = 0;
    let lastKeyAt = 0;

    function onPointerOver(e) {
      if (!enabledRef.current || !canHover) return;
      const el = e.target instanceof Element ? e.target.closest(INTERACTIVE) : null;
      if (!el || el === lastHoverEl) return;
      if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return;

      const now = performance.now();
      if (now - lastHoverAt < HOVER_THROTTLE_MS) return;

      const row = resolve(el);
      if (!row) return;

      lastHoverEl = el;
      lastHoverAt = now;
      play(row.hover);
    }

    function onPointerOut(e) {
      // Clear the memo only once the pointer has genuinely left the tracked
      // element. Comparing against `e.target` is not enough: leaving a card over
      // its cover image reports the *image* as the target, so the memo would
      // never clear and returning to that same card would stay silent.
      if (!lastHoverEl) return;
      const to = e.relatedTarget;
      if (!(to instanceof Node) || !lastHoverEl.contains(to)) lastHoverEl = null;
    }

    function onClick(e) {
      if (!enabledRef.current) return;
      const el = e.target instanceof Element ? e.target.closest(INTERACTIVE) : null;
      if (!el) return;
      if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return;

      // A switch reports its resulting state rather than its identity — which
      // way it just moved is the only information a toggle sound can carry.
      const pressed = el.getAttribute('aria-pressed') ?? el.getAttribute('aria-checked');
      if (pressed !== null) {
        play(pressed === 'true' ? 'toggleOff' : 'toggleOn');
        return;
      }
      if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
        play(el.checked ? 'toggleOff' : 'toggleOn');
        return;
      }

      const row = resolve(el);
      if (!row) return;

      // An external link leaves the app entirely; that is not navigation within
      // it, so it gets the neutral button tick rather than the nav sound.
      const href = el.getAttribute('href');
      if (href && (href.startsWith('http') || el.target === '_blank')) {
        play('clickButton');
        return;
      }

      play(row.click ?? 'clickButton');
    }

    function onKeyDown(e) {
      if (!enabledRef.current) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const el = e.target;
      if (!(el instanceof Element) || !el.matches(TEXTUAL)) return;
      // Printable characters plus the two edits that change the field's length.
      const isEdit = e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete';
      if (!isEdit) return;

      const now = performance.now();
      if (now - lastKeyAt < KEY_THROTTLE_MS) return;
      lastKeyAt = now;
      play('key');
    }

    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('pointerout', onPointerOut, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('pointerout', onPointerOut, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [play]);

  return (
    <SoundContext.Provider value={{ enabled, setEnabled, toggle: () => setEnabled(v => !v), play }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  // Safe outside the provider: components can call play() unconditionally.
  return useContext(SoundContext) ?? { enabled: false, setEnabled: () => {}, toggle: () => {}, play: () => {} };
}
