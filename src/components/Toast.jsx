import { motion } from 'framer-motion';
import './Toast.css';

export default function Toast({ toast, onClose }) {
  return (
    <motion.div
      className={`toast toast-${toast.type}`}
      onClick={onClose}
      title="Click to dismiss"
      initial={{ opacity: 0, x: 48, scale: 0.95 }}
      animate={{ opacity: 1, x: 0,  scale: 1    }}
      exit={{    opacity: 0, x: 48, scale: 0.95 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      layout
    >
      {toast.message}
    </motion.div>
  );
}
