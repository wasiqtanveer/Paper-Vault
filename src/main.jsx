import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import './styles/main.css';
import App from './App.jsx';
import { installChunkReload } from './lib/chunkReload';
import { installGlobalErrorHandlers } from './lib/logger';

installChunkReload();
installGlobalErrorHandlers();

// Offline support: only in production builds, so dev never serves a stale cache.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* optional enhancement */ });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);
