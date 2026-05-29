/**
 * A synthesised UI sound kit.
 *
 * Generated with the Web Audio API rather than loaded from files: zero network
 * bytes, no licensing, and perfectly in sync with the interaction that fired it
 * (a decoded sample can arrive a frame late, which is exactly when a click
 * sound stops feeling attached to the click).
 *
 * ── The design system ────────────────────────────────────────────────────────
 *
 * Every sound is the same instrument — a triangle blip through a lowpass, with a
 * fast exponential decay. What distinguishes one control from another is not a
 * different noise but a different *position* in three dimensions:
 *
 *   Register  — heavy things sound low. A paper card is a document you are
 *               opening, so it sits near 300Hz; a stepper arrow is a hair
 *               trigger, so it sits near 1.4kHz.
 *   Brightness— the lowpass cutoff. Destructive actions are dark and dull;
 *               incidental controls are bright and glassy.
 *   Body      — most sounds are one oscillator. The two that matter most
 *               (primary actions, success) get a second layered voice, which
 *               reads as fuller without reading as louder.
 *
 * Because it is one instrument throughout, twenty variations still sound like
 * one product rather than a soundboard. Two rules keep it from grating:
 *
 *   1. Hovers are roughly half the volume of their matching click, and shorter.
 *      They fire constantly; they should sit under the interaction.
 *   2. Nothing exceeds 160ms, and most are under 60ms.
 */

let ctx = null;
let master = null;

/** Lazily create the context. Browsers refuse audio before a user gesture. */
function audio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  return ctx;
}

/**
 * Resume a context suspended by autoplay policy. Call from a real gesture.
 *
 * Returns true once the context is actually running, so the caller knows when
 * it can stop listening. `resume()` settles asynchronously, so the first call
 * routinely returns false even though it succeeded — unhooking after a single
 * attempt is what leaves the kit permanently silent.
 */
export function unlockAudio() {
  const c = audio();
  if (!c) return true; // No Web Audio at all — nothing to wait for.
  if (c.state === 'suspended') c.resume().catch(() => {});
  return c.state === 'running';
}

/** Slight random detune, so a repeated sound never feels machine-stamped. */
function vary(freq, amount = 0.03) {
  return freq * (1 + (Math.random() * 2 - 1) * amount);
}

/** The single voice everything is built from. */
function blip(c, {
  freq,
  endFreq,
  dur,
  gain,
  type = 'triangle',
  cutoff = 2200,
  delay = 0,
  detune = 0.03,
}) {
  const t = c.currentTime + delay;

  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(vary(freq, detune), t);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t + dur);

  // The lowpass is what separates "wooden" from "beepy" — without it a triangle
  // at this pitch keeps enough upper harmonics to sound like a cheap alarm.
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(cutoff, t);
  lp.Q.value = 0.7;

  const g = c.createGain();
  // A short attack ramp rather than an instant start: a hard gain step produces
  // an audible click of its own, which muddies the sound we actually designed.
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(lp);
  lp.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Two voices at once — used only where a sound needs weight. */
const stack = (...voices) => c => voices.forEach(v => blip(c, v));
const one = v => c => blip(c, v);

/**
 * ── Hovers ───────────────────────────────────────────────────────────────────
 * Quiet, 16–34ms. Pitch rises as the control gets smaller and more incidental.
 */
const hovers = {
  /** A paper card. Lowest and warmest hover — it is a document, not a control. */
  hoverCard:   one({ freq: 620, endFreq: 585, dur: 0.034, gain: 0.05, cutoff: 1600 }),
  /** Sidebar navigation. Crisper and higher than a card. */
  hoverNav:    one({ freq: 960, endFreq: 900, dur: 0.028, gain: 0.045, cutoff: 2800 }),
  /** Primary action. The only hover with a second voice, so it reads as weightier. */
  hoverPrimary: stack(
    { freq: 700, endFreq: 660, dur: 0.034, gain: 0.045, cutoff: 2000 },
    { freq: 1050, endFreq: 990, dur: 0.03, gain: 0.018, cutoff: 2600 },
  ),
  /** Destructive action. Dark and dull — the tone warns before the click does. */
  hoverDanger: one({ freq: 400, endFreq: 370, dur: 0.036, gain: 0.045, cutoff: 1000 }),
  /** Ordinary / ghost button. */
  hoverButton: one({ freq: 820, endFreq: 780, dur: 0.03, gain: 0.045, cutoff: 2200 }),
  /** Dropdown trigger. */
  hoverSelect: one({ freq: 880, endFreq: 840, dur: 0.028, gain: 0.04, cutoff: 2400 }),
  /** A row inside an open dropdown. Very short — these are swept through. */
  hoverOption: one({ freq: 1080, endFreq: 1040, dur: 0.018, gain: 0.035, cutoff: 3000 }),
  /** Icon-only control: close, collapse, reveal-password. */
  hoverIcon:   one({ freq: 1240, endFreq: 1180, dur: 0.02, gain: 0.038, cutoff: 3200 }),
  /** Number-stepper arrow. The smallest target in the app, and the highest. */
  hoverStep:   one({ freq: 1420, endFreq: 1360, dur: 0.016, gain: 0.032, cutoff: 3400 }),
  /** Tab in a tab bar. */
  hoverTab:    one({ freq: 1020, endFreq: 970, dur: 0.026, gain: 0.042, cutoff: 2700 }),
  /** Switch or segmented control. */
  hoverToggle: one({ freq: 900, endFreq: 860, dur: 0.028, gain: 0.042, cutoff: 2500 }),
  /** The file drop zone — wide and soft, matching its size on screen. */
  hoverZone:   one({ freq: 520, endFreq: 500, dur: 0.04, gain: 0.04, cutoff: 1400 }),
  /** Account menu in the sidebar footer. */
  hoverUser:   one({ freq: 760, endFreq: 720, dur: 0.03, gain: 0.042, cutoff: 2100 }),
};

