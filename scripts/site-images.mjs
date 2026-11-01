// Builds the public website's screenshots (public/vseva-site/screens/*.webp) from the anonymised app screenshots in
// docs/platform-guide/assets/screens. Run once after changing a screenshot: node scripts/site-images.mjs
// Each screen gets a 400px and a 760px WebP, used through <img srcset>.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const src = path.join(root, 'docs/platform-guide/assets/screens');
const out = path.join(root, 'public/vseva-site/screens');
fs.mkdirSync(out, { recursive: true });

// Extra screens that live outside the guide (captured for the website)
const extra = {
  'request-submitted': path.join(root, 'scripts/site-sources/request-submitted.jpg'),
  '53-share-sheet': path.join(root, 'scripts/site-sources/share-sheet.png'),
  '55-reminder-settings': path.join(root, 'scripts/site-sources/reminder-settings.png'),
  '56-upcoming-vihar': path.join(root, 'scripts/site-sources/upcoming-vihar.png'),
};

const files = fs.readdirSync(src).filter(f => f.endsWith('.jpg')).map(f => [f.replace(/\.jpg$/, ''), path.join(src, f)]);
for (const [name, file] of Object.entries(extra)) if (fs.existsSync(file)) files.push([name, file]);

for (const [name, file] of files) {
  for (const width of [400, 760]) {
    const dest = path.join(out, `${name}-${width}.webp`);
    await sharp(file).resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dest);
  }
  const { width, height } = await sharp(path.join(out, `${name}-760.webp`)).metadata();
  console.log(`${name} ${width}x${height}`);
}

// Pictures that are not phone screens (shown on their own): public/vseva-site/<name>-<width>.webp
const pictures = {
  'share-card-square': ['share-card-square.png', [400, 800]],
  'reminder-preview': ['reminder-preview.jpg', [360]],
};
for (const [name, [file, widths]] of Object.entries(pictures)) {
  for (const width of widths) {
    await sharp(path.join(root, 'scripts/site-sources', file)).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(root, 'public/vseva-site', `${name}-${width}.webp`));
  }
  console.log(name, widths.join(', '));
}
