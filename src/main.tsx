import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {ErrorBoundary} from './components/ErrorBoundary';
import './index.css';

// Safely register PWA / Firebase service worker only in browser environments
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !window.location.protocol.startsWith('capacitor')) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
        .then((reg) => {
          console.log('Background ServiceWorker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('Background ServiceWorker registration note:', err);
        });
    } catch (e) {
      console.warn('ServiceWorker init note:', e);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
