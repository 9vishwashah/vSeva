// Runs on Netlify's Edge (Deno) — NOT the same runtime as netlify/functions/*.
//
// vSeva's directory pages are a client-rendered SPA (no server-side
// rendering), so a bare index.html would otherwise reach every visitor —
// including link-preview crawlers (WhatsApp, Telegram, Slack, iMessage) and
// most search-engine crawlers, none of which run the page's JS the way a
// real browser does. Those two audiences are exactly why "share on WhatsApp"
// and "SEO-indexable" were both asked for, so this rewrites the served
// HTML's <head> with the real listing's title/description/OG tags before
// it reaches them — real browsers still get the same SPA underneath and
// hydrate normally; this only changes what's in <head> before JS runs.
//
// Declarative routing (no netlify.toml edit needed): Netlify reads this
// `config` export at deploy time and only invokes the function for paths
// matching "path".
export const config = { path: '/directory/:slug' };

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default async (request: Request, context: any) => {
  const slug = context.params?.slug;

  // "/directory/add" and any other reserved sub-route isn't a listing slug —
  // let the plain SPA through untouched.
  if (!slug || slug === 'add') {
    return context.next();
  }

  const response = await context.next();

  const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
  const anonKey = Deno.env.get('VITE_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) {
    // Env vars not exposed to Edge Functions on this site yet — fail open
    // rather than break the page for real visitors.
    return response;
  }

  try {
    const apiUrl = `${supabaseUrl}/rest/v1/directory_listings?slug=eq.${encodeURIComponent(slug)}&status=eq.approved&select=name,city,area,mulnayak,vihar_group_name,upashray,bhojanshala,library,photos`;
    const res = await fetch(apiUrl, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
    const rows = await res.json();
    const listing = Array.isArray(rows) ? rows[0] : null;
    if (!listing) return response;

    const location = [listing.area, listing.city].filter(Boolean).join(', ');
    // A listing is one universal card, not a single category — this mirrors
    // components/directory/listingTags.tsx's derivation (field presence),
    // just without React since this runs in Deno at the edge.
    const tags = [
      listing.mulnayak && 'Temple',
      listing.vihar_group_name && 'Vihar Group',
      listing.upashray && 'Upashray',
      listing.bhojanshala && 'Bhojanshala',
      listing.library && 'Library',
    ].filter(Boolean).join(', ') || 'Community listing';
    const title = `${listing.name}${location ? ` — ${location}` : ''} | VSeva Directory`;
    const description = `${tags}${location ? ` in ${location}` : ''} — part of the VSeva Community Directory.`;
    const image = Array.isArray(listing.photos) && listing.photos[0]?.url ? listing.photos[0].url : undefined;
    const pageUrl = request.url;

    const rewriter = new HTMLRewriter()
      .on('title', { element(el) { el.setInnerContent(title); } })
      .on('meta[name="description"]', { element(el) { el.setAttribute('content', description); } })
      .on('head', {
        element(el) {
          const tags = [
            `<meta property="og:title" content="${escapeHtml(title)}">`,
            `<meta property="og:description" content="${escapeHtml(description)}">`,
            `<meta property="og:type" content="place">`,
            `<meta property="og:url" content="${escapeHtml(pageUrl)}">`,
            image ? `<meta property="og:image" content="${escapeHtml(image)}">` : '',
            `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
            `<meta name="twitter:title" content="${escapeHtml(title)}">`,
            `<meta name="twitter:description" content="${escapeHtml(description)}">`,
          ].filter(Boolean).join('\n');
          el.append(tags, { html: true });
        },
      });

    return rewriter.transform(response);
  } catch (err) {
    console.error('directory-meta edge function failed', err);
    return response;
  }
};
