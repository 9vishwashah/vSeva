// Prerenders vSeva's public website (/, /documentation, /contact, /support-us, /vihar-routes) into static HTML after
// `vite build`, so search engines, AI assistants and link previews get the full text, a unique title, description,
// canonical URL and structured data for each page without running JavaScript. The browser then hydrates the same markup.
// The leaderboard and the Vihar route directory are rendered in too (from the public files the Super Admin "Refresh
// website data" button publishes), and the build also writes dist/llms.txt and refreshes the sitemap dates.
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
import { drawLeaderboardOg } from './og-leaderboard.mjs';

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
// route served this same HTML, or "/" opened in the installed app, the Android app or from a shared Vihar link — the
// app then renders as it always has. A browser that is signed in still gets the website on "/" (a shared link should
// show the website, not jump into the app); the site offers "Open my dashboard" instead (SiteShell in ui.tsx).
// Otherwise marks the page with .js so scroll reveals can run.
const headScript = (forPath, fontsHref) => `<script>(function(){var d=document.documentElement;function f(){var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(fontsHref)};document.head.appendChild(l);var c=window.Capacitor;if(!(c&&c.isNativePlatform&&c.isNativePlatform())){var o=document.createElement('script');o.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';o.async=true;document.head.appendChild(o)}}try{var p=(location.pathname.replace(/\\/+$/,'')||'/').toLowerCase();var s=false;try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf('sb-')===0&&/-auth-token$/.test(k)){s=true;break}}}catch(e){s=true}var a=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true||/; wv\\)/.test(navigator.userAgent)||!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());var r=${JSON.stringify(forPath)};if(p!==r||(r==='/'&&(a||/[?&]vihar=/.test(location.search)))){d.classList.add('app-shell');f()}else{d.classList.add('js','vs-site');setTimeout(function(){if(!window.__vsLive)d.classList.remove('js')},5000)}}catch(e){f()}})();</script>
  <style>.app-shell #root{display:none}</style>`;

// The site's own copies of the Lekha fonts (brands/vseva/site/site.css), preloaded. The app's Google Fonts stylesheet is
// taken out of these pages and only added (by headScript) when the app renders instead of the website.
const FONT_PRELOADS = ['BricolageGrotesque', 'Geist']
  .map(f => `<link rel="preload" href="/vseva-site/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`)
  .join('\n  ');
const FONTS_RE = /\s*<link\s+href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]*)"\s+rel="stylesheet" media="print" onload="this\.media='all'">/;
const fontsMatch = FONTS_RE.exec(template);
if (!fontsMatch) throw new Error('[prerender] could not find the font stylesheet in dist/index.html');
const FONTS_HREF = fontsMatch[1].replace(/&amp;/g, '&');

// 2. The website data (leaderboard, route directory): the public files from Supabase Storage. A failed download only
//    means those sections load in the browser instead, as before.
const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
const getJson = async file => {
  try {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/public/public-data/${file}?t=${Date.now()}`);
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } catch (e) {
    console.warn(`[prerender] ${file} not available (${e.message}); that section will load in the browser`);
    return null;
  }
};
const leaderboard = SUPABASE_URL ? await getJson('leaderboard.json') : null;
const routes = SUPABASE_URL ? await getJson('route-directory.json') : null;
// Link previews (1200 x 630) for pages that are shared on their own; the others keep the site-wide picture.
// /leaderboard's is drawn now with the current top 3 (scripts/og-leaderboard.mjs) over public/vseva-og-leaderboard.jpg
// (the same artwork without names, kept as the fallback). The ?v= date makes WhatsApp and others fetch a new picture.
let ogLeaderboard = { url: 'https://vseva.vjas.in/vseva-og-leaderboard.jpg', alt: 'Top Vihar Sevaks Globally: the vSeva leaderboard' };
if (leaderboard?.sevaks?.length) {
  try {
    const drawn = await drawLeaderboardOg(leaderboard, path.join(dist, 'vseva-og-leaderboard.jpg'), root);
    ogLeaderboard = {
      url: `https://vseva.vjas.in/vseva-og-leaderboard.jpg?v=${String(leaderboard.generatedAt || '').slice(0, 10)}`,
      alt: `Top Vihar Sevaks Globally (${drawn.label}): ${drawn.names.join(', ')}`,
    };
    console.log(`[prerender] leaderboard preview: ${drawn.label} · ${drawn.names.join(', ')}`);
  } catch (e) {
    console.warn(`[prerender] leaderboard preview not drawn (${e.message}); using the picture without names`);
  }
}
const OG_IMAGES = { '/leaderboard': ogLeaderboard };

