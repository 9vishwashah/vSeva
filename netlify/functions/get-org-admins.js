import { withCors } from './_shared/cors.js';
import { requireAdmin, errorResponse, HttpError, scopeQuery } from './_shared/adminAuth.js';

// Captain contact details for the organisations listed on the Super Admin
// dashboard. Authenticated and brand-scoped: ids outside the caller's brand are
// silently dropped, so a brand admin can't look up another brand's Captains.
async function rawHandler(event) {
    try {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }

        const { orgIds } = JSON.parse(event.body || '{}');
        if (!orgIds || !Array.isArray(orgIds)) throw new HttpError(400, 'orgIds array is required');

        const { sb, scope } = await requireAdmin(event);

        const { data: orgs, error: orgsError } = await scopeQuery(
            sb.from('organizations').select('id').in('id', orgIds),
            scope
        );
        if (orgsError) throw orgsError;
        const allowedIds = (orgs || []).map((o) => o.id);
        if (allowedIds.length === 0) return { statusCode: 200, body: JSON.stringify([]) };

        const { data, error } = await sb
            .from('profiles')
            .select('organization_id, full_name, mobile, town, username, yearly_goal')
            .in('organization_id', allowedIds)
            .eq('role', 'admin');
        if (error) throw error;

        // State lives on the registration request (matched by the Captain's email, stored as username).
        const emails = data.map((p) => p.username).filter(Boolean);
        const statesMap = {};
        if (emails.length > 0) {
            const { data: reqs, error: reqsError } = await sb
                .from('registration_requests')
                .select('email, state')
                .in('email', emails);
            if (!reqsError && reqs) {
                reqs.forEach((r) => {
                    if (r.state) statesMap[r.email] = r.state;
                });
            }
        }

        const enrichedData = data.map((p) => ({ ...p, state: statesMap[p.username] || null }));
        return { statusCode: 200, body: JSON.stringify(enrichedData) };
    } catch (err) {
        return errorResponse(err);
    }
}

export const handler = withCors(rawHandler);