/**
 * ── Clicks ───────────────────────────────────────────────────────────────────
 * Each sits about a fifth below its matching hover, so press reads as the
 * resolution of the hover rather than as an unrelated event.
 */
const clicks = {
  /** Opening a paper. The heaviest sound in the kit — a document being opened. */
  clickCard:    one({ freq: 310, endFreq: 205, dur: 0.1,  gain: 0.1,  cutoff: 1300 }),
  /** Navigation. Low and round. */
  clickNav:     one({ freq: 390, endFreq: 255, dur: 0.08, gain: 0.1,  cutoff: 1500 }),
  /** Primary / submit. Layered fifth above, for confidence without volume. */
  clickPrimary: stack(
    { freq: 520, endFreq: 380, dur: 0.085, gain: 0.1,  cutoff: 1900 },
    { freq: 780, endFreq: 585, dur: 0.07,  gain: 0.04, cutoff: 2400, delay: 0.008 },
  ),
  /** Destructive. Sawtooth and low: the only deliberately unpleasant sound here. */
  clickDanger:  one({ freq: 210, endFreq: 145, dur: 0.14, gain: 0.09, cutoff: 900, type: 'sawtooth' }),
  /** Ordinary button. The reference "tick". */
  clickButton:  one({ freq: 540, endFreq: 360, dur: 0.055, gain: 0.1,  cutoff: 1900 }),
  /** Opening a dropdown — rises, because a menu is coming toward you. */
  clickSelect:  one({ freq: 480, endFreq: 640, dur: 0.06, gain: 0.085, cutoff: 2200 }),
  /** Choosing an option. Rises and resolves — a small confirmation. */
  clickOption:  one({ freq: 720, endFreq: 940, dur: 0.055, gain: 0.08, cutoff: 2600 }),
  /** Icon-only control. */
  clickIcon:    one({ freq: 880, endFreq: 660, dur: 0.032, gain: 0.08, cutoff: 2600 }),
  /** Stepper arrow. Tightest, driest sound in the kit — a ratchet tooth. */
  clickStep:    one({ freq: 1150, endFreq: 950, dur: 0.022, gain: 0.07, cutoff: 3000, detune: 0.05 }),
  /** Switching tab. */
  clickTab:     one({ freq: 620, endFreq: 500, dur: 0.05, gain: 0.09, cutoff: 2100 }),
  /** Activating the drop zone. */
  clickZone:    one({ freq: 440, endFreq: 600, dur: 0.07, gain: 0.085, cutoff: 1700 }),
  /** Opening the account menu. */
  clickUser:    one({ freq: 560, endFreq: 700, dur: 0.055, gain: 0.085, cutoff: 2000 }),
};

/**
 * ── States and outcomes ──────────────────────────────────────────────────────
 * These are not tied to a control; they report that something happened.
 */
const states = {
  /** Switch flipped on: pitch steps up. */
  toggleOn:  one({ freq: 620, endFreq: 940, dur: 0.06, gain: 0.09, cutoff: 2400, detune: 0 }),
  /** Switch flipped off: the same gesture, inverted. */
  toggleOff: one({ freq: 940, endFreq: 570, dur: 0.06, gain: 0.09, cutoff: 2400, detune: 0 }),
  /** A panel, modal, or drawer opening. */
  open:      one({ freq: 420, endFreq: 780, dur: 0.07, gain: 0.07, type: 'sine', cutoff: 2600, detune: 0 }),
  /** ...and closing. */
  close:     one({ freq: 780, endFreq: 400, dur: 0.065, gain: 0.07, type: 'sine', cutoff: 2600, detune: 0 }),
  /** Typing. The driest and quietest sound in the kit. */
  key:       one({ freq: 760, endFreq: 700, dur: 0.02, gain: 0.04, cutoff: 2800, detune: 0.05 }),
  /** Completed. Two rising notes — the only near-musical sound here. */
  success: stack(
    { freq: 660, dur: 0.08, gain: 0.08, type: 'sine', cutoff: 3000, detune: 0 },
    { freq: 990, dur: 0.1,  gain: 0.08, type: 'sine', cutoff: 3000, detune: 0, delay: 0.07 },
  ),
  /** Failed. Low, flat, gliding down. */
  error:     one({ freq: 260, endFreq: 165, dur: 0.16, gain: 0.1, cutoff: 1100, detune: 0 }),
  /** Neutral notice. Deliberately unremarkable. */
  info:      one({ freq: 620, endFreq: 620, dur: 0.07, gain: 0.055, type: 'sine', cutoff: 2400, detune: 0 }),
  /** New results settled into the grid after a filter change. */
  refresh:   one({ freq: 840, endFreq: 1010, dur: 0.05, gain: 0.05, type: 'sine', cutoff: 2800, detune: 0 }),
};

const kit = { ...hovers, ...clicks, ...states };

export const SOUND_NAMES = Object.keys(kit);

/**
 * Play a sound by name. Silently does nothing when the kit has no such sound or
 * the browser has no Web Audio — a missing sound must never break an
 * interaction, since every one of these fires mid-gesture.
 */
export function playSound(name) {
  const make = kit[name];
  if (!make) return;
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  try {
    make(c);
  } catch {
    // An exhausted or interrupted audio context is not worth surfacing.
  }
}
