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

/**
 * Crossfade used whenever one block of content replaces another in place —
 * skeleton → results, results → new results after a filter change.
 *
 * The exit is deliberately much faster than the enter: the outgoing content is
 * already stale, so lingering on it is what makes a swap feel like a stall.
 * Opacity only — no transform — so the replacement reads as the same region
 * resolving rather than a new element flying in.
 */
export const CONTENT_SWAP = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18, ease: EASE_OUT } },
  exit:    { opacity: 0, transition: { duration: 0.08, ease: 'easeIn' } },
};

/**
 * Staggered "fade up" entrance for a block on a page. `i` is the block's
 * position in the stagger; pages tune distance, length and stagger step to
 * their own density (see the one-line wrappers in each page).
 */
export const fadeUp = (i = 0, { y = 14, duration = 0.25, step = 0.06 } = {}) => ({
  initial: { opacity: 0, y },
  animate: { opacity: 1, y: 0, transition: { duration, delay: i * step, ease: 'easeOut' } },
});
