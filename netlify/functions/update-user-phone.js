import { createClient } from '@supabase/supabase-js';

export async function handler(event) {
  try {
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

    const { data: { user }, error: authError } =
      await supabaseAdmin.auth.getUser(jwt);

    if (authError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Admin access required' }),
      };
    }

    const { user_id, new_mobile } = JSON.parse(event.body);

    if (!user_id || !new_mobile) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing user_id or new_mobile' }),
      };
    }

    // Update the user's password in auth
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_mobile }
    );

    if (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Phone number and password updated successfully" }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
    };
  }
}
