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
  /^app-update\//, /^vseva-site\//, /^notify\//, /\.pdf$/i, /^gone\.txt$/,
  /^vseva-og/, /^vseva-logo-full\.png$/, /^vseva-logo-removebg\.png$/, // website / link-preview images
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

// What the app actually contains, ignoring things that change on every build without changing the app: the
// build stamp, and the content-hash part of file names (a file's hash only changes when its content does,
// and that content is compared here too).
const HASHED_NAME = /-[A-Za-z0-9_-]{8}\.(js|css|png|jpe?g|svg|webp|gif|woff2?)\b/g;
const TEXT = /\.(js|css|html|json|webmanifest|svg|txt)$/i;
const contentHash = (() => {
  const h = crypto.createHash('sha256');
  const norm = (s) => s.replace(HASHED_NAME, '-HASH.$1');
  // One line per file: normalised name + digest of its normalised content. Sorted, so the order depends on
  // neither the hash part of names nor which of several same-named chunks (index-*.js) was listed first.
  const lines = Object.keys(files).map((name) => {
    const buf = files[name][0];
    const body = TEXT.test(name) ? norm(buf.toString('utf8').split(build).join('BUILD')) : buf;
    return `${norm(name)} ${crypto.createHash('sha256').update(body).digest('hex')}`;
  }).sort();
  h.update(lines.join('\n'));
  return h.digest('hex');
})();

const outDir = path.join(dist, 'app-update');
fs.mkdirSync(outDir, { recursive: true });
const manifestPath = path.join(outDir, `${brand}.json`);

// Website-only change? Then keep publishing the bundle the phones already have, so a deploy doesn't make every
// installed app download ~3 MB again. Needs the live site's address (Netlify sets URL); any doubt -> new bundle.
async function reuseLiveBundle() {
  const site = (process.env.URL || '').replace(/\/$/, '');
  if (!site || process.env.CONTEXT !== 'production' || process.env.FORCE_APP_UPDATE) return false;
  try {
    const res = await fetch(`${site}/app-update/${brand}.json`, { cache: 'no-store' });
    if (!res.ok) return false;
    const live = await res.json();
    if (live?.contentHash !== contentHash || live.minNative !== MIN_NATIVE[brand] || typeof live.url !== 'string') return false;
    const zipRes = await fetch(new URL(live.url, site));
    if (!zipRes.ok) return false;
    const liveZip = Buffer.from(await zipRes.arrayBuffer());
    if (crypto.createHash('sha256').update(liveZip).digest('hex') !== live.checksum) return false;
    fs.writeFileSync(path.join(outDir, path.basename(live.url)), liveZip);
    fs.writeFileSync(manifestPath, JSON.stringify(live, null, 2));
    console.log(`[app-update] ${brand}: app unchanged since build ${live.build}, keeping that bundle (phones download nothing).`);
    return true;
  } catch (err) {
    console.warn('[app-update] could not compare with the live bundle, publishing a new one:', err?.message || err);
    return false;
  }
}

if (!(await reuseLiveBundle())) {
  const zip = Buffer.from(zipSync(files));
  const checksum = crypto.createHash('sha256').update(zip).digest('hex');
  const zipName = `${brand}-${build}.zip`;
  fs.writeFileSync(path.join(outDir, zipName), zip);
  fs.writeFileSync(manifestPath, JSON.stringify({
    brand, build, url: `/app-update/${zipName}`, checksum, minNative: MIN_NATIVE[brand], size: zip.length, contentHash,
  }, null, 2));
  console.log(`[app-update] ${brand} build ${build}: ${Object.keys(files).length} files, ${(zip.length / 1024 / 1024).toFixed(2)} MB → dist/app-update/${zipName}`);
}
