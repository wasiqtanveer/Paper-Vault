import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ImageViewer.css';

export default function ImageViewer({ src, alt }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="image-viewer-wrap">
      <img
        src={src}
        alt={alt}
        className="image-viewer-img"
        onClick={() => setOpen(true)}
        title="Click to zoom"
      />
      <AnimatePresence>
        {open && (
          <motion.div
            className="image-viewer-modal"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.img
              src={src}
              alt={alt}
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{    scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
