import { createClient } from '@supabase/supabase-js';

export async function handler(event) {
    try {
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                body: JSON.stringify({ error: 'Method Not Allowed' }),
            };
        }

        const { orgId, includeInactive } = JSON.parse(event.body);

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

        // A Sevak can only SELECT their own profiles row under RLS (profiles has no
        // "same org" read policy — by design, to keep mobile/blood group/emergency
        // contact/address private between Sevaks). The Vihar Sevak picker only needs
        // username/full_name/gender to render the search + badges, so this returns
        // just those three fields for the org roster, bypassing RLS narrowly rather
        // than widening what a Sevak's own session can read.
        let query = supabaseAdmin
            .from('profiles')
            .select('username, full_name, gender')
            .eq('organization_id', orgId);

        if (!includeInactive) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        if (error) throw error;

        return {
            statusCode: 200,
            body: JSON.stringify(data || []),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
        };
    }
}
