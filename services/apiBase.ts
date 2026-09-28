// Resolves a Netlify Function path: relative on web (unchanged today), absolute
// against the production host when running inside the native Capacitor app,
// where there is no same-origin Netlify deployment to resolve a relative path
// against. Uses a duck-typed check instead of importing @capacitor/core so this
// works before Capacitor is added to the project (Phase 1).
const isNativePlatform = (): boolean => {
  const capacitor = (globalThis as any).Capacitor;
  return !!capacitor && typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform();
};

const NATIVE_API_ORIGIN = 'https://vseva.vjas.in';

export const fnUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return isNativePlatform()
    ? `${NATIVE_API_ORIGIN}/.netlify/functions/${cleanPath}`
    : `/.netlify/functions/${cleanPath}`;
};
