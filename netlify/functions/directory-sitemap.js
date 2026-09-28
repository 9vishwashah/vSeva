// Public, read-only. Individual directory listing URLs are database-driven,
// so they can't live in the hand-maintained static public/sitemap.xml —
// this generates that part of the sitemap on request instead, from
// directory_listings (already public/approved-only data, no different from
// what the directory page itself renders).
import { createClient } from '@supabase/supabase-js';

export const handler = async () => {
    try {
        const supabaseUrl = (process.env.SUPABASE_URL && process.env.SUPABASE_URL.includes('.supabase.co'))
            ? process.env.SUPABASE_URL
            : process.env.VITE_SUPABASE_URL;
        const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, anonKey);

        const { data, error } = await supabase
            .from('directory_listings')
            .select('slug, updated_at')
            .eq('status', 'approved')
            .limit(5000);

        if (error) throw error;

        const siteUrl = 'https://vseva.vjas.in';
        const urls = (data || []).map((l) => `
  <url>
    <loc>${siteUrl}/directory/${l.slug}</loc>
    <lastmod>${new Date(l.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}\n</urlset>`;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
            body: xml,
        };
    } catch (error) {
        console.error('directory-sitemap: Internal Server Error', error);
        return { statusCode: 500, body: 'Internal Server Error' };
    }
};
