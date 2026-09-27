import { createClient } from '@supabase/supabase-js';

// Lets a Captain (ORG_ADMIN) edit their own display name and their org's
// Vice Captain name. Both writes go through the service role because a
// Sevak's session has no "update organizations" RLS policy today, and this
// keeps the admin-role check server-verified rather than trusted from the client.
export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Missing Authorization header' }) };
    }
    const jwt = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(
      (process.env.SUPABASE_URL && process.env.SUPABASE_URL.includes('.supabase.co') ? process.env.SUPABASE_URL : process.env.VITE_SUPABASE_URL),
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !authData?.user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token: ' + (authError?.message || 'User not found') }) };
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', authData.user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) };
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const { captainName, viceCaptainName } = body;

    if (captainName !== undefined) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ full_name: captainName })
        .eq('id', authData.user.id);
      if (error) throw error;
    }

    if (viceCaptainName !== undefined) {
      const { error } = await supabaseAdmin
        .from('organizations')
        .update({ vice_captain_name: viceCaptainName || null })
        .eq('id', profile.organization_id);
      if (error) throw error;
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal Server Error' }) };
  }
}
