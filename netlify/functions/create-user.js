import { createClient } from '@supabase/supabase-js';

export async function handler(event) {
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
      .select('role')
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
