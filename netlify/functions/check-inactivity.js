import { createClient } from '@supabase/supabase-js';

const TIERS = [15, 7, 5]; // checked highest-first so a sevak gets the strongest matching tier

export async function handler(event) {
    try {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }

        const { orgId, username } = JSON.parse(event.body || '{}');
        if (!orgId) {
            return { statusCode: 400, body: JSON.stringify({ error: 'orgId is required' }) };
        }

        const supabaseAdmin = createClient(
            (process.env.SUPABASE_URL && process.env.SUPABASE_URL.includes('.supabase.co') ? process.env.SUPABASE_URL : process.env.VITE_SUPABASE_URL),
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Active sevaks to check — either everyone in the org (Captain's dashboard
        // triggers this) or just one (a Sevak's own dashboard checking themselves).
        let sevakQuery = supabaseAdmin
            .from('profiles')
            .select('id, username')
            .eq('organization_id', orgId)
            .eq('role', 'sevak')
            .eq('is_active', true);
        if (username) sevakQuery = sevakQuery.eq('username', username);

        const { data: sevaks, error: sevakError } = await sevakQuery;
        if (sevakError) throw sevakError;
        if (!sevaks || sevaks.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ created: 0 }) };
        }

        // One org-wide fetch of approved entries — cheaper than a query per sevak.
        const { data: entries, error: entriesError } = await supabaseAdmin
            .from('vihar_entries')
            .select('vihar_date, sevaks')
            .eq('organization_id', orgId)
            .eq('status', 'approved');
        if (entriesError) throw entriesError;

        const lastViharByUsername = {};
        (entries || []).forEach(e => {
            (e.sevaks || []).forEach(u => {
                if (!lastViharByUsername[u] || e.vihar_date > lastViharByUsername[u]) {
                    lastViharByUsername[u] = e.vihar_date;
                }
            });
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let created = 0;

        for (const sevak of sevaks) {
            const lastDate = lastViharByUsername[sevak.username];
            if (!lastDate) continue; // never done a Vihar — not what this specific reminder is for

            const daysSince = Math.floor((today.getTime() - new Date(`${lastDate}T00:00:00`).getTime()) / 86400000);
            const tier = TIERS.find(t => daysSince >= t);
            if (!tier) continue;

            // Already nudged at this tier and still unread — don't spam a duplicate.
            const { data: existing } = await supabaseAdmin
                .from('notifications')
                .select('id')
                .eq('user_id', sevak.id)
                .eq('type', 'inactivity')
                .eq('is_read', false)
                .contains('payload', { tier })
                .limit(1);
            if (existing && existing.length > 0) continue;

            const { error: insertError } = await supabaseAdmin.from('notifications').insert({
                user_id: sevak.id,
                organization_id: orgId,
                type: 'inactivity',
                title: `No Vihar Since ${daysSince} Days`,
                message: 'Kindly Join In Seva',
                payload: { tier, days_since: daysSince },
                is_read: false,
            });
            if (!insertError) created++;
        }

        return { statusCode: 200, body: JSON.stringify({ created }) };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal Server Error' }) };
    }
}
