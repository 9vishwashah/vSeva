import type { CapacitorConfig } from '@capacitor/cli';

// webDir points at the same dist/ that `npm run build` already produces for
// Netlify — the Android app bundles this local build, it does not load the
// live site (server.url is intentionally omitted; that's a dev/live-reload
// mechanism, not the production model).
//
// One Android project, two apps (Gradle product flavors `vseva` and `ssg`, see android/app/build.gradle). Which one
// `cap sync` prepares is chosen by CAP_BRAND — normally set for you by `npm run android:vseva` / `android:ssg`
// (scripts/android.mjs), together with the matching web build. Default: vSeva, exactly as before.
const BRANDS = {
  vseva: { appId: 'in.vjas.vseva', appName: 'vSeva' },
  ssg: { appId: 'in.vjas.ssg', appName: 'Shraman Seva Group' },
} as const;

const brand = (process.env.CAP_BRAND || 'vseva').toLowerCase();
if (!(brand in BRANDS)) {
  throw new Error(`Unknown CAP_BRAND "${process.env.CAP_BRAND}". Expected one of: ${Object.keys(BRANDS).join(', ')}`);
}

const config: CapacitorConfig = {
  ...BRANDS[brand as keyof typeof BRANDS],
  webDir: 'dist',
};

export default config;
