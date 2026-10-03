import { withCors } from './_shared/cors.js';
import { requireAdmin, errorResponse, HttpError, inScope } from './_shared/adminAuth.js';

// Approves a pending Captain registration: creates the organisation, the Captain's
// login and profile, and marks the request approved.
//
// Authenticated: only a Super Admin (platform owner) or a brand admin whose brand
// matches the request's brand may approve. Everything is read from the stored
// request row — the client only says WHICH request, never what to create.
async function rawHandler(event) {
    let sb;
    let requestId;
    let claimed = false;
    try {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }

        ({ requestId } = JSON.parse(event.body || '{}'));
        if (!requestId) throw new HttpError(400, 'Missing required fields');

        const auth = await requireAdmin(event);
        sb = auth.sb;

        const { data: request, error: reqErr } = await sb
            .from('registration_requests')
            .select('*')
            .eq('id', requestId)
            .maybeSingle();
        if (reqErr) throw reqErr;
        if (!request) throw new HttpError(404, 'Request not found');
        if (!inScope(auth.scope, request.brand)) {
            throw new HttpError(403, 'This request belongs to a different brand.');
        }
        if (request.status !== 'pending') throw new HttpError(409, 'This request has already been processed.');
        if (!request.email) throw new HttpError(400, 'Request has no email address.');

        // Claim the request so a double-click / second admin can't create two accounts.
        const { data: claim, error: claimErr } = await sb
            .from('registration_requests')
            .update({ status: 'approved' })
            .eq('id', requestId)
            .eq('status', 'pending')
            .select('id');
        if (claimErr) throw claimErr;
        if (!claim || claim.length === 0) throw new HttpError(409, 'This request has already been processed.');
        claimed = true;

        const password = request.password || request.mobile;
        if (!password) throw new HttpError(400, 'Request has no password or mobile number.');

        // brand is only written when set, so vSeva approvals keep working even
        // before the brand columns exist.
        const orgRow = { name: request.vihar_group_name, city: request.city, town: request.town };
        if (request.brand) orgRow.brand = request.brand;

        const { data: org, error: orgError } = await sb.from('organizations').insert(orgRow).select().single();
        if (orgError) throw new Error('Failed to create organization: ' + orgError.message);

        const { data: authData, error: authError } = await sb.auth.admin.createUser({
            email: request.email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: request.captain_name,
                role: 'admin', // maps to ORG_ADMIN in types
                organization_id: org.id,
            },
        });
        if (authError) {
            await sb.from('organizations').delete().eq('id', org.id);
            throw new Error('Failed to create auth user: ' + authError.message);
        }

        const { error: profileError } = await sb.from('profiles').insert({
            id: authData.user.id,
            organization_id: org.id,
            role: 'admin',
            full_name: request.captain_name,
            username: request.email, // email doubles as the Captain's username
            mobile: request.mobile,
            town: request.town,
            is_active: true,
        });
        if (profileError) {
            await sb.auth.admin.deleteUser(authData.user.id);
            await sb.from('organizations').delete().eq('id', org.id);
            throw new Error('Failed to create profile: ' + profileError.message);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Organization approved successfully', orgId: org.id }),
        };
    } catch (err) {
        // Anything that failed after we claimed the request leaves it re-approvable.
        if (claimed && sb && requestId) {
            await sb.from('registration_requests').update({ status: 'pending' }).eq('id', requestId);
        }
        return errorResponse(err);
    }
}

export const handler = withCors(rawHandler);
