// Build-time renderer for the public website (used only by scripts/prerender.mjs, never shipped to browsers).
// The tree mirrors what index.tsx + App.tsx render for these paths, so the browser can hydrate the HTML.
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LanguageProvider } from '../../../context/LanguageContext';
import { ToastProvider } from '../../../context/ToastContext';
import LandingPage from './LandingPage';
import PublicRoutes from '../PublicRoutes';
import { PAGE_META, canonical, structuredData, type PublicPath } from './seo';
import { SCREENS } from './content';
import type { SiteData } from './siteData';

export const PATHS = Object.keys(PAGE_META) as PublicPath[];
export { PAGE_META, canonical, structuredData };
export const HERO_IMAGE = `/vseva-site/screens/${SCREENS.sevakHome.name}-760.webp`;

// data: the leaderboard / route directory for this page (siteData.ts). The page reads it the way the browser will, from
// __VS_DATA__, so the HTML and the browser's first render match.
export function render(path: PublicPath, data: SiteData = {}): string {
  (globalThis as any).__VS_DATA__ = data;
  const page =
    path === '/' ? (
      <LandingPage onGetStarted={() => undefined} />
    ) : (
      <React.Suspense fallback={<div className="min-h-screen bg-[#F2EEE7]" />}>
        <PublicRoutes path={path} />
      </React.Suspense>
    );
  return renderToString(
    <React.StrictMode>
      <LanguageProvider>
        <ToastProvider>{page}</ToastProvider>
      </LanguageProvider>
    </React.StrictMode>,
  );
}
