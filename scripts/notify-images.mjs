// Branded artwork for phone notifications (used by netlify/functions/send-push.js and the Captain's preview):
//   notify/large-icon.png         256×256  – the round picture on the right of every notification
//   notify/reminder-<key>.jpg     1024×512 – the wide picture of a Vihar reminder, one per line in
//                                            services/reminderBanners.json (the Captain picks one)
//   notify/reminder.jpg                     – the default one, for older reminders
// The wide pictures sit on assets/Pilgrims Walking Toward Sunrise.png: the hazy, light left side carries the text,
// the walkers and the sun are on the right.
// vSeva's go in public/notify/, SSG's in brands/ssg/public/notify/ (laid over public/ in the SSG build, so each
// site serves its own). Run after changing a logo, a line or the background: node scripts/notify-images.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

sharp.cache(false);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const { banners, default: defaultKey } = JSON.parse(fs.readFileSync(path.join(root, 'services/reminderBanners.json'), 'utf8'));
const BACKGROUND = path.join(root, 'assets/Pilgrims Walking Toward Sunrise.png');
const W = 1024, H = 512;

const BRANDS = [
  { out: 'public/notify', logo: 'assets/vseva-logo-removebg-preview.png', eyebrow: 'VSEVA · VIHAR REMINDER', title: 'Every Step Counts', dot: true },
  { out: 'brands/ssg/public/notify', logo: 'brands/ssg/assets/ssg-emblem.png', eyebrow: 'SSG · VIHAR REMINDER', title: 'Shraman Seva Group', dot: false },
];

// Split a line into at most two rows of about `max` characters, preferring a natural pause (? . , !)
const wrap = (text, max = 28) => {
  if (text.length <= max) return [text];
  const pauses = [...text.matchAll(/[?.,!] /g)].map(m => m.index + 1).filter(i => i >= 10 && i <= max + 4);
  if (pauses.length) {
    const at = pauses.sort((a, b) => Math.abs(a - text.length / 2) - Math.abs(b - text.length / 2))[0];
    const parts = [text.slice(0, at).trim(), text.slice(at).trim()];
    if (parts.every(p => p.length <= max + 2)) return parts;
  }
  // otherwise break at the space nearest the middle, so both rows are about the same length
  const spaces = [...text.matchAll(/ /g)].map(m => m.index);
  if (spaces.length) {
    const at = spaces.sort((a, b) => Math.abs(a - text.length / 2) - Math.abs(b - text.length / 2))[0];
    return [text.slice(0, at), text.slice(at + 1)];
  }
  const words = text.split(' ');
  let first = '';
  while (words.length && (first + ' ' + words[0]).trim().length <= max) first = (first + ' ' + words.shift()).trim();
  return [first, words.join(' ')];
};

// The background, cover-fitted to 2:1 (kept a little low so the walkers' feet and the road stay in)
const bgMeta = await sharp(BACKGROUND).metadata();
const scaledH = Math.round(bgMeta.height * (W / bgMeta.width));
const background = await sharp(BACKGROUND).resize(W, scaledH).extract({ left: 0, top: Math.max(0, scaledH - H - 24), width: W, height: H }).png().toBuffer();

for (const b of BRANDS) {
  const dir = path.join(root, b.out);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (/^reminder.*\.png$/.test(f)) fs.rmSync(path.join(dir, f)); // older PNG versions
  const logo = await sharp(path.join(root, b.logo)).trim().resize(200, 200, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
  const logoAt = size => sharp(logo).resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).toBuffer();

  // Large icon: the logo on a white disc (Android shows it as a circle)
  const disc = Buffer.from(`<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg"><circle cx="128" cy="128" r="128" fill="#fff"/></svg>`);
  await sharp(disc).composite([{ input: await logoAt(176), top: 40, left: 40 }]).png().toFile(path.join(dir, 'large-icon.png'));

  for (const { key, line } of banners) {
    // No logo here: the notification already shows it as the round icon. The chosen line is the headline;
    // the brand line ("Every Step Counts." / "Shraman Seva Group") sits under it. Big type, so it reads at phone size.
    const rows = wrap(line, 22);
    const top = rows.length === 1 ? 30 : 0; // centre the block when the line takes one row
    const brandY = 196 + top + (rows.length - 1) * 58 + 62;
    const overlay = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="glow" cx="0.3" cy="0.45" r="0.6"><stop offset="0" stop-color="#FFFBF5" stop-opacity="0.9"/><stop offset="0.7" stop-color="#FFF6EC" stop-opacity="0.4"/><stop offset="1" stop-color="#FFF6EC" stop-opacity="0"/></radialGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#glow)"/>
      <text x="46" y="${126 + top}" font-family="Consolas, 'JetBrains Mono', monospace" font-size="24" letter-spacing="4" fill="#B9532A">${esc(b.eyebrow)}</text>
      ${rows.map((r, i) => `<text x="42" y="${196 + top + i * 58}" font-family="'Segoe UI Black', 'Arial Black', Arial, sans-serif" font-weight="900" font-size="50" fill="#1C1714">${esc(r)}</text>`).join('')}
      <text x="46" y="${brandY}" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="36" fill="#B9532A">${esc(b.title)}${b.dot ? '.' : ''}</text>
    </svg>`;
    const jpg = await sharp(background)
      .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
    fs.writeFileSync(path.join(dir, `reminder-${key}.jpg`), jpg);
    if (key === defaultKey) fs.writeFileSync(path.join(dir, 'reminder.jpg'), jpg);
  }
  console.log('wrote', b.out, banners.length, 'pictures');
}
