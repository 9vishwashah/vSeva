// One-off prep script for Phase 6 (Android app icon + splash). Builds the
// source images @capacitor/assets expects in resources/, from the EXISTING
// approved vSeva branding (public/pwa-512x512.png — already the app's real
// icon everywhere else: browser tab, PWA home screen) — no new artwork.
import sharp from 'sharp';
import fs from 'fs';

const OUT = 'resources';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(`${OUT}/android`, { recursive: true });

const SOURCE_ICON = 'public/pwa-512x512.png';
const SOURCE_SPLASH = 'public/vseva-logo-full.png'; // higher-res, used at a smaller scale on the splash canvas

async function run() {
  // --- Legacy/store icon: source logo scaled to fill a 1024x1024 canvas ---
  await sharp(SOURCE_ICON)
    .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toFile(`${OUT}/icon.png`);

  // --- Adaptive icon background: solid white, matches the existing
  // ic_launcher_background.xml (#FFFFFF) already in the Android project ---
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  }).png().toFile(`${OUT}/android/icon-background.png`);

  // --- Adaptive icon foreground: the logo at ~65% of the canvas, centered,
  // transparent margin — Android's safe zone for adaptive icons guarantees
  // only the inner ~66% survives every launcher's mask (circle/squircle/etc),
  // so this keeps the sun rays and "Seva" text from being clipped ---
  const FOREGROUND_LOGO_SIZE = 666; // ~65% of 1024
  const logoBuffer = await sharp(SOURCE_ICON)
    .resize(FOREGROUND_LOGO_SIZE, FOREGROUND_LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png()
    .toFile(`${OUT}/android/icon-foreground.png`);

  // --- Splash screen: same logo, centered on white, modest size so it reads
  // clearly without dominating the whole screen (matches how the existing
  // web loading screen shows the logo — see App.tsx's `loading` state) ---
  const SPLASH_LOGO_WIDTH = 1400; // ~51% of the 2732 canvas — readable at real device size
  const splashMeta = await sharp(SOURCE_SPLASH).metadata();
  const splashLogoHeight = Math.round((splashMeta.height / splashMeta.width) * SPLASH_LOGO_WIDTH);
  const splashLogoBuffer = await sharp(SOURCE_SPLASH)
    .resize(SPLASH_LOGO_WIDTH, splashLogoHeight, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toBuffer();
  await sharp({
    create: { width: 2732, height: 2732, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: splashLogoBuffer, gravity: 'center' }])
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toFile(`${OUT}/splash.png`);

  console.log('Prepared resources/icon.png, resources/android/icon-background.png, resources/android/icon-foreground.png, resources/splash.png');
}

run().catch(e => { console.error(e); process.exit(1); });
