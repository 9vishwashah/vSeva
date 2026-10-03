// Server-side authorisation for the Super Admin surface (platform owner and
// per-brand admins). The client-side PIN on /super-admin is a convenience, not a
// security boundary — everything that reads or changes cross-organisation data
// goes through here instead.
//
// Who may do what is configured in the Netlify site's environment variables
// (so it can't be edited from the browser and needs no extra database table):
//
//   SUPER_ADMIN_EMAILS         comma-separated emails — platform owner, sees ALL brands
//   BRAND_ADMIN_EMAILS_<BRAND> comma-separated emails — sees only that brand,
//                              e.g. BRAND_ADMIN_EMAILS_SSG=captain@example.com
//
// An email only counts if it belongs to a signed-in Supabase user: the caller's
// access token is verified with Supabase Auth on every request.

import { createClient } from '@supabase/supabase-js';

export class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

export function adminClient() {
    let url = (process.env.SUPABASE_URL && process.env.SUPABASE_URL.includes('.supabase.co') ? process.env.SUPABASE_URL : process.env.VITE_SUPABASE_URL);
    if (url && !url.includes('supabase.co')) url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url) throw new Error('Missing SUPABASE_URL in environment variables.');
    if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.');
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const parseList = (value) =>
    (value || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

// -> { all: true } | { all: false, brands: ['ssg', ...] } | null (not an admin)
export function scopeForEmail(email) {
    const e = (email || '').trim().toLowerCase();
    if (!e) return null;
    if (parseList(process.env.SUPER_ADMIN_EMAILS).includes(e)) return { all: true, brands: [] };

    const brands = [];
    for (const [key, value] of Object.entries(process.env)) {
        const m = /^BRAND_ADMIN_EMAILS_([A-Z0-9_]+)$/.exec(key);
        if (m && parseList(value).includes(e)) brands.push(m[1].toLowerCase());
    }
    return brands.length ? { all: false, brands } : null;
}

// Verifies the caller and returns { sb, user, scope }. Throws HttpError(401/403).
export async function requireAdmin(event) {
    const header = event.headers?.authorization || event.headers?.Authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw new HttpError(401, 'Please sign in again.');

    const sb = adminClient();
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) throw new HttpError(401, 'Your session has expired. Please sign in again.');

    const scope = scopeForEmail(data.user.email);
    if (!scope) throw new HttpError(403, 'This account is not authorised for Super Admin access.');
    return { sb, user: data.user, scope };
}

// brand column: NULL means vSeva (the original product).
export const brandOf = (row) => (row && row.brand) || 'vseva';

export const inScope = (scope, brand) => scope.all || scope.brands.includes(brand || 'vseva');

// Narrows a supabase-js query on a table that has a `brand` column to the scope.
export function scopeQuery(query, scope, column = 'brand') {
    if (scope.all) return query;
    const parts = [];
    const named = scope.brands.filter((b) => b !== 'vseva');
    if (scope.brands.includes('vseva')) parts.push(`${column}.is.null`);
    if (named.length) parts.push(`${column}.in.(${named.join(',')})`);
    return parts.length ? query.or(parts.join(',')) : query.eq('id', '00000000-0000-0000-0000-000000000000');
}

export function errorResponse(err) {
    if (err instanceof HttpError) {
        return { statusCode: err.status, body: JSON.stringify({ error: err.message }) };
    }
    console.error(err);
    // 400 (not 500) so the real message survives the Vite dev proxy — same convention as approve-org.
    return { statusCode: 400, body: JSON.stringify({ error: err?.message || 'Internal Server Error' }) };
}
