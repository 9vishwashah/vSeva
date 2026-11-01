// Packages this web build as a live update for the installed Android app (runs at the end of `npm run build`,
// so every Netlify deploy publishes one). The app (services/liveUpdate.ts) reads
//   /app-update/<brand>.json   { build, url, checksum, minNative }
// and, when `build` is newer than its own, downloads the zip in the background and switches to it the next time
// the app has been in the background for a while or is reopened. No Play Store release needed for web changes.
//
// The zip is the app part of dist/: index.html is the plain app page (dist/app.html, not the website's
// prerendered landing page), and website-only files (screenshots, guide PDF, notification art, the web
// service worker) are left out.
//
// MIN_NATIVE: the lowest Android versionCode, per brand, that may take this bundle. It must include the updater
// plugin and every native plugin the web code calls. Raise it in the same commit as a web change that needs a
// new native plugin; older installs then wait for the Play Store update (and get the in-app "Update" prompt).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const MIN_NATIVE = { vseva: 4, ssg: 3 };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const stampFile = path.join(dist, 'app-build.json');
if (!fs.existsSync(stampFile)) {
  console.error('[app-update] dist/app-build.json is missing: run vite build first.');
  process.exit(1);
}
const { build, brand } = JSON.parse(fs.readFileSync(stampFile, 'utf8'));
if (!(brand in MIN_NATIVE)) {
  console.warn(`[app-update] no MIN_NATIVE for brand "${brand}"; no live update published.`);
  process.exit(0);
}

const SKIP = [
  /^app-update\//, /^vseva-site\/screens\//, /^notify\//, /\.pdf$/i,
  /^(sw|OneSignalSDKWorker)\.js$/, /^(_redirects|_headers|robots\.txt|sitemap\.xml)$/,
  /^(documentation|contact|support-us)\.html$/, /-og-preview\.png$/, /^app-build\.json$/,
];
const STORED = /\.(png|jpe?g|webp|gif|woff2?|zip)$/i; // already compressed

const files = {};
const walk = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(dist, full).split(path.sep).join('/');
    if (fs.statSync(full).isDirectory()) { walk(full); continue; }
    if (SKIP.some((re) => re.test(rel))) continue;
    files[rel] = [fs.readFileSync(full), { level: STORED.test(rel) ? 0 : 9 }];
  }
};
walk(dist);
// the app's own page, never the website's landing page
files['index.html'] = [fs.readFileSync(path.join(dist, 'app.html')), { level: 9 }];

const zip = Buffer.from(zipSync(files));
const checksum = crypto.createHash('sha256').update(zip).digest('hex');
const outDir = path.join(dist, 'app-update');
fs.mkdirSync(outDir, { recursive: true });
const zipName = `${brand}-${build}.zip`;
fs.writeFileSync(path.join(outDir, zipName), zip);
fs.writeFileSync(path.join(outDir, `${brand}.json`), JSON.stringify({
  brand, build, url: `/app-update/${zipName}`, checksum, minNative: MIN_NATIVE[brand], size: zip.length,
}, null, 2));
console.log(`[app-update] ${brand} build ${build}: ${Object.keys(files).length} files, ${(zip.length / 1024 / 1024).toFixed(2)} MB → dist/app-update/${zipName}`);
