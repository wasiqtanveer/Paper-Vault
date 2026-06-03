/**
 * Shared animation timing constants for Framer Motion.
 *
 * Mirrors the CSS timing tokens in src/styles/variables.css so JS-driven
 * (Framer) and CSS-driven animations stay in sync. Import these instead of
 * sprinkling magic numbers like `duration: 0.22` across components.
 */
export const DUR = {
  fast: 0.14,
  std: 0.22,
  slow: 0.3,
};

/** Standard "ease out" curve used across cards, modals, and page transitions. */
export const EASE_OUT = [0.22, 1, 0.36, 1];
