import { withCors } from './_shared/cors.js';
import { requireAdmin, errorResponse, HttpError, scopeQuery, inScope, scopeForEmail } from './_shared/adminAuth.js';
import { whatsappAdmin } from './_shared/whatsappAdmin.js';

// Single authenticated entry point for the Super Admin dashboard's reads and the
// reject action (approval lives in approve-org.js). Every result is narrowed to
// the caller's brand scope on the server — the client can't widen it.
//
//   { action: 'dashboard' }         -> everything the dashboard shows in one request: { scope, pending, stats }
//   { action: 'whoami' }            -> { email, all, brands, owner }
//   { action: 'pending' }           -> pending Captain requests (never includes the stored password)
//   { action: 'stats' }             -> per-organisation activity for the orgs in scope, each with its Captain
//   { action: 'reject', id }        -> marks a pending request rejected
//   { action: 'open_as', userId }   -> one-time sign-in token for that Captain's account ("Open as Captain"):
//                                      Captains only, brand-scoped, never another Super Admin, recorded in
//                                      admin_audit_log; the Captain's password is never read or changed

const REQUEST_COLUMNS =
    'id, vihar_group_name, sangh_name, captain_name, vice_captain_name, full_address, city, town, pin_code, district, state, mobile, email, status, created_at';

// Pending Captain registration requests for the caller's brand(s)
async function pendingRequests(sb, scope) {
    // `brand` is selected separately so this still works if the column hasn't been added yet (vSeva-only, pre-migration).
    let { data, error } = await scopeQuery(
        sb.from('registration_requests').select(`${REQUEST_COLUMNS}, brand`).eq('status', 'pending'),
        scope
    ).order('created_at', { ascending: false });
    if (error && scope.all && /brand/.test(error.message || '')) {
        ({ data, error } = await sb
            .from('registration_requests')
            .select(REQUEST_COLUMNS)
            .eq('status', 'pending')
            .order('created_at', { ascending: false }));
    }
    if (error) throw error;
    return data || [];
}

// Every group's activity (get_org_activity_stats) with its Captain's contact details, in one go: the four reads run
// side by side and are joined here, so the dashboard shows each row complete (no Captain details arriving later).
async function orgStatsWithCaptains(sb, scope) {
    const [orgsRes, statsRes, captainsRes, statesRes] = await Promise.all([
        scopeQuery(sb.from('organizations').select('id, brand'), scope),
        sb.rpc('get_org_activity_stats'),
        sb.from('profiles').select('id, organization_id, full_name, mobile, town, username, yearly_goal, is_active, created_at').eq('role', 'admin').order('created_at'),
        sb.from('registration_requests').select('email, state'),
    ]);
    let orgs = orgsRes.data;
    if (orgsRes.error) {
        if (!(scope.all && /brand/.test(orgsRes.error.message || ''))) throw orgsRes.error;
        const r = await sb.from('organizations').select('id');
        if (r.error) throw r.error;
        orgs = r.data;
    }
    if (statsRes.error) throw statsRes.error;
    if (captainsRes.error) throw captainsRes.error;

    const brandById = new Map((orgs || []).map((o) => [o.id, o.brand || 'vseva']));
    const stateByEmail = new Map((statesRes.data || []).filter((r) => r.email && r.state).map((r) => [r.email, r.state]));
    const captainByOrg = new Map();
    for (const c of captainsRes.data || []) {
        if (!brandById.has(c.organization_id) || captainByOrg.has(c.organization_id)) continue; // the first Captain
        const email = typeof c.username === 'string' && c.username.includes('@') ? c.username : '';
        captainByOrg.set(c.organization_id, {
            id: c.id,
            full_name: c.full_name || '',
            mobile: c.mobile || '',
            town: c.town || '',
            email,
            state: stateByEmail.get(c.username) || '',
            yearly_goal: typeof c.yearly_goal === 'number' ? c.yearly_goal : undefined,
            is_active: c.is_active !== false,
        });
    }
    return (statsRes.data || [])
        .filter((row) => brandById.has(row.org_id))
        .map((row) => ({ ...row, brand: brandById.get(row.org_id), captain: captainByOrg.get(row.org_id) || null }));
}

