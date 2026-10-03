import { withCors } from './_shared/cors.js';
import { requireAdmin, errorResponse, HttpError, scopeQuery, inScope } from './_shared/adminAuth.js';

// Single authenticated entry point for the Super Admin dashboard's reads and the
// reject action (approval lives in approve-org.js). Every result is narrowed to
// the caller's brand scope on the server — the client can't widen it.
//
//   { action: 'whoami' }            -> { email, all, brands }
//   { action: 'pending' }           -> pending Captain requests (never includes the stored password)
//   { action: 'stats' }             -> per-organisation activity for the orgs in scope
//   { action: 'reject', id }        -> marks a pending request rejected

const REQUEST_COLUMNS =
    'id, vihar_group_name, sangh_name, captain_name, vice_captain_name, full_address, city, town, pin_code, state, mobile, email, status, created_at';

async function rawHandler(event) {
    try {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }

        const body = JSON.parse(event.body || '{}');
        const { sb, user, scope } = await requireAdmin(event);

        switch (body.action) {
            case 'whoami':
                return ok({ email: user.email, all: scope.all, brands: scope.brands });

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
