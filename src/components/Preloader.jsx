import { motion, AnimatePresence } from 'framer-motion';
import ThemeLogo from './ThemeLogo';
import './Preloader.css';

export default function Preloader({ show, message = 'Loading…' }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="preloader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="preloader-inner"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1,    opacity: 1 }}
            exit={{    scale: 0.94, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <div className="preloader-logo">
              <ThemeLogo size={130} />
            </div>
            <div className="preloader-spinner">
              <div className="preloader-dot" />
              <div className="preloader-dot" />
              <div className="preloader-dot" />
            </div>
            <div className="preloader-message">{message}</div>
            <div className="preloader-by">by <strong>WT</strong></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
