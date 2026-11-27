// Website data written into the page at build time (scripts/prerender.mjs): the public leaderboard and the Vihar route
// directory, the two files the Super Admin "Refresh website data" button publishes. The build renders the pages with
// them (so search engines and AI crawlers read every name, group and route as plain text) and embeds the same data in
// the HTML as window.__VS_DATA__, so the browser starts from exactly what was rendered (no loading step), then checks
// for a newer refresh in the background.
export interface SiteData {
  leaderboard?: any;
  routes?: any;
}

export const getSiteData = (): SiteData => ((globalThis as any).__VS_DATA__ as SiteData) || {};

// The public data file a page fetches, unless the build already put a copy in the page.
export const PUBLIC_DATA = (file: string) => `${import.meta.env.VITE_SUPABASE_URL || ''}/storage/v1/object/public/public-data/${file}`;
