import { withCors } from './_shared/cors.js';
import { adminClient } from './_shared/adminAuth.js';

// Lets a Sevak sign in with just the start of their name ("alpesh" for "Alpesh Shah") as long as the
// mobile number they typed (their password) belongs to exactly one Sevak whose name starts that way.
//
// The login screen can't read profiles (RLS), so it asks here after a normal sign-in attempt failed.
// The answer is only the internal sign-in address(es) — and only when BOTH the name prefix and the
// mobile number match, so it reveals nothing to someone who doesn't already know the password. The
// actual authentication is still Supabase's signInWithPassword using that address.
//
//   POST { name: "alpesh", mobile: "9324503214" } -> { emails: ["alpeshshah@vsevak.in", ...] }
//   (an empty list when nothing matches; "ambiguous" when more than one Sevak matches)

const MIN_PREFIX = 3;

async function rawHandler(event) {
    try {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }

        const { name, mobile } = JSON.parse(event.body || '{}');
        const prefix = String(name || '').toLowerCase().replace(/@vsevak(\.in)?$/, '').replace(/[^a-z0-9]/g, '');
        const digits = String(mobile || '').replace(/\D/g, '');
        if (prefix.length < MIN_PREFIX || digits.length < 10) {
            return { statusCode: 200, body: JSON.stringify({ emails: [] }) };
        }
        const last10 = digits.slice(-10);

        const sb = adminClient();
        const { data, error } = await sb
            .from('profiles')
            .select('username')
            .eq('role', 'sevak')
            .eq('is_active', true)
            .ilike('username', `${prefix}%`)   // prefix is letters/digits only — no wildcards possible
            .like('mobile', `%${last10}`)
            .limit(5);
        if (error) throw error;

        const usernames = [...new Set((data || []).map((p) => p.username).filter(Boolean))];
        if (usernames.length > 1) {
            return { statusCode: 200, body: JSON.stringify({ emails: [], ambiguous: true }) };
        }
        if (usernames.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ emails: [] }) };
        }

        // Stored usernames are the bare name (newer accounts) or carry the internal tail (older ones);
        // the sign-in address is always name@vsevak.in or the legacy name@vsevak.
        const bare = usernames[0].toLowerCase().replace(/@vsevak(\.in)?$/, '').replace(/[^a-z0-9]/g, '');
        return {
            statusCode: 200,
            body: JSON.stringify({ emails: [`${bare}@vsevak.in`, `${bare}@vsevak`] }),
        };
    } catch (err) {
        console.error('sevak-login-lookup', err);
        return { statusCode: 200, body: JSON.stringify({ emails: [] }) };
    }
}

export const handler = withCors(rawHandler);
