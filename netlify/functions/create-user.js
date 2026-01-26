import { createClient } from '@supabase/supabase-js';

export default async function handler(request) {
  try {
    // 1. Only allow POST
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method Not Allowed' }),
        { status: 405 }
      );
    }

    // 2. Authorization header required
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401 }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');

    // 3. Supabase admin client (service role)
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 4. Verify admin user
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401 }
      );
    }

    // 5. Check admin role from profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403 }
      );
    }

    // 6. Parse request body
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400 }
      );
    }

    // 7. Create auth user
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400 }
      );
    }

    // 8. SUCCESS — return Response (THIS IS CRITICAL)
    return new Response(
      JSON.stringify({ user_id: newUser.user.id }),
      { status: 200 }
    );

  } catch (err) {
    console.error('create-user error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500 }
    );
  }
}
