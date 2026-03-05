import { createClient } from '@supabase/supabase-js';

export async function handler(event) {
    try {
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                body: JSON.stringify({ error: 'Method Not Allowed' }),
            };
        }

        const { orgId, limit = 10 } = JSON.parse(event.body);

        if (!orgId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'orgId is required' }),
            };
        }

        const supabaseAdmin = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 1. Fetch all Organisation Sevaks (to get Gender)
        const { data: sevaks, error: sevaksError } = await supabaseAdmin
            .from('profiles')
            .select('username, full_name, gender')
            .eq('organization_id', orgId)
            .eq('role', 'sevak')
            .eq('is_active', true);

        if (sevaksError) throw sevaksError;

        // 2. Fetch all Entries
        const { data: entries, error: entriesError } = await supabaseAdmin
            .from('vihar_entries')
            .select('sevaks, distance_km')
            .eq('organization_id', orgId);

        if (entriesError) throw entriesError;

        // 3. Aggregate Stats
        const statsMap = {};

        (sevaks || []).forEach(s => {
            statsMap[s.username] = {
                count: 0,
                km: 0,
                name: s.full_name,
                gender: s.gender || 'Male',
                username: s.username
            };
        });

        (entries || []).forEach(e => {
            if (e.sevaks && Array.isArray(e.sevaks)) {
                e.sevaks.forEach(username => {
                    if (statsMap[username]) {
                        statsMap[username].count += 1;
                        statsMap[username].km += Number(e.distance_km || 0);
                    }
                });
            }
        });

        // 4. Convert to Array and Sort
        const allStats = Object.values(statsMap);

        const sorter = (a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return b.km - a.km;
        };

        const maleSevaks = allStats
            .filter(s => s.gender.toLowerCase() === 'male')
            .sort(sorter)
            .slice(0, limit)
            .map((s, i) => ({ ...s, rank: i + 1, km: parseFloat(s.km.toFixed(2)) }));

        const femaleSevaks = allStats
            .filter(s => s.gender.toLowerCase() === 'female')
            .sort(sorter)
            .slice(0, limit)
            .map((s, i) => ({ ...s, rank: i + 1, km: parseFloat(s.km.toFixed(2)) }));

        const overall = allStats
            .sort(sorter)
            .slice(0, limit)
            .map((s, i) => ({ ...s, rank: i + 1, km: parseFloat(s.km.toFixed(2)) }));

        return {
            statusCode: 200,
            body: JSON.stringify({ male: maleSevaks, female: femaleSevaks, overall }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
        };
    }
}
