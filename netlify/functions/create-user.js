import { createClient } from '@supabase/supabase-js';
import { withCors } from './_shared/cors.js';

async function rawHandler(event) {
  try {
    console.log('OneSignal: Request received at create-user function');
    
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }

    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Missing Authorization header' }),
      };
    }

    const jwt = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(
      (process.env.SUPABASE_URL && process.env.SUPABASE_URL.includes('.supabase.co') ? process.env.SUPABASE_URL : process.env.VITE_SUPABASE_URL),
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    );

    // Fixed destructuring to be safer
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !authData || !authData.user) {
      console.error('Auth verification failed:', authError);
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token: ' + (authError?.message || 'User not found') }),
      };
    }

    const user = authData.user;

    const { data: profile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileFetchError || profile?.role !== 'admin') {
      console.error('Permission check failed:', profileFetchError);
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Admin access required or profile not found' }),
      };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON body' }),
      };
    }

    const { email, password, user_metadata } = body;

    // Newer clients send the name part of the username and let us pick a free one. vSeva and Shraman Seva
    // Group share one login system, so two different people may well have the same name: the first is
    // "alpeshshah", the next "alpeshshah2", and so on. Only the same name AND the same mobile number is
    // treated as the same person and refused. (Older app versions still send a ready-made email; that
    // path below is unchanged.)
    if (body.username_base) {
      return await createWithFreeUsername(supabaseAdmin, profile.organization_id, body);
    }

    console.log(`Creating user: ${email}`);

    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: user_metadata || {}
    });

    if (createError) {
      console.error('Supabase admin create error:', createError);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: createError.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ user_id: createData.user.id }),
    };
  } catch (err) {
    console.error('Internal function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal Server Error', 
        details: err.message,
        stack: err.stack
      }),
    };
  }
}

const bareUsername = (u) => String(u || '').toLowerCase().replace(/@vsevak(\.in)?$/, '');
const last10 = (m) => String(m || '').replace(/\D/g, '').slice(-10);

async function createWithFreeUsername(supabaseAdmin, adminOrgId, body) {
  const base = String(body.username_base).toLowerCase().replace(/[^a-z0-9]/g, '');
  const phone = last10(body.mobile);
  if (base.length < 2) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please enter the full name.' }) };
  }

  // Everyone whose username is this name, with or without a number after it (base is letters/digits only).
  const { data: rows, error } = await supabaseAdmin
    .from('profiles')
    .select('username, mobile, organization_id')
    .ilike('username', `${base}%`)
    .limit(1000);
  if (error) throw error;
  const family = (rows || []).filter((r) => new RegExp(`^${base}\\d*$`).test(bareUsername(r.username)));

  const same = phone && family.find((r) => last10(r.mobile) === phone);
  if (same) {
    const msg = same.organization_id === adminOrgId
      ? `This Sevak (same name and mobile number) is already in your group as "${bareUsername(same.username)}".`
      : 'A Sevak with this name and mobile number already exists in another group. Please check the details.';
    return { statusCode: 409, body: JSON.stringify({ error: msg }) };
  }

  const taken = new Set(family.map((r) => bareUsername(r.username)));
  for (let n = 1; n <= 500; n++) {
    const candidate = n === 1 ? base : `${base}${n}`;
    if (taken.has(candidate)) continue;
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: `${candidate}@vsevak.in`,
      password: body.password,
      email_confirm: true,
      user_metadata: body.user_metadata || {},
    });
    if (!createError) {
      console.log(`Created Sevak login ${candidate}`);
      return { statusCode: 200, body: JSON.stringify({ user_id: created.user.id, username: candidate }) };
    }
    // a login with this address exists without a profile (e.g. left over from a deleted Sevak): try the next
    if (/already|registered|exists/i.test(createError.message || '')) continue;
    console.error('Supabase admin create error:', createError);
    return { statusCode: 400, body: JSON.stringify({ error: createError.message }) };
  }
  return { statusCode: 409, body: JSON.stringify({ error: 'Could not find a free username for this name.' }) };
}

export const handler = withCors(rawHandler);
