import { createClient } from "@supabase/supabase-js";

export default async function handler(req, context) {
  // Check HTTP method (using 'req' as the event object typical in Netlify Functions)
  const httpMethod = req.httpMethod || req.method;
  
  if (httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    // Parse body - handling both raw string (Lambda style) or pre-parsed body if middleware exists
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, password, user_metadata } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing email or password" }),
      };
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: user_metadata || {} // Pass metadata if available
    });

    if (error) {
      console.error("Supabase Create User Error:", error);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        user_id: data.user.id,
      }),
    };
  } catch (err) {
    console.error("Netlify Function Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error" }),
    };
  }
}