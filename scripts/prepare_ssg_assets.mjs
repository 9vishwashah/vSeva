// One-off: derives every SSG image the app needs from the two source files the
// client supplied in SSG/ (logo + guru photo). Re-run if either source changes:
//   node scripts/prepare_ssg_assets.mjs
// Outputs are committed, so builds never depend on this script or on sharp.

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = (f) => path.join(root, 'SSG', f);
const assets = path.join(root, 'brands/ssg/assets');
const pub = path.join(root, 'brands/ssg/public');
fs.mkdirSync(assets, { recursive: true });
fs.mkdirSync(pub, { recursive: true });

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const logoPath = src('SSG LOGO.png');
const guruPath = src('guru.png');

// Sun + muni artwork only (no text), squared with white so it works as an icon.
// Bounds measured on the 1254x1254 original.
const emblemBuffer = await sharp(logoPath)
  .extract({ left: 190, top: 80, width: 880, height: 672 })
  .extend({ top: 104, bottom: 104, left: 0, right: 0, background: WHITE })
  .png()
  .toBuffer();

const emblem = (size, padPct = 0) => {
  const inner = Math.round(size * (1 - padPct * 2));
  const pad = Math.round((size - inner) / 2);
  return sharp(emblemBuffer)
    .resize(inner, inner, { fit: 'contain', background: WHITE })
    .extend({ top: pad, bottom: size - inner - pad, left: pad, right: size - inner - pad, background: WHITE })
    .flatten({ background: WHITE })
    .png({ compressionLevel: 9 });
};

// In-app artwork
await sharp(logoPath).resize(900, 900).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(path.join(assets, 'ssg-logo-full.png'));
await emblem(384).toFile(path.join(assets, 'ssg-emblem.png'));
await sharp(guruPath).resize({ width: 800 }).webp({ quality: 82 }).toFile(path.join(assets, 'guru.webp'));

// Public overlay (replaces the vSeva files of the same name in the SSG build)
await emblem(192, 0.06).toFile(path.join(pub, 'pwa-192x192.png'));
await emblem(512, 0.14).toFile(path.join(pub, 'pwa-512x512.png')); // padded: also serves as the maskable icon
await emblem(180, 0.06).toFile(path.join(pub, 'apple-touch-icon.png'));
await sharp(logoPath).resize(512, 512).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(path.join(pub, 'ssg-logo-full.png'));

// 1200x630 link-preview card: soft sunrise background, logo centred.
const ogW = 1200, ogH = 630;
const bg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${ogW}" height="${ogH}">
     <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0" stop-color="#FFF4E0"/><stop offset="1" stop-color="#FFE0B8"/>
     </linearGradient></defs>
     <rect width="100%" height="100%" fill="url(#g)"/>
   </svg>`
);
const ogLogo = await sharp(logoPath).resize(590, 590).png().toBuffer();
await sharp(bg)
  .composite([{ input: ogLogo, left: Math.round((ogW - 590) / 2), top: 20 }])
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toFile(path.join(pub, 'ssg-og.png'));

// Developer credit logo (footer of the landing page): trim the cream margin, keep it small.
await sharp(src('VJAS.jpeg'))
  .trim({ background: '#FBFBF7', threshold: 18 })
  .resize({ width: 360, withoutEnlargement: true })
  .webp({ quality: 88 })
  .toFile(path.join(assets, 'developer-logo.webp'));

for (const dir of [assets, pub]) {
  for (const f of fs.readdirSync(dir)) {
    console.log(path.relative(root, path.join(dir, f)), (fs.statSync(path.join(dir, f)).size / 1024).toFixed(0) + 'KB');
  }
}
