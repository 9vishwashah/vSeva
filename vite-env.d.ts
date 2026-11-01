/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/info" />
/// <reference lib="webworker" />

declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';

interface ImportMetaEnv {
  readonly VITE_BRAND?: 'vseva' | 'ssg';
  readonly VITE_SITE_URL?: string;
  readonly VITE_CONTACT_WHATSAPP?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_INSTAGRAM_URL?: string;
  readonly VITE_DEMO_CONTACT?: string;
}

// UTC yyyymmddhhmm stamp of this web build (vite.config.ts); used by services/liveUpdate.ts
declare const __APP_BUILD__: string;
