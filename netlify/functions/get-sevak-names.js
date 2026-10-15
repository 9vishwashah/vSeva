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

        const { orgId } = JSON.parse(event.body);

        if (!orgId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'orgId is required' }),
            };
        }

        // caller must be signed in and asking about their own organization
        const { sb: supabaseAdmin, profile: caller } = await requireOrgMember(event, orgId);

        // Fetch all profiles securely bypassing RLS
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('username, full_name')
            .eq('organization_id', orgId);

        if (error) throw error;

        // Build the dictionary
        const map = {};
        (data || []).forEach(p => {
            if (p.username) {
                map[p.username] = p.full_name;
                const plainUsername = p.username.split('@')[0];
                if (plainUsername) {
                    map[plainUsername] = p.full_name;
                }
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify(map),
        };
    } catch (err) {
        if (err instanceof HttpError) return orgErrorResponse(err, 'get-sevak-names');
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
        };
    }
}

export const handler = withCors(rawHandler);
