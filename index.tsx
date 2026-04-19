import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './context/ToastContext';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);

// Catch beforeinstallprompt early before lazy-loaded components mount
(window as any).deferredPWAPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPWAPrompt = e;
  // Dispatch custom event to notify components that mount later
  window.dispatchEvent(new Event('pwa-prompt-ready'));
});

// PWA Auto Update mechanism
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // When the service worker controlling this page changes (e.g. new update activates)
    window.location.reload();
  });
}