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

        // Fetch all Sevaks for Org
        const { data: sevaks, error: sevaksError } = await supabaseAdmin
            .from('profiles')
            .select('username, gender')
            .eq('organization_id', orgId)
            .eq('role', 'sevak')
            .eq('is_active', true);

        if (sevaksError) throw sevaksError;

        // Fetch entries from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const isoDate = thirtyDaysAgo.toISOString().split('T')[0];

        const { data: entries, error: entriesError } = await supabaseAdmin
            .from('vihar_entries')
            .select('sevaks')
            .eq('organization_id', orgId)
            .gte('vihar_date', isoDate);

        if (entriesError) throw entriesError;

        // Aggregate 
        const stats = {
            totalMale: 0,
            totalFemale: 0,
            activeMale: 0,
            activeFemale: 0,
            activeUsernames: []
        };

        const activeUsernames = new Set();
        (entries || []).forEach(e => {
            if (e.sevaks && Array.isArray(e.sevaks)) {
                e.sevaks.forEach(u => activeUsernames.add(u));
            }
        });

        (sevaks || []).forEach(s => {
            const isFe = (s.gender || '').toLowerCase() === 'female' || s.gender === 'સ્ત્રી' || s.gender === 'mahila';
            if (isFe) {
                stats.totalFemale += 1;
                if (activeUsernames.has(s.username)) stats.activeFemale += 1;
            } else {
                stats.totalMale += 1;
                if (activeUsernames.has(s.username)) stats.activeMale += 1;
            }
        });
        
        stats.activeUsernames = Array.from(activeUsernames);

        return {
            statusCode: 200,
            body: JSON.stringify(stats),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
        };
    }
}
