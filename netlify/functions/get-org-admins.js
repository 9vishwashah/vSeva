import { createClient } from '@supabase/supabase-js';

export async function handler(event) {
    try {
        if (event.httpMethod !== 'POST') {
             return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }
        
        const { orgIds } = JSON.parse(event.body);

        if (!orgIds || !Array.isArray(orgIds)) {
            return { statusCode: 400, body: JSON.stringify({ error: 'orgIds array is required' }) };
        }

        const supabaseAdmin = createClient(
            (process.env.SUPABASE_URL && process.env.SUPABASE_URL.includes('.supabase.co') ? process.env.SUPABASE_URL : process.env.VITE_SUPABASE_URL),
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('organization_id, full_name, mobile, town')
            .in('organization_id', orgIds)
            .eq('role', 'admin');

        if (error) throw error;
        
        return { statusCode: 200, body: JSON.stringify(data || []) };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal Server Error' }) };
    }
}
