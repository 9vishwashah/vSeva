import { createClient } from '@supabase/supabase-js';
import { withCors } from './_shared/cors.js';

// Mirrors get-sevak-names.js exactly (same org-wide, username-keyed shape),
// just returning avatar_url instead of full_name — kept as its own endpoint
// so existing callers of get-sevak-names.js (which expect plain string
// values) are never affected.
async function rawHandler(event) {
    try {
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                body: JSON.stringify({ error: 'Method Not Allowed' }),
            };
        }

        const { orgId } = JSON.parse(event.body);

        if (!orgId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'orgId is required' }),
            };
        }

        const supabaseAdmin = createClient(
            (process.env.SUPABASE_URL && process.env.SUPABASE_URL.includes('.supabase.co') ? process.env.SUPABASE_URL : process.env.VITE_SUPABASE_URL),
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // avatar_url needs scripts/add_avatar_url.sql run first — fall back to
        // an empty map (→ initials fallback everywhere) rather than erroring.
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('username, avatar_url')
            .eq('organization_id', orgId);

        if (error) {
            return { statusCode: 200, body: JSON.stringify({}) };
        }

        const map = {};
        (data || []).forEach(p => {
            if (p.username && p.avatar_url) {
                map[p.username] = p.avatar_url;
                const plainUsername = p.username.split('@')[0];
                if (plainUsername) map[plainUsername] = p.avatar_url;
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify(map),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
        };
    }
}

export const handler = withCors(rawHandler);
