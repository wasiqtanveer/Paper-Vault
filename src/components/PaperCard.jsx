import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, FileText } from 'lucide-react';
import { EASE_OUT } from '../lib/motion';
import './PaperCard.css';

function PaperCard({ paper, index = 0 }) {
  const subject  = paper.subjects?.name ?? paper.subject_name ?? '—';
  const uploader = paper.profiles?.full_name ?? paper.uploader_name ?? 'Unknown';
  const date     = paper.uploaded_at
    ? new Date(paper.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      // Cap the stagger so large grids (and back-navigation) settle quickly and
      // hover stays responsive instead of waiting on a long entrance.
      transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.25), ease: EASE_OUT }}
      whileHover={{ y: -2, transition: { duration: 0.15, ease: 'easeOut' } }}
      whileTap={{ scale: 0.98 }}
    >
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
