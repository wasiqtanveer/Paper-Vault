import { useState, useCallback, useRef, useMemo } from 'react';
import { ToastContext } from './toast-context';
import { AnimatePresence } from 'framer-motion';
import Toast from '../components/Toast';
import { useSound } from './useSound';

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const { play } = useSound();
  const timers = useRef(new Map()); // id -> timeout handle

  const removeToast = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const schedule = useCallback((id, ms) => {
    clearTimeout(timers.current.get(id));
    timers.current.set(id, setTimeout(() => removeToast(id), ms));
  }, [removeToast]);

  // Hovering or focusing a toast stops its countdown, so its action button
  // (e.g. Undo) can still be reached by keyboard and slow pointers.
  const pause  = useCallback(id => { clearTimeout(timers.current.get(id)); }, []);
  const resume = useCallback(id => schedule(id, 2500), [schedule]);

  // `action` ({ label, onClick }) adds a button, e.g. Undo; such toasts stay
  // longer so there's time to reach it.
  const addToast = useCallback((message, type = 'info', { action } = {}) => {
    const id = Date.now() + Math.random();
    // Outcomes get their own sounds — the one place where a sound carries
    // information the visitor might otherwise miss while looking elsewhere.
    if (type === 'success' || type === 'error') play(type);
    setToasts(prev => [...prev, { id, message, type, action }]);
    schedule(id, action ? 10000 : 3500);
  }, [play, schedule]);

  return (
    <ToastContext.Provider value={useMemo(() => ({ addToast }), [addToast])}>
      {children}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(t => (
            <Toast key={t.id} toast={t} onClose={() => removeToast(t.id)} onPause={() => pause(t.id)} onResume={() => resume(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