const dataFor = p => (p === '/' ? { leaderboard, routes } : p === '/vihar-routes' ? { routes } : p === '/leaderboard' ? { leaderboard } : {});
const embed = data => (Object.values(data).some(Boolean) ? `<script>window.__VS_DATA__=${JSON.stringify(data).replace(/</g, '\\u003c')}</script>` : '');

const replaceOrFail = (html, re, value, what) => {
  if (!re.test(html)) throw new Error(`[prerender] could not find ${what} in dist/index.html`);
  return html.replace(re, value);
};

for (const p of server.PATHS) {
  const data = dataFor(p);
  const meta = { ...server.PAGE_META[p] };
  // The routes page names its real numbers in search results
  if (p === '/vihar-routes' && routes?.stats) {
    meta.description = `Find ${routes.stats.routes} Jain Vihar routes and their distance in km, shared by ${routes.stats.groups} Vihar Seva groups across ${routes.stats.cities} cities, with walking directions and the group Captain to contact. Free, no sign-in.`;
  }
  const url = server.canonical(p);
  const body = server.render(p, data);
  // Pages with a link preview of their own (shared in WhatsApp groups)
  const ogImage = OG_IMAGES[p];
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
    `<script type="application/ld+json">${JSON.stringify(server.structuredData(p, data)).replace(/</g, '\\u003c')}</script>`,
    'JSON-LD',
  );
  html = html.replace('</head>', `  ${FONT_PRELOADS}\n  ${embed(data)}\n  ${headScript(p, FONTS_HREF)}\n</head>`);
  // The app's Google Fonts (stylesheet, its no-JavaScript copy and the connections to it) are not used by the website
  html = replaceOrFail(html, FONTS_RE, '', 'font stylesheet');
  html = html.replace(/\s*<noscript><link href="https:\/\/fonts\.googleapis\.com[^"]*" rel="stylesheet"><\/noscript>/, '');
  html = html.replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"( crossorigin)?>/g, '');
  // Push notifications are an app feature: the OneSignal web SDK loads (from headScript) only when the app renders
  html = replaceOrFail(html, /\s*<script>\s*\(function \(\) \{\s*var cap = window\.Capacitor;[\s\S]*?OneSignalSDK\.page\.js[\s\S]*?<\/script>/, '', 'OneSignal loader');
  if (ogImage) {
    html = replaceOrFail(html, /<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${ogImage.url}" />`, 'og:image');
    html = replaceOrFail(html, /<meta property="og:image:alt" content="[^"]*" \/>/, `<meta property="og:image:alt" content="${esc(ogImage.alt)}" />`, 'og:image:alt');
    html = replaceOrFail(html, /<meta name="twitter:image" content="[^"]*" \/>/, `<meta name="twitter:image" content="${ogImage.url}" />`, 'twitter:image');
  }
  html = replaceOrFail(html, /<div id="root"[^>]*><\/div>/, `<div id="root" data-prerendered="${p}">${body}</div>`, '#root');

  const file = p === '/' ? 'index.html' : `${p.slice(1)}.html`;
  fs.writeFileSync(path.join(dist, file), html);
  console.log(`[prerender] ${p} → dist/${file} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
}

// 3. llms.txt: a plain-text summary of the website for AI assistants (https://llmstxt.org), with the current leaderboard
//    and the route directory by city, so they can answer "top Vihar Sevaks" or "Vihar routes in Mumbai" from it.
{
  const SITE = 'https://vseva.vjas.in';
  const km = k => (k % 1 ? k.toFixed(1) : String(k));
  const lines = [
    '# vSeva',
    '',
    '> vSeva is the Vihar Seva app for Jain Vihar Seva groups: Sevaks and Captains record every Vihar (walking with Sadhu and Sadhvi Bhagwant), manage Sevaks, approve entries and follow kilometres, Sankalp and statistics. Android app on Google Play; also runs on iPhone and in any browser. Built by VJAS.',
    '',
    '## Pages',
    `- [Home](${SITE}/): what vSeva does, the leaderboard of top Vihar Sevaks and groups, features and how to join`,
    `- [Leaderboard](${SITE}/leaderboard): top Vihar Sevaks, Sevikas and Vihar Seva groups, this Vihar Year and all time`,
    `- [Vihar route directory](${SITE}/vihar-routes): Jain Vihar routes with distances, by city, with the group Captain to contact`,
    `- [Documentation](${SITE}/documentation): the complete guide for Captains and Sevaks`,
    `- [Contact](${SITE}/contact): onboarding a Vihar Seva group, support`,
    `- [Jain Directory](${SITE}/directory): Derasars, Upashrays and Vihar groups listed by the community`,
    `- [Nearby Derasar](${SITE}/nearby-derasar): Jain Derasars near you`,
  ];
  if (leaderboard?.sevaks?.length) {
    const g = i => leaderboard.groups?.[i]?.[0] || '';
    const topS = [...leaderboard.sevaks].sort((a, b) => b[5] - a[5] || b[6] - a[6]).slice(0, 20);
    const topG = [...(leaderboard.groups || [])].filter(x => x[4] > 0).sort((a, b) => b[4] - a[4]).slice(0, 10);
    lines.push('', `## Top Vihar Sevaks on vSeva (all time, approved Vihars, updated ${leaderboard.generatedAt.slice(0, 10)})`);
    topS.forEach((s, i) => lines.push(`${i + 1}. ${s[0]}: ${s[5]} Vihars, ${km(s[6])} km${g(s[2]) ? ` (${g(s[2])})` : ''}`));
    lines.push('', '## Top Vihar Seva groups on vSeva (all time)');
    topG.forEach((x, i) => lines.push(`${i + 1}. ${x[0]}${x[1] ? `, ${x[1]}` : ''}: ${x[4]} Vihars, ${km(x[5])} km`));
    if (leaderboard.vy?.label) {
      const vyS = [...leaderboard.sevaks].filter(s => s[3] > 0).sort((a, b) => b[3] - a[3] || b[4] - a[4]).slice(0, 10);
      if (vyS.length) {
        lines.push('', `## Top Vihar Sevaks this Vihar Year (${leaderboard.vy.label})`);
        vyS.forEach((s, i) => lines.push(`${i + 1}. ${s[0]}: ${s[3]} Vihars, ${km(s[4])} km${g(s[2]) ? ` (${g(s[2])})` : ''}`));
      }
    }
  }
  if (routes?.routes?.length) {
    const byCity = new Map();
    for (const r of routes.routes) {
      const c = routes.groups?.[r[3]?.[0]]?.c || 'Other places';
      if (!byCity.has(c)) byCity.set(c, []);
      byCity.get(c).push(r);
    }
    lines.push('', `## Jain Vihar routes (${routes.stats.routes} routes from ${routes.stats.groups} Vihar Seva groups; details and Captain contacts at ${SITE}/vihar-routes)`);
    for (const [c, rs] of [...byCity.entries()].sort((a, b) => b[1].length - a[1].length)) {
      lines.push('', `### Vihar routes in ${c}`);
      rs.forEach(r => lines.push(`- ${r[0]} to ${r[1]}: ${km(r[2])} km${r[4] ? ` (via ${r[4]})` : ''}`));
    }
  }
  const text = lines.join('\n') + '\n';
  fs.writeFileSync(path.join(dist, 'llms.txt'), text);
  console.log(`[prerender] llms.txt (${(Buffer.byteLength(text) / 1024).toFixed(0)} KB)`);
}

// 4. Sitemap: the website pages change with every build (leaderboard, routes), so their dates follow the build
{
  const file = path.join(dist, 'sitemap.xml');
  if (fs.existsSync(file)) {
    const today = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`));
  }
}
