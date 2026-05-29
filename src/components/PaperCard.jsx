import { memo, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, FileText } from 'lucide-react';
import { EASE_OUT } from '../lib/motion';
import PaperPreview from './PaperPreview';
import './PaperCard.css';

/** Hover has to look deliberate before it opens anything. Below roughly this,
 *  sweeping the pointer across a grid flashes previews the visitor never asked
 *  for; much above it, a genuine hover feels unresponsive. */
const PREVIEW_DELAY_MS = 380;

function PaperCard({ paper, index = 0 }) {
  const timerRef = useRef(null);
  const [origin, setOrigin] = useState(null);

  // Fine pointers only. On touch, `pointerenter` fires on tap and the preview
  // would flash over the page you are already navigating to.
  const canPreview = typeof window !== 'undefined'
    && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function openPreview(e) {
    if (!canPreview) return;
    // Capture the coordinates now: the event object is pooled-adjacent and the
    // pointer will have moved by the time the delay elapses, but opening at the
    // position the hover *started* keeps the panel from snapping into place.
    const { clientX, clientY } = e;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setOrigin({ x: clientX, y: clientY });
    }, PREVIEW_DELAY_MS);
  }

  function closePreview() {
    clearTimeout(timerRef.current);
    setOrigin(null);
  }

  const subject  = paper.subjects?.name ?? paper.subject_name ?? '—';
  const uploader = paper.profiles?.full_name ?? paper.uploader_name ?? 'Unknown';
  const date     = paper.uploaded_at
    ? new Date(paper.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <motion.div
      // A short settle, not an arrival. The travel is small enough to read as
      // the card resolving into place rather than flying in, and the scale is
      // gone: scaling a card resamples its cover image for the whole entrance,
      // which is what made a grid of these look soft while it appeared.
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      // The stagger exists to make the grid read as a list arriving in order.
      // Capped hard, because past ~150ms it stops reading as sequence and starts
      // reading as the page being slow.
      transition={{ duration: 0.2, delay: Math.min(index * 0.018, 0.14), ease: EASE_OUT }}
      whileHover={{ y: -2, transition: { duration: 0.15, ease: 'easeOut' } }}
      whileTap={{ scale: 0.98 }}
      onPointerEnter={openPreview}
      onPointerLeave={closePreview}
      // Dismiss on press: the click is navigating away, and a panel that
      // outlives the page it described is just debris on the next screen.
      onPointerDown={closePreview}
    >
      <AnimatePresence>
        {origin && <PaperPreview key="ppv" paper={paper} origin={origin} />}
      </AnimatePresence>

      <Link to={`/paper/${paper.id}`} className="paper-card">
        {paper.image_url ? (
          <img src={paper.image_url} alt={paper.title} className="paper-card-image" loading="lazy" width="400" height="300" />
        ) : (
          <div className="paper-card-image-placeholder">
            <FileText size={32} strokeWidth={1.2} />
          </div>
        )}
        <div className="paper-card-body">
          <div className="paper-card-title">{paper.title}</div>
          <div className="paper-card-meta">
            {subject}{paper.year ? ` · ${paper.year}` : ''}{paper.semester ? ` · ${paper.semester}` : ''}
          </div>
          <div className="paper-card-footer">
            <span className="paper-card-date"><Calendar size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />{date}</span>
            <span className="paper-card-uploader">{uploader}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default memo(PaperCard);
