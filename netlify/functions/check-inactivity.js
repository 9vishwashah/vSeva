import { createClient } from '@supabase/supabase-js';
import { withCors } from './_shared/cors.js';

const TIERS = [15, 7, 5]; // checked highest-first so a sevak gets the strongest matching tier

// Vihar Year (same rule as services/viharYear.ts): Oct 14 -> Jul 13. Jul 14 - Oct 13 is Chaturmas, when
// Vihar does not happen, so no "No Vihar since N days" reminder makes sense then. Returns the start
// (local midnight) of the Vihar Year that is running today, or null during Chaturmas.
function currentViharYearStart(today) {
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    if (m > 9 || (m === 9 && d >= 14)) return new Date(y, 9, 14);
    if (m < 6 || (m === 6 && d <= 13)) return new Date(y - 1, 9, 14);
    return null;
}

async function rawHandler(event) {
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

        // Chaturmas / before the Vihar Year starts: nothing to remind about. Also quietly clear any unread
        // reminder left over from earlier, so nobody keeps seeing "No Vihar Since 80 Days" in the off-season.
        const vyStart = currentViharYearStart(today);
        if (!vyStart) {
            await supabaseAdmin
                .from('notifications')
                .update({ is_read: true })
                .in('user_id', sevaks.map(s => s.id))
                .eq('type', 'inactivity')
                .eq('is_read', false);
            return { statusCode: 200, body: JSON.stringify({ created: 0, reason: 'vihar-year-not-started' }) };
        }

        // Figure out, in memory, which sevaks are due a nudge and at what tier —
        // no DB calls in this loop.
        const candidates = [];
        for (const sevak of sevaks) {
            const lastDate = lastViharByUsername[sevak.username];
            if (!lastDate) continue; // never done a Vihar — not what this specific reminder is for

            // Count from the later of the last Vihar and the start of this Vihar Year, so a Vihar from last year
            // (or the Chaturmas gap) never makes someone look "inactive" for months on day one.
            const lastVihar = new Date(`${lastDate}T00:00:00`);
            const since = lastVihar > vyStart ? lastVihar : vyStart;
            const daysSince = Math.floor((today.getTime() - since.getTime()) / 86400000);
            const tier = TIERS.find(t => daysSince >= t);
            if (!tier) continue;

            candidates.push({ sevak, tier, daysSince });
        }

        if (candidates.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ created: 0 }) };
        }

        // One batched fetch (instead of one query per candidate) of every unread
        // inactivity notification already sitting in any candidate's inbox, so we
        // can skip re-nudging someone already nudged at the same tier.
        const { data: existingNotifs, error: existingError } = await supabaseAdmin
            .from('notifications')
            .select('user_id, payload')
            .in('user_id', candidates.map(c => c.sevak.id))
            .eq('type', 'inactivity')
            .eq('is_read', false);
        if (existingError) throw existingError;

        const alreadyNudgedAtTier = new Set(
            (existingNotifs || []).map(n => `${n.user_id}:${n.payload?.tier}`)
        );

        const rowsToInsert = candidates
            .filter(c => !alreadyNudgedAtTier.has(`${c.sevak.id}:${c.tier}`))
            .map(c => ({
                user_id: c.sevak.id,
                organization_id: orgId,
                type: 'inactivity',
                title: `No Vihar Since ${c.daysSince} Days`,
                message: 'Kindly Join In Seva',
                payload: { tier: c.tier, days_since: c.daysSince },
                is_read: false,
            }));

        if (rowsToInsert.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ created: 0 }) };
        }

        // One batched insert instead of one per sevak.
        const { error: insertError } = await supabaseAdmin.from('notifications').insert(rowsToInsert);
        if (insertError) throw insertError;

        return { statusCode: 200, body: JSON.stringify({ created: rowsToInsert.length }) };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal Server Error' }) };
    }
}

export const handler = withCors(rawHandler);
