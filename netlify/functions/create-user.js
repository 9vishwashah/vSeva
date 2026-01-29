import { createClient } from '@supabase/supabase-js';

export async function handler(event, context) {
  try {
    // 1. Allow POST only
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }

    // 2. Authorization header
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Missing Authorization header' }),
      };
    }

    const jwt = authHeader.replace('Bearer ', '');

    // 3. Supabase admin client
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 4. Verify user
    const { data, error: authError } =
      await supabaseAdmin.auth.getUser(jwt);

    if (authError || !data?.user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid or expired token' }),
      };
    }

    // 5. Check admin role
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

    if (profileError || profile.role !== 'admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Admin access required' }),
      };
    }

    // 6. Parse body
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and password required' }),
      };
    }

    // 7. Create user
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: createError.message }),
      };
    }

    // 8. Success
    return {
      statusCode: 200,
      body: JSON.stringify({ user_id: newUser.user.id }),
    };
  } catch (err) {
    console.error('create-user error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
}
