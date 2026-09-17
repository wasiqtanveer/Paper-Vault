import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import './EditPaperModal.css';

/**
 * Small form pop-up for the admin panel's "Add subject / teacher / contributor"
 * actions. Same shell as EditPaperModal so every dialog in the app matches.
 * Escape or a backdrop click closes it; Enter submits.
 */
export default function AdminFormModal({ title, submitLabel = 'Add', busy = false, onSubmit, onClose, children, width = 460 }) {
  const panelRef = useFocusTrap();
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      className="epm-backdrop"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onClick={onClose}
    >
      <motion.div
        ref={panelRef}
        className="epm-panel"
        style={{ maxWidth: width }}
        role="dialog" aria-modal="true" aria-label={title}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
      >
        <div className="epm-header">
          <span className="epm-title">{title}</span>
          <button className="epm-close" onClick={onClose} type="button" aria-label="Close"><X size={16} /></button>
        </div>
        <form className="epm-body" onSubmit={e => { e.preventDefault(); onSubmit(); }}>
          {children}
          <div className="epm-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
