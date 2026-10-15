// Server-side check for functions that read one organization's data with the service-role key.
// The caller must send their Supabase access token (Authorization: Bearer ...), and the organization asked
// for must be their own. Without this, anyone could pass any orgId and read that group's members.

import { adminClient, HttpError } from './adminAuth.js';

export { HttpError };

// -> { sb, user, profile: { id, organization_id, role, username } }. Throws HttpError(401/403).
export async function requireOrgMember(event, orgId) {
    const header = event.headers?.authorization || event.headers?.Authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw new HttpError(401, 'Please sign in again.');

    const sb = adminClient();
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) throw new HttpError(401, 'Your session has expired. Please sign in again.');

    const { data: profile, error: profileError } = await sb
        .from('profiles')
        .select('id, organization_id, role, username')
        .eq('id', data.user.id)
        .maybeSingle();
    if (profileError) throw profileError;
    if (!profile || !orgId || profile.organization_id !== orgId) {
        throw new HttpError(403, 'Not allowed for this group.');
    }
    return { sb, user: data.user, profile };
}

export function orgErrorResponse(err, label) {
    if (err instanceof HttpError) {
        return { statusCode: err.status, body: JSON.stringify({ error: err.message }) };
    }
    console.error(label, err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
}
