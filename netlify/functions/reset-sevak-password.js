import { withCors } from './_shared/cors.js';
import { adminClient } from './_shared/adminAuth.js';
import { grantPasswordChange } from './_shared/passwordGrant.js';

// A Captain resets one of their own group's Sevaks to the default password — the Sevak's mobile
// number — e.g. after the Sevak used "Forgot password" and the Captain got a reset request.
// (Editing a Sevak's mobile number does the same, but only when the number actually changes.)
async function rawHandler(event) {
    try {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }

        const authHeader = event.headers.authorization || event.headers.Authorization || '';
        if (!authHeader.startsWith('Bearer ')) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Missing Authorization header' }) };
        }

        const sb = adminClient();
        const { data: { user }, error: authError } = await sb.auth.getUser(authHeader.slice(7).trim());
        if (authError || !user) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
        }

        const { data: caller } = await sb.from('profiles').select('role, organization_id').eq('id', user.id).single();
        if (caller?.role !== 'admin') {
            return { statusCode: 403, body: JSON.stringify({ error: 'Captain access required' }) };
        }

        const { user_id } = JSON.parse(event.body || '{}');
        if (!user_id) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing user_id' }) };
        }

        const { data: target } = await sb.from('profiles').select('role, organization_id, mobile, full_name').eq('id', user_id).single();
        if (!target || target.organization_id !== caller.organization_id || target.role !== 'sevak') {
            return { statusCode: 403, body: JSON.stringify({ error: 'You can only reset Sevaks of your own group' }) };
        }

        const password = String(target.mobile || '').trim();
        if (password.length < 6) {
            return { statusCode: 400, body: JSON.stringify({ error: 'This Sevak has no valid mobile number saved — edit their profile first.' }) };
        }

        await grantPasswordChange(sb, user_id);
        const { error } = await sb.auth.admin.updateUserById(user_id, { password });
        if (error) {
            return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
        }

        return { statusCode: 200, body: JSON.stringify({ message: `Password for ${target.full_name} reset to their mobile number` }) };
    } catch (err) {
        console.error('reset-sevak-password', err);
        return { statusCode: 400, body: JSON.stringify({ error: err.message || 'Internal Server Error' }) };
    }
}

export const handler = withCors(rawHandler);
