// Prepares the Android project for ONE brand: builds that brand's web app and syncs it into android/.
//
//   npm run android:vseva         vSeva  (in.vjas.vseva)
//   npm run android:ssg           Shraman Seva Group  (in.vjas.ssg)
//   npm run android:ssg -- --open     ...and open the project in Android Studio
//   npm run android:ssg -- --run      ...and install + launch it on a connected device / emulator
//
// Then, in Android Studio: Build > Select Build Variant > vsevaDebug or ssgDebug, and Run. (android/app/build.gradle
// refuses to build a variant whose bundled web app belongs to the other brand, so a mix-up can't slip through.)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [brand, ...flags] = process.argv.slice(2);
const BRANDS = {
  vseva: { mode: 'production', viteArgs: [], flavor: 'vseva', label: 'vSeva' },
  ssg: { mode: 'ssg', viteArgs: ['--mode', 'ssg'], flavor: 'ssg', label: 'Shraman Seva Group' },
};
if (!BRANDS[brand]) {
  console.error('Usage: node scripts/android.mjs <vseva|ssg> [--open] [--run]');
  process.exit(2);
}
const { mode, viteArgs, flavor, label } = BRANDS[brand];
const env = { ...process.env, CAP_BRAND: brand };

// ---- 1. Check what the web build will contain ------------------------------------------------------------------
if (brand === 'ssg') {
  const ssgEnv = loadEnv(mode, root, '');
  const vsevaEnv = loadEnv('production', root, '');
  if (!ssgEnv.VITE_SITE_URL) {
    console.error(`
✗ VITE_SITE_URL is not set for the SSG build.
  The installed app reaches the server through your site's address, so it is required. Create a file named
  .env.ssg.local in the project root (it is git-ignored) containing:

      VITE_SITE_URL=https://ssg.vjas.in
      VITE_ONESIGNAL_APP_ID=<the OneSignal App ID of your SSG OneSignal app>
`);
    process.exit(1);
  }
  if (!ssgEnv.VITE_ONESIGNAL_APP_ID || ssgEnv.VITE_ONESIGNAL_APP_ID === vsevaEnv.VITE_ONESIGNAL_APP_ID) {
    console.warn(`
! VITE_ONESIGNAL_APP_ID for SSG is not set (it would fall back to vSeva's). Push notifications are switched OFF in
  this build so a test phone is not registered in vSeva's OneSignal app. To enable them, add the SSG OneSignal App ID
  to .env.ssg.local:   VITE_ONESIGNAL_APP_ID=<id>
`);
    env.VITE_ONESIGNAL_APP_ID = ''; // process env wins over .env files in Vite
  }
}

// ---- 2. Build the web app, 3. sync it into the Android project ---------------------------------------------------
const run = (cmd, args, extraEnv = env) => {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true, env: extraEnv });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

console.log(`\n=== ${label}: building the web app and syncing it into android/ ===`);
run('npx', ['vite', 'build', ...viteArgs]);
run('npx', ['cap', 'sync', 'android']);

// ---- 4. Optionally open / run ------------------------------------------------------------------------------------
if (flags.includes('--run')) {
  run('npx', ['cap', 'run', 'android', '--flavor', flavor]);
} else if (flags.includes('--open')) {
  run('npx', ['cap', 'open', 'android']);
} else {
  console.log(`
✓ ${label} is bundled into the Android project.
  In Android Studio:  Build > Select Build Variant > ${flavor}Debug  (module "app"), then Run.
  (Open it with:  npm run android:${brand} -- --open)
`);
}
