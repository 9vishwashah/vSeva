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
