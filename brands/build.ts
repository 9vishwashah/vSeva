// Build-time helpers (Node only — imported by vite.config.ts, never by app code).
// Turns a brand's BrandMeta into index.html, the public/ overlay and robots/sitemap
// so one codebase can emit differently branded sites.

import fs from 'node:fs';
import path from 'node:path';
import type { BrandMeta } from './types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function renderHtml(html: string, m: BrandMeta): string {
  const abs = (p: string) => (m.siteUrl ? m.siteUrl + p : p);
  const [w, h] = m.ogImageSize;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: m.name,
    ...(m.altName ? { alternateName: m.altName } : {}),
    description: m.description,
    ...(m.siteUrl ? { url: m.siteUrl + '/' } : {}),
    logo: abs(m.schemaLogoPath),
    ...(m.instagram ? { sameAs: [m.instagram.url] } : {}),
    ...(m.schemaContactPath
      ? { contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', url: abs(m.schemaContactPath) } }
      : {}),
  };

  const tokens: Record<string, string> = {
    HTML_TITLE: esc(m.htmlTitle),
    THEME_COLOR: m.themeColor,
    DESCRIPTION: esc(m.description),
    KEYWORDS: esc(m.keywords),
    NAME: esc(m.name),
    OG_TITLE: esc(m.ogTitle),
    OG_DESCRIPTION: esc(m.ogDescription),
    CANONICAL_LINK: m.siteUrl ? `<link rel="canonical" href="${m.siteUrl}/" />` : '',
    OG_URL_TAG: m.siteUrl ? `<meta property="og:url" content="${m.siteUrl}/" />` : '',
    // Link-preview crawlers need an absolute image URL; without a site URL the tag is
    // omitted rather than emitted broken.
    OG_IMAGE_TAGS: m.siteUrl
      ? `<meta property="og:image" content="${abs(m.ogImagePath)}" />\n  <meta property="og:image:width" content="${w}" />\n  <meta property="og:image:height" content="${h}" />`
      : '',
    TWITTER_IMAGE_TAG: m.siteUrl ? `<meta name="twitter:image" content="${abs(m.ogImagePath)}" />` : '',
    GOOGLE_VERIFICATION: m.googleVerification
      ? `<meta name="google-site-verification" content="${m.googleVerification}" />`
      : '',
    REL_ME: m.instagram ? `<link rel="me" href="${m.instagram.url}" />` : '',
    JSONLD: JSON.stringify(jsonLd, null, 2).replace(/\n/g, '\n    '),
    ICON: m.iconPath,
    FONTS_HREF: m.fontsHref.replace(/&/g, '&amp;'),
  };

  return html.replace(/\{\{([A-Z_]+)\}\}/g, (whole, key) => {
    if (!(key in tokens)) throw new Error(`index.html uses unknown brand token ${whole}`);
    return tokens[key];
  });
}

export const finderManifest = (m: BrandMeta) => ({
  name: m.finderName,
  short_name: m.finderName,
  description: `Find Nearby Jain Derasar Instantly — GPS-powered temple locator by ${m.name}`,
  theme_color: m.themeColor,
  background_color: m.backgroundColor,
  display: 'standalone',
  orientation: 'portrait',
  start_url: '/nearby-derasar',
  scope: '/',
  icons: [
    { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
});

// vSeva serves the repo's public/ untouched. Any other brand gets a copy of it,
// minus vSeva-branded files, with brands/<id>/public laid over the top and
// brand-specific manifest-finder/robots/sitemap generated.
export function prepareBrandPublicDir(root: string, m: BrandMeta): string {
  const base = path.resolve(root, 'public');
  if (m.id === 'vseva') return base;

  const out = path.resolve(root, 'node_modules/.cache/brand-public', m.id);
  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(base, out, { recursive: true });
  for (const f of fs.readdirSync(out)) {
    if (/vseva/i.test(f)) fs.rmSync(path.join(out, f), { recursive: true, force: true });
  }
  const overlay = path.resolve(root, 'brands', m.id, 'public');
  if (fs.existsSync(overlay)) fs.cpSync(overlay, out, { recursive: true });

  fs.writeFileSync(path.join(out, 'manifest-finder.json'), JSON.stringify(finderManifest(m), null, 2));

  const sitemapUrls = ['/', '/login', '/directory', '/nearby-derasar'];
  const today = new Date().toISOString().slice(0, 10);
  if (m.siteUrl) {
    fs.writeFileSync(
      path.join(out, 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        sitemapUrls
          .map((u) => `  <url>\n    <loc>${m.siteUrl}${u}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`)
          .join('\n') +
        `\n</urlset>\n`
    );
    fs.writeFileSync(
      path.join(out, 'robots.txt'),
      `User-agent: *\nAllow: /\n\nSitemap: ${m.siteUrl}/sitemap.xml\nSitemap: ${m.siteUrl}/directory-sitemap.xml\n`
    );
  } else {
    fs.rmSync(path.join(out, 'sitemap.xml'), { force: true });
    fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\n`);
  }
  return out;
}
