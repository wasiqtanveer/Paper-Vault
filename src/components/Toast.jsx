import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

export default function Toast({ toast, onClose }) {
  const Icon = ICONS[toast.type] ?? Info;
  return (
    <motion.div
      className={`toast toast-${toast.type}`}
      // Errors interrupt; everything else waits its turn.
      role={toast.type === 'error' ? 'alert' : 'status'}
      initial={{ opacity: 0, x: 48, scale: 0.95 }}
      animate={{ opacity: 1, x: 0,  scale: 1    }}
      exit={{    opacity: 0, x: 48, scale: 0.95 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      layout
    >
      <Icon size={16} className="toast-icon" aria-hidden="true" />
      <span className="toast-msg">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="toast-action"
          onClick={() => { toast.action.onClick(); onClose(); }}
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss notification">
        <X size={14} aria-hidden="true" />
      </button>
    </motion.div>
  );
}
