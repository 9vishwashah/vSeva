import type { CapacitorConfig } from '@capacitor/cli';

// webDir points at the same dist/ that `npm run build` already produces for
// Netlify — the Android app bundles this local build, it does not load the
// live site (server.url is intentionally omitted; that's a dev/live-reload
// mechanism, not the production model).
const config: CapacitorConfig = {
  appId: 'in.vjas.vseva',
  appName: 'vSeva',
  webDir: 'dist',
};

export default config;
