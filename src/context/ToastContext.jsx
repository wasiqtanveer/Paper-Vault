import { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast from '../components/Toast';
import { useSound } from './SoundContext';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const { play } = useSound();

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    // Outcomes get their own sounds — the one place where a sound carries
    // information the visitor might otherwise miss while looking elsewhere.
    if (type === 'success' || type === 'error') play(type);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, [play]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(t => (
            <Toast key={t.id} toast={t} onClose={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
