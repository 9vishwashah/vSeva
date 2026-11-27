// Browser entry for vSeva's public website (/, /documentation, /contact, /support-us, /vihar-routes) when a signed-out
// visitor opens a prerendered page. It hydrates the same tree brands/vseva/site/entry-server.tsx rendered at build time,
// without loading the app itself (App.tsx and everything behind it), so the website downloads far less JavaScript.
// Login and every app route still load the app (index.tsx).
import React from 'react';
import ReactDOM from 'react-dom/client';
import { LanguageProvider } from '../../context/LanguageContext';
import { ToastProvider } from '../../context/ToastContext';
import LandingPage from './site/LandingPage';

const PublicRoutes = React.lazy(() => import('./PublicRoutes'));

export function hydrateSite(root: HTMLElement, path: string) {
  const page =
    path === '/' ? (
      <LandingPage onGetStarted={() => { window.location.href = '/login'; }} />
    ) : (
      <React.Suspense fallback={<div className="min-h-screen bg-[#F2EEE7]" />}>
        <PublicRoutes path={path} />
      </React.Suspense>
    );
  ReactDOM.hydrateRoot(
    root,
    <React.StrictMode>
      <LanguageProvider>
        <ToastProvider>{page}</ToastProvider>
      </LanguageProvider>
    </React.StrictMode>,
  );
}
