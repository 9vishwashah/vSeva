// Android notification small icons MUST be a flat white silhouette on a
// transparent background — the OS ignores color and forces monochrome
// rendering on API 21+ regardless of what's in the source PNG, and shows a
// generic bell/blank icon if the SDK's expected resource is missing
// entirely. OneSignal's Android SDK looks for a drawable literally named
// ic_stat_onesignal_default; this derives it from the same existing vSeva
// icon (public/pwa-512x512.png) used everywhere else — no new artwork, just
// the mechanical alpha-silhouette conversion Android requires for this slot.
import sharp from 'sharp';

const SOURCE = 'public/pwa-512x512.png';

const DENSITIES = {
  mdpi: 24,
  hdpi: 36,
  xhdpi: 48,
  xxhdpi: 72,
  xxxhdpi: 96,
};

async function run() {
  const { data, info } = await sharp(SOURCE)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Alpha-threshold silhouette: any visible pixel -> solid white, everything
  // else stays fully transparent.
  const silhouette = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    silhouette[i] = 255;
    silhouette[i + 1] = 255;
    silhouette[i + 2] = 255;
    silhouette[i + 3] = alpha > 40 ? 255 : 0;
  }

  const silhouetteBuffer = await sharp(silhouette, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();

  for (const [density, size] of Object.entries(DENSITIES)) {
    const dir = `android/app/src/main/res/drawable-${density}`;
    await sharp(silhouetteBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(`${dir}/ic_stat_onesignal_default.png`);
    console.log(`Wrote ${dir}/ic_stat_onesignal_default.png (${size}x${size})`);
  }

  // Density-less fallback drawable/ (some OS paths resolve here first).
  await sharp(silhouetteBuffer)
    .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('android/app/src/main/res/drawable/ic_stat_onesignal_default.png');
  console.log('Wrote android/app/src/main/res/drawable/ic_stat_onesignal_default.png (48x48)');
}

run().catch(e => { console.error(e); process.exit(1); });
