import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <LanguageProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </LanguageProvider>
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
// When a new deployment's service worker takes over, the page should reload once to run the new code. Guarded so it
// can never loop: no reload when the page had no worker before (first visit), none when only the worker's URL query
// changed (OneSignal's "sw.js?appId=.." vs "sw.js" is the same file), and at most one reload per 30 seconds.
// The new worker finishes installing a minute or more after the site opens, so reloading right then threw people
// back to the home page mid-task. Instead the reload waits until the app is in the background (switched away or
// screen off), and the page they were on is remembered so they land back on it.
const reloadForUpdate = () => {
  try {
    const last = Number(sessionStorage.getItem('sw_reload_at') || 0);
    if (Date.now() - last < 30_000) return;
    sessionStorage.setItem('sw_reload_at', String(Date.now()));
    const page = (window as any).__appCurrentPage;
    if (page) sessionStorage.setItem('resume_page', page);
  } catch {
    // storage unavailable: still safe, the checks below already stop the URL-swap loop
  }
  window.location.reload();
};
const reloadWhenHidden = () => {
  if (document.visibilityState === 'hidden') { reloadForUpdate(); return; }
  const onHide = () => {
    if (document.visibilityState !== 'hidden') return;
    document.removeEventListener('visibilitychange', onHide);
    reloadForUpdate();
  };
  document.addEventListener('visibilitychange', onHide);
};
// After a deploy the old page's lazily loaded screens no longer exist on the server; load the new version instead
// of showing a broken screen.
window.addEventListener('vite:preloadError', (e) => { e.preventDefault(); reloadForUpdate(); });
if ('serviceWorker' in navigator) {
  let previous = navigator.serviceWorker.controller?.scriptURL || null;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const next = navigator.serviceWorker.controller?.scriptURL || null;
    const before = previous;
    previous = next;
    if (!before || !next) return;
    const samePathOnly = new URL(before).pathname === new URL(next).pathname && before !== next;
    if (samePathOnly) return;
    reloadWhenHidden();
  });
}