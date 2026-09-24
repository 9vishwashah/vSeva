import { createClient } from '@supabase/supabase-js';

export async function handler(event) {
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

        // Fetch id/full_name/mobile securely, bypassing RLS, so any org member
        // (not just admins) can resolve who someone is and reach them directly.
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, mobile')
            .eq('organization_id', orgId);

        if (error) throw error;

        // Build the dictionary keyed by profile id
        const map = {};
        (data || []).forEach(p => {
            map[p.id] = { full_name: p.full_name, mobile: p.mobile || '' };
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
