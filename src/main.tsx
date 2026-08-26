import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Auto-recover from chunk 404s after new Vercel / PWA deployments
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[Vite] Preload error detected, reloading to fetch latest assets...', event);
    const reloaded = window.sessionStorage.getItem('vite_preload_auto_reload');
    if (!reloaded) {
      window.sessionStorage.setItem('vite_preload_auto_reload', 'true');
      window.location.reload();
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
