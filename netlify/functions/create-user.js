import { createClient } from "@supabase/supabase-js";

export default async function handler(req) {
  try {
    /* ─────────────────────────────────────────────
       1. Method check
    ───────────────────────────────────────────── */
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405 }
      );
    }

    /* ─────────────────────────────────────────────
       2. Environment validation
    ───────────────────────────────────────────── */
    if (
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error("Missing Supabase env vars");
      return new Response(
        JSON.stringify({
          error: "Server misconfiguration: missing env variables",
        }),
        { status: 500 }
      );
    }

    /* ─────────────────────────────────────────────
       3. Parse request body
    ───────────────────────────────────────────── */
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400 }
      );
    }

    /* ─────────────────────────────────────────────
       4. Verify caller is authenticated admin
    ───────────────────────────────────────────── */
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401 }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");

    const supabaseAuth = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: userData, error: userError } =
      await supabaseAuth.auth.getUser(jwt);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401 }
      );
    }

    /* ─────────────────────────────────────────────
       5. Check admin role
    ───────────────────────────────────────────── */
    const { data: profile, error: profileError } = await supabaseAuth
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can create users" }),
        { status: 403 }
      );
    }

    /* ─────────────────────────────────────────────
       6. Create auth user (ADMIN ACTION)
    ───────────────────────────────────────────── */
    const { data, error } = await supabaseAuth.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      console.error("Supabase createUser error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400 }
      );
    }

    /* ─────────────────────────────────────────────
       7. Success response
    ───────────────────────────────────────────── */
    return new Response(
      JSON.stringify({ user_id: data.user.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("create-user function crashed:", err);

    return new Response(
      JSON.stringify({
        error: err?.message || "Internal Server Error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
