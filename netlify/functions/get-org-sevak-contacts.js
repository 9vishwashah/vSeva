import { createClient } from '@supabase/supabase-js';
import { withCors } from './_shared/cors.js';

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

        // Fetch id/full_name/mobile/avatar_url securely, bypassing RLS, so any
        // org member (not just admins) can resolve who someone is, reach them
        // directly, and see their photo. avatar_url needs
        // scripts/add_avatar_url.sql run first — fall back to the base select
        // if that migration hasn't been applied yet, so name/mobile resolution
        // never breaks because of it.
        let data, error;
        ({ data, error } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, mobile, avatar_url, role, is_active')
            .eq('organization_id', orgId));

        if (error) {
            ({ data, error } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, mobile, role, is_active')
                .eq('organization_id', orgId));
        }

        if (error) throw error;

        // Build the dictionary keyed by profile id
        const map = {};
        (data || []).forEach(p => {
            map[p.id] = {
                full_name: p.full_name,
                mobile: p.mobile || '',
                avatar_url: p.avatar_url || null,
                role: p.role,
                is_active: p.is_active !== false,
            };
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
