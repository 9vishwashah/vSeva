// Fits phone screenshots to Google Play's rule (9:16, each side 320-3840 px, PNG/JPEG, <= 8 MB).
// A tall phone screen (e.g. 1080x2400 = 9:20) is too tall for Play, so each image is scaled to fit
// inside 1080x1920 and centred on a cream background — nothing is cropped away.
//
//   node scripts/prepare_play_screenshots.mjs <folder-with-screenshots>
// Output: <folder>/play/<name>.png
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const dir = process.argv[2];
if (!dir) { console.error('usage: prepare_play_screenshots.mjs <folder>'); process.exit(2); }
const out = path.join(dir, 'play');
fs.mkdirSync(out, { recursive: true });

const W = 1080, H = 1920;
const files = fs.readdirSync(dir).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
if (!files.length) { console.error('No images found in', dir); process.exit(1); }

for (const f of files) {
  const dest = path.join(out, path.parse(f).name + '.png');
  await sharp(path.join(dir, f))
    .resize({ width: W, height: H, fit: 'contain', background: '#FDFBF7' })
    .flatten({ background: '#FDFBF7' })
    .png()
    .toFile(dest);
  console.log('✓', dest);
}
