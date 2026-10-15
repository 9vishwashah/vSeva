import { withCors } from './_shared/cors.js';
import { requireOrgMember, orgErrorResponse, HttpError } from './_shared/orgAuth.js';

async function rawHandler(event) {
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

        // caller must be signed in and asking about their own organization
        const { sb: supabaseAdmin, profile: caller } = await requireOrgMember(event, orgId);

        // A Sevak can only SELECT their own profiles row under RLS (profiles has no
        // "same org" read policy — by design, to keep mobile/blood group/emergency
        // contact/address private between Sevaks). The Vihar Sevak picker only needs
        // username/full_name/gender/avatar_url to render the search + badges, so this
        // returns just those fields for the org roster, bypassing RLS narrowly rather
        // than widening what a Sevak's own session can read.
        const buildQuery = (fields) => {
            let q = supabaseAdmin.from('profiles').select(fields).eq('organization_id', orgId);
            if (!includeInactive) q = q.eq('is_active', true);
            return q;
        };

        let { data, error } = await buildQuery('username, full_name, gender, avatar_url, role');
        if (error) {
            // avatar_url needs scripts/add_avatar_url.sql run first — fall back to
            // the narrower select rather than erroring the whole roster out.
            ({ data, error } = await buildQuery('username, full_name, gender, role'));
        }
        if (error) throw error;

        return {
            statusCode: 200,
            body: JSON.stringify(data || []),
        };
    } catch (err) {
        if (err instanceof HttpError) return orgErrorResponse(err, 'get-org-roster');
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
        };
    }
}

export const handler = withCors(rawHandler);
