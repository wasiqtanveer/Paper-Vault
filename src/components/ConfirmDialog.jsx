import { useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import './EditPaperModal.css';
import './ConfirmDialog.css';

/**
 * The dialog UI behind `confirmDialog()` (see lib/confirmDialog.jsx).
 *
 * Names the thing being destroyed, focuses the safe choice (Cancel) first, and
 * closes on Escape or a backdrop click, which all resolve to "no".
 */
export default function ConfirmDialog({ title, body, confirmLabel = 'Confirm', danger = true, onDone }) {
  const cancelRef = useRef(null);
  // Focus starts on Cancel (the safe choice) and Tab stays inside the dialog.
  const panelRef = useFocusTrap({ initialFocus: () => cancelRef.current });

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onDone(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDone]);

  return (
    <m.div
      className="epm-backdrop"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.14 }}
      onClick={() => onDone(false)}
    >
      <m.div
        ref={panelRef}
        className="epm-panel cfd-panel"
        role="alertdialog" aria-modal="true" aria-labelledby="cfd-title" aria-describedby="cfd-body"
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
      >
        <div className="cfd-body">
          {danger && <span className="cfd-icon" aria-hidden="true"><AlertTriangle size={18} /></span>}
          <div>
            <div id="cfd-title" className="cfd-title">{title}</div>
            {body && <p id="cfd-body" className="cfd-text">{body}</p>}
          </div>
        </div>
        <div className="epm-footer cfd-footer">
          <button ref={cancelRef} type="button" className="btn btn-ghost" onClick={() => onDone(false)}>Cancel</button>
          <button type="button" className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={() => onDone(true)}>
            {confirmLabel}
          </button>
        </div>
      </m.div>
    </m.div>
  );
}
