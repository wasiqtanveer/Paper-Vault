import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Calendar, User, BookOpen, GraduationCap } from 'lucide-react';
import './PaperPreview.css';

const WIDTH = 236;
/** Distance from the cursor. Close enough to read as attached to the pointer,
 *  far enough that it never sits under it. */
const OFFSET_X = 20;
const MARGIN = 12;
/** Used only for the first frame, before the panel has been measured. */
const ASSUMED_HEIGHT = 150;

/**
 * Hover preview for a paper card — details only.
 *
 * It deliberately shows no image. The card underneath already carries the scan,
 * and at preview size a photographed exam paper is unreadable anyway: it costs
 * most of the panel's area to show a grey rectangle nobody can parse. What the
 * card genuinely cannot show is the text — its title clips to one line, and
 * subject, uploader and date are truncated or absent. So the preview carries
 * exactly what the grid had to drop, and nothing it already has.
 *
 * It trails the pointer on a soft spring rather than tracking rigidly. A panel
 * locked exactly to the cursor reads as attached to the mouse driver; a slow,
 * over-damped glide reads as a physical object being carried.
 */
export default function PaperPreview({ paper, origin }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(ASSUMED_HEIGHT);

  // Seed at the cursor position that opened it, so the panel fades in already in
  // place instead of gliding across the screen from the origin.
  const seed = placeFor(origin?.x ?? 0, origin?.y ?? 0, ASSUMED_HEIGHT);
  const rawX = useMotionValue(seed.x);
  const rawY = useMotionValue(seed.y);

  // Soft and over-damped: low stiffness for a long glide, damping well above
  // critical so it settles without a hint of overshoot. Wobble here would read
  // as a toy; this reads as weight.
  const spring = { stiffness: 210, damping: 30, mass: 0.5 };
  const x = useSpring(rawX, spring);
  const y = useSpring(rawY, spring);

  // Last known cursor position, so the panel can be re-placed on events that
  // change the available room without waiting for the pointer to move again.
  const cursor = useRef({ x: origin?.x ?? 0, y: origin?.y ?? 0 });

  // The title wraps to a variable number of lines, so the height is only known
  // once rendered. Every clamp below uses the measured box, never the estimate.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => setHeight(el.offsetHeight || ASSUMED_HEIGHT);
    apply();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [paper?.id]);

  useEffect(() => {
    function place() {
      const next = placeFor(cursor.current.x, cursor.current.y, height);
      rawX.set(next.x);
      rawY.set(next.y);
    }

    function onMove(e) {
      cursor.current = { x: e.clientX, y: e.clientY };
      place();
    }

    // Re-place immediately whenever the measured height or the viewport changes,
    // so a panel that was correctly placed does not end up hanging off an edge
    // after it grows or the window shrinks.
    place();

    // Listened for on the window rather than the card: the pointer regularly
    // crosses the card's own children, and per-element handlers drop frames at
    // exactly the moments the motion is most visible.
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', place);
    };
  }, [height, rawX, rawY]);

  const subject  = paper.subjects?.name ?? paper.subject_name ?? null;
  const teacher  = paper.teachers?.name ?? paper.teacher_name ?? null;
  const uploader = paper.profiles?.full_name ?? paper.uploader_name ?? null;
  const date     = paper.uploaded_at
    ? new Date(paper.uploaded_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const terms = [paper.year, paper.semester, paper.exam_type].filter(Boolean).join(' · ');

  return createPortal(
    <motion.div
      ref={ref}
      className="ppv"
      style={{ x, y, width: WIDTH }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.09 } }}
      transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden="true"
    >
      <div className="ppv-title">{paper.title}</div>
      {terms && <div className="ppv-terms">{terms}</div>}

      <div className="ppv-rows">
        {subject && (
          <div className="ppv-row">
            <BookOpen size={12} className="ppv-row-icon" />
            <span>{subject}</span>
          </div>
        )}
        {teacher && (
          <div className="ppv-row">
            <GraduationCap size={12} className="ppv-row-icon" />
            <span>{teacher}</span>
          </div>
        )}
        {uploader && (
          <div className="ppv-row">
            <User size={12} className="ppv-row-icon" />
            <span>{uploader}</span>
          </div>
        )}
        {date && (
          <div className="ppv-row">
            <Calendar size={12} className="ppv-row-icon" />
            <span>{date}</span>
          </div>
        )}
      </div>
    </motion.div>,
    document.body,
  );
}

/**
 * Where the panel should sit for a given cursor position.
 *
 * Sides flip on available room rather than on which half of the screen the
 * cursor is in, so the panel stays put during ordinary movement and only swaps
 * when it would otherwise be clipped.
 */
function placeFor(cursorX, cursorY, height) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const fitsRight = cursorX + OFFSET_X + WIDTH + MARGIN <= vw;
  const x = fitsRight
    ? cursorX + OFFSET_X
    : Math.max(MARGIN, cursorX - OFFSET_X - WIDTH);

  // Centred on the cursor, then clamped so the panel never leaves the viewport.
  const y = Math.min(
    Math.max(MARGIN, cursorY - height / 2),
    Math.max(MARGIN, vh - height - MARGIN),
  );

  return { x, y };
}
