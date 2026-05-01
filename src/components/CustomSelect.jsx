import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import './CustomSelect.css';

export default function CustomSelect({ value, onChange, options, placeholder = 'Select…', style }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => String(o.value) === String(value));

  return (
    <div className="cselect" ref={ref} style={style}>
      <button
        type="button"
        className={'cselect-trigger' + (open ? ' open' : '')}
        onClick={() => setOpen(v => !v)}
      >
        <span className={selected ? 'cselect-value' : 'cselect-placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={13} className={'cselect-chevron' + (open ? ' rotated' : '')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="cselect-menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
          >
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                className={'cselect-option' + (String(o.value) === String(value) ? ' selected' : '')}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                <span>{o.label}</span>
                {String(o.value) === String(value) && <Check size={12} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
