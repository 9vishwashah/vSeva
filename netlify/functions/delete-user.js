import { createClient } from '@supabase/supabase-js';

export async function handler(event, context) {
  try {
    // 1. Allow only POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }

    // 2. Require Authorization header
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Missing Authorization header' }),
      };
    }

    const jwt = authHeader.replace('Bearer ', '');

    // 3. Supabase admin client
    // Use SUPABASE_URL if available, fallback to VITE_SUPABASE_URL if needed, but create-user uses SUPABASE_URL
    let supabaseUrl = (process.env.SUPABASE_URL && process.env.SUPABASE_URL.includes('.supabase.co') ? process.env.SUPABASE_URL : process.env.VITE_SUPABASE_URL);
        if (supabaseUrl && !supabaseUrl.includes('supabase.co')) { supabaseUrl = process.env.VITE_SUPABASE_URL; }
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Verify admin (using the JWT from the request to check caller identity)
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid or expired token' }),
      };
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') { // Assuming 'admin' is the role string, based on previous code. Check if it's 'org_admin' or 'admin'. Previous code used 'admin'.
      // Double check role. In dataService.ts, Role is UserRole.ORG_ADMIN usually.
      // Let's check existing delete-user.js line 49: profile.role !== 'admin'
      // OK, keeping 'admin'.
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Admin access required' }),
      };
    }

    // 5. Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON body' }),
      };
    }

    const { user_id } = body;

    if (!user_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing user_id' }),
      };
    }

    // 6. Delete user from Supabase Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error('Supabase deleteUser error:', deleteError);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: deleteError.message }),
      };
    }

    // 7. Success
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };

  } catch (err) {
    console.error('delete-user error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
}
