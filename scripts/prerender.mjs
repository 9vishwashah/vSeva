// Prerenders vSeva's public website (/, /documentation, /contact, /support-us) into static HTML after `vite build`,
// so search engines and link previews get the full text, a unique title, description, canonical URL and
// structured data for each page without running JavaScript. The browser then hydrates the same markup.
//
//   npm run build   →   vite build && node scripts/prerender.mjs
//
// Writes dist/index.html (/) and dist/<page>.html (Netlify serves /documentation from documentation.html).
// Other brands (VITE_BRAND other than vseva) are left untouched.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : 'production';
const env = loadEnv(mode, root, '');
const brand = env.VITE_BRAND || process.env.VITE_BRAND || 'vseva';
if (brand !== 'vseva') {
  console.log(`[prerender] brand "${brand}" has no public website pages; skipping.`);
  process.exit(0);
}

const dist = path.join(root, 'dist');
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (template.includes('data-prerendered')) throw new Error('[prerender] dist/index.html is already prerendered; run vite build first.');

// 1. Build the server renderer with the same aliases as the app
const outDir = path.join(root, 'node_modules/.cache/vseva-prerender');
await build({
  configFile: false,
  root,
  mode,
  logLevel: 'warn',
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@brand$/, replacement: path.join(root, 'brands/vseva/index.ts') },
      { find: /^@brand\//, replacement: path.join(root, 'brands/vseva') + '/' },
      { find: /^@\//, replacement: root + '/' },
    ],
  },
  build: {
    ssr: path.join(root, 'brands/vseva/site/entry-server.tsx'),
    outDir,
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'entry-server.mjs', format: 'es' } },
  },
});
const server = await import(pathToFileURL(path.join(outDir, 'entry-server.mjs')).href);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Shown before the app's JavaScript runs. Hides the prerendered page when it is not the page to show: another
// route served this same HTML, or "/" opened by a signed-in user, the installed app or the Android app — the app
// then renders as it always has. Otherwise marks the page with .js so scroll reveals can run.
const headScript = forPath => `<script>(function(){var d=document.documentElement;try{var p=(location.pathname.replace(/\\/+$/,'')||'/').toLowerCase();var s=false;try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf('sb-')===0&&/-auth-token$/.test(k)){s=true;break}}}catch(e){s=true}var a=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true||/; wv\\)/.test(navigator.userAgent)||!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());var r=${JSON.stringify(forPath)};if(p!==r||(r==='/'&&(s||a||/[?&]vihar=/.test(location.search))))d.classList.add('app-shell');else{d.classList.add('js','vs-site');setTimeout(function(){if(!window.__vsLive)d.classList.remove('js')},5000)}}catch(e){}})();</script>
  <style>.app-shell #root{display:none}</style>`;

// The site's fonts are self-hosted (brands/vseva/site/site.css); all three are preloaded.
const FONT_PRELOADS = ['SchibstedGrotesk', 'InstrumentSans', 'JetBrainsMono']
  .map(f => `<link rel="preload" href="/vseva-site/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`)
  .join('\n  ');

const replaceOrFail = (html, re, value, what) => {
  if (!re.test(html)) throw new Error(`[prerender] could not find ${what} in dist/index.html`);
  return html.replace(re, value);
};

for (const p of server.PATHS) {
  const meta = server.PAGE_META[p];
  const url = server.canonical(p);
  const body = server.render(p);
  let html = template;
  html = replaceOrFail(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`, 'title');
  html = replaceOrFail(html, /<meta name="description"[\s\S]*?>/, `<meta name="description" content="${esc(meta.description)}">`, 'description');
  html = replaceOrFail(html, /<link rel="canonical"[\s\S]*?\/>/, `<link rel="canonical" href="${url}" />`, 'canonical');
  html = replaceOrFail(html, /<meta property="og:url"[\s\S]*?\/>/, `<meta property="og:url" content="${url}" />`, 'og:url');
  html = replaceOrFail(html, /<meta property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${esc(meta.title)}" />`, 'og:title');
  html = replaceOrFail(html, /<meta property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${esc(meta.description)}" />`, 'og:description');
  html = replaceOrFail(html, /<meta name="twitter:title"[\s\S]*?\/>/, `<meta name="twitter:title" content="${esc(meta.title)}" />`, 'twitter:title');
  html = replaceOrFail(html, /<meta name="twitter:description"[\s\S]*?\/>/, `<meta name="twitter:description" content="${esc(meta.description)}" />`, 'twitter:description');
  html = replaceOrFail(
    html,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${JSON.stringify(server.structuredData(p)).replace(/</g, '\\u003c')}</script>`,
    'JSON-LD',
  );
  html = html.replace('</head>', `  ${FONT_PRELOADS}\n  ${headScript(p)}\n</head>`);
  // The app's own fonts (Manrope / Playfair) aren't used by these pages: load them without blocking the first paint.
  html = html.replace(
    /<link\s+href="(https:\/\/fonts\.googleapis\.com\/css2\?family=Manrope[^"]*)"\s+rel="stylesheet">/,
    `<link href="$1" rel="stylesheet" media="print" onload="this.media='all'">`,
  );
  html = replaceOrFail(html, /<div id="root"[^>]*><\/div>/, `<div id="root" data-prerendered="${p}">${body}</div>`, '#root');

  const file = p === '/' ? 'index.html' : `${p.slice(1)}.html`;
  fs.writeFileSync(path.join(dist, file), html);
  console.log(`[prerender] ${p} → dist/${file} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
}
