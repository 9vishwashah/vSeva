import { withCors } from './_shared/cors.js';
import { requireAdmin, errorResponse, HttpError, scopeQuery, inScope, scopeForEmail } from './_shared/adminAuth.js';
import { whatsappAdmin } from './_shared/whatsappAdmin.js';

// Single authenticated entry point for the Super Admin dashboard's reads and the
// reject action (approval lives in approve-org.js). Every result is narrowed to
// the caller's brand scope on the server — the client can't widen it.
//
//   { action: 'whoami' }            -> { email, all, brands }
//   { action: 'pending' }           -> pending Captain requests (never includes the stored password)
//   { action: 'stats' }             -> per-organisation activity for the orgs in scope
//   { action: 'reject', id }        -> marks a pending request rejected
//   { action: 'org_detail', orgId } -> everything about ONE organisation: group + Captain details, every
//                                      Sevak's profile, Vihar entries and Sankalps (brand-scoped)
//   { action: 'open_as', userId }   -> one-time sign-in token for that Captain's account ("Open as Captain"):
//                                      Captains only, brand-scoped, never another Super Admin, recorded in
//                                      admin_audit_log; the Captain's password is never read or changed

const PROFILE_COLUMNS =
    'id, full_name, username, mobile, gender, date_of_birth, blood_group, emergency_number, emergency_contact_name, occupation, occupation_details, address, is_active, last_login_at, created_at';
const ENTRY_COLUMNS =
    'id, vihar_date, vihar_from, vihar_to, sevaks, group_sadhu, group_sadhvi, no_sadhubhagwan, no_sadhvijibhagwan, wheelchair, samuday, distance_km, vihar_type, status, notes, created_at';
const MAX_ENTRIES = 20000;

// PostgREST returns at most 1000 rows per request, so page through them.
async function fetchAll(buildQuery, max = MAX_ENTRIES) {
    const rows = [];
    for (let from = 0; from < max; from += 1000) {
        const { data, error } = await buildQuery().range(from, from + 999);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 1000) return { rows, truncated: false };
    }
    return { rows, truncated: true };
}

const REQUEST_COLUMNS =
    'id, vihar_group_name, sangh_name, captain_name, vice_captain_name, full_address, city, town, pin_code, district, state, mobile, email, status, created_at';

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
                return ok({ email: user.email, all: scope.all, brands: scope.brands });

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

            case 'pending': {
                // `brand` is selected separately so this still works if the column
                // hasn't been added yet (vSeva-only, pre-migration).
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
                return ok(data || []);
            }

            case 'stats': {
                let orgsQuery = sb.from('organizations').select('id, brand');
                let { data: orgs, error: orgsError } = await scopeQuery(orgsQuery, scope);
                if (orgsError && scope.all && /brand/.test(orgsError.message || '')) {
                    ({ data: orgs, error: orgsError } = await sb.from('organizations').select('id'));
                }
                if (orgsError) throw orgsError;
                const brandById = new Map((orgs || []).map((o) => [o.id, o.brand || 'vseva']));

                const { data: stats, error: statsError } = await sb.rpc('get_org_activity_stats');
                if (statsError) throw statsError;

                return ok(
                    (stats || [])
                        .filter((row) => brandById.has(row.org_id))
                        .map((row) => ({ ...row, brand: brandById.get(row.org_id) }))
                );
            }

            case 'org_detail': {
                if (!body.orgId) throw new HttpError(400, 'orgId is required');
                let { data: org, error: orgError } = await sb.from('organizations').select('*').eq('id', body.orgId).maybeSingle();
                if (orgError) throw orgError;
                if (!org) throw new HttpError(404, 'Organisation not found');
                if (!inScope(scope, org.brand)) throw new HttpError(403, 'This organisation belongs to a different brand.');

                const { data: captains, error: captainError } = await sb
                    .from('profiles')
                    .select(PROFILE_COLUMNS)
                    .eq('organization_id', org.id)
                    .eq('role', 'admin');
                if (captainError) throw captainError;
                const captain = (captains || [])[0] || null;

                // Sangh name / address / state live on the registration request (matched by the Captain's email).
                let registration = null;
                if (captain?.username) {
                    const { data: reqs } = await sb
                        .from('registration_requests')
                        .select('sangh_name, vihar_group_name, full_address, city, town, pin_code, state, email, mobile, created_at')
                        .eq('email', captain.username)
                        .order('created_at', { ascending: false })
                        .limit(1);
                    registration = (reqs || [])[0] || null;
                }

                const { rows: sevaks } = await fetchAll(() =>
                    sb.from('profiles').select(PROFILE_COLUMNS).eq('organization_id', org.id).eq('role', 'sevak').order('created_at', { ascending: true }), 5000);
                const { rows: entries, truncated } = await fetchAll(() =>
                    sb.from('vihar_entries').select(ENTRY_COLUMNS).eq('organization_id', org.id).order('vihar_date', { ascending: false }).order('id', { ascending: false }));

                // Sankalps are optional (the table only exists once the Sankalp feature is migrated).
                let orgSankalps = [];
                let sevakSankalps = [];
                {
                    const o = await sb.from('org_sankalps').select('vihar_year, target, sevaks_can_edit').eq('organization_id', org.id);
                    if (!o.error) orgSankalps = o.data || [];
                    const ids = sevaks.map((s) => s.id);
                    if (ids.length) {
                        const s = await sb.from('sevak_sankalps').select('user_id, vihar_year, target').in('user_id', ids);
                        if (!s.error) sevakSankalps = s.data || [];
                    }
                }

                return ok({
                    org: { ...org, brand: org.brand || 'vseva' },
                    captain,
                    registration,
                    sevaks,
                    entries,
                    entriesTruncated: truncated,
                    orgSankalps,
                    sevakSankalps,
                });
            }

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