async function rawHandler(event) {
    try {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }

        const body = JSON.parse(event.body || '{}');
        const { sb, user, scope } = await requireAdmin(event);

        // WhatsApp reminders (platform owner only): see _shared/whatsappAdmin.js
        if (typeof body.action === 'string' && body.action.startsWith('wa_')) return ok(await whatsappAdmin(sb, user, scope, body));

        switch (body.action) {
            case 'whoami':
                return ok({ email: user.email, all: scope.all, brands: scope.brands, owner: !!scope.owner });

            // Everything the Super Admin dashboard shows, in one request (scope, pending requests, groups + Captains)
            case 'dashboard': {
                const [pending, stats] = await Promise.all([pendingRequests(sb, scope), orgStatsWithCaptains(sb, scope)]);
                return ok({ scope: { email: user.email, all: scope.all, brands: scope.brands, owner: !!scope.owner }, pending, stats });
            }

            case 'open_as': {
                if (!body.userId) throw new HttpError(400, 'userId is required');
                const { data: target, error: targetError } = await sb
                    .from('profiles').select('id, full_name, role, organization_id, is_active').eq('id', body.userId).maybeSingle();
                if (targetError) throw targetError;
                if (!target) throw new HttpError(404, 'Account not found.');
                if (target.role !== 'admin') throw new HttpError(400, 'Only Captain accounts can be opened.');
                if (target.is_active === false) throw new HttpError(400, 'This Captain account is inactive.');
                const { data: org } = await sb.from('organizations').select('id, name, brand').eq('id', target.organization_id).maybeSingle();
                if (!org) throw new HttpError(404, 'This Captain has no group.');
                if (!inScope(scope, org.brand)) throw new HttpError(403, 'This group belongs to a different brand.');
                const { data: pa } = await sb.from('platform_admins').select('user_id').eq('user_id', target.id).maybeSingle();
                const { data: au, error: auError } = await sb.auth.admin.getUserById(target.id);
                if (auError || !au?.user?.email) throw new HttpError(404, 'This Captain has no login.');
                const email = au.user.email;
                if (pa || scopeForEmail(email)) throw new HttpError(403, 'A Super Admin account cannot be opened this way.');

                // record first: no audit row, no sign-in
                const { error: auditError } = await sb.from('admin_audit_log').insert({
                    actor_id: user.id, actor_email: user.email, action: 'open_as_captain',
                    target_user_id: target.id, target_email: email, organization_id: org.id,
                    detail: { org_name: org.name, captain: target.full_name },
                });
                if (auditError) throw new Error('Could not record this action, so the account was not opened: ' + auditError.message);

                const { data: link, error: linkError } = await sb.auth.admin.generateLink({ type: 'magiclink', email });
                if (linkError || !link?.properties?.hashed_token) throw new Error('Could not open the account: ' + (linkError?.message || 'no token'));
                return ok({ tokenHash: link.properties.hashed_token, email, name: target.full_name, orgName: org.name });
            }

            case 'pending':
                return ok(await pendingRequests(sb, scope));

            case 'stats':
                return ok(await orgStatsWithCaptains(sb, scope));

            case 'reject': {
                if (!body.id) throw new HttpError(400, 'id is required');
                const { data: request, error: findError } = await sb
                    .from('registration_requests')
                    .select('*')
                    .eq('id', body.id)
                    .maybeSingle();
                if (findError) throw findError;
                if (!request) throw new HttpError(404, 'Request not found');
                if (!inScope(scope, request.brand)) throw new HttpError(403, 'This request belongs to a different brand.');
                if (request.status !== 'pending') throw new HttpError(409, 'This request has already been processed.');

                const { error } = await sb
                    .from('registration_requests')
                    .update({ status: 'rejected' })
                    .eq('id', body.id)
                    .eq('status', 'pending');
                if (error) throw error;
                return ok({ ok: true });
            }

            default:
                throw new HttpError(400, 'Unknown action');
        }
    } catch (err) {
        return errorResponse(err);
    }
}

const ok = (payload) => ({ statusCode: 200, body: JSON.stringify(payload) });

export const handler = withCors(rawHandler);
