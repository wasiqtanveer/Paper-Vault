import { useState, useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

function EyeIcon({ visible }) {
  return (
    <svg
      width="15" height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {visible ? (
          <motion.g
            key="open"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            style={{ transformOrigin: '12px 12px' }}
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </motion.g>
        ) : (
          <motion.g
            key="closed"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            style={{ transformOrigin: '12px 12px' }}
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

export default function PasswordInput({ id, value, onChange, ...props }) {
  const [show,   setShow]   = useState(false);
  const [fading, setFading] = useState(false);
  const uid     = useId();
  const inputId = id ?? uid;

  function toggle() {
    setFading(true);
    setTimeout(() => {
      setShow(v => !v);
      setFading(false);
    }, 180); // matches site's standard 0.18s ease transition
  }

  return (
    <div className="pw-wrap">
      <input
        id={inputId}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        className={fading ? 'pw-fading' : ''}
        {...props}
      />
      <button
        type="button"
        className={'pw-toggle' + (show ? ' pw-toggle-active' : '')}
        onClick={toggle}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
      >
        <EyeIcon visible={show} />
      </button>
    </div>
  );
}
