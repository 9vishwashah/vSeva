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
            .select('organization_id, full_name, mobile, town, username')
            .in('organization_id', orgIds)
            .eq('role', 'admin');

        if (error) throw error;
        
        // Fetch state from registration_requests using the admin's email (stored as username)
        const emails = data.map(p => p.username).filter(Boolean);
        const statesMap = {};
        if (emails.length > 0) {
            const { data: reqs, error: reqsError } = await supabaseAdmin
                .from('registration_requests')
                .select('email, state')
                .in('email', emails);
            
            if (!reqsError && reqs) {
                reqs.forEach(r => {
                    if (r.state) statesMap[r.email] = r.state;
                });
            }
        }

        const enrichedData = data.map(p => ({
            ...p,
            state: statesMap[p.username] || null
        }));

        return { statusCode: 200, body: JSON.stringify(enrichedData) };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal Server Error' }) };
    }
}
