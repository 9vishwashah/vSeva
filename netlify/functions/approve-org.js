import { createClient } from '@supabase/supabase-js';

export async function handler(event) {
    try {
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                body: JSON.stringify({ error: 'Method Not Allowed' }),
            };
        }

        const { requestId, orgName, city, fullName, email, mobile, password } = JSON.parse(event.body);

        if (!requestId || !orgName || !email || !password) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields' }),
            };
        }

        // 1. Initialize Supabase with Service Role Key (Admin Access)
        let supabaseUrl = (process.env.SUPABASE_URL && process.env.SUPABASE_URL.includes('.supabase.co') ? process.env.SUPABASE_URL : process.env.VITE_SUPABASE_URL);
        if (supabaseUrl && !supabaseUrl.includes('supabase.co')) { supabaseUrl = process.env.VITE_SUPABASE_URL; }
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl) throw new Error("Missing SUPABASE_URL in environment variables.");
        if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in environment variables. Admin operations require the service role key.");

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // 2. Create Organization
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert({
                name: orgName,
                city: city
            })
            .select()
            .single();

        if (orgError) throw new Error("Failed to create organization: " + orgError.message);

        // 3. Create Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: 'admin', // maps to ORG_ADMIN in types
                organization_id: org.id
            }
        });

        if (authError) throw new Error("Failed to create auth user: " + authError.message);

        // 4. Create Profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authData.user.id,
                organization_id: org.id,
                role: 'admin',
                full_name: fullName,
                username: email, // treating email as username for admin
                mobile: mobile,
                is_active: true
            });

        if (profileError) throw new Error("Failed to create profile: " + profileError.message);

        // 5. Update Request Status
        const { error: reqError } = await supabaseAdmin
            .from('registration_requests')
            .update({ status: 'approved' })
            .eq('id', requestId);

        if (reqError) console.warn("User created but request status update failed");

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Organization approved successfully", orgId: org.id }),
        };

    } catch (err) {
        console.error("Approval Error:", err);
        return {
            // Vite proxy often swallows 500 errors and replaces them with empty/HTML body.
            // Using 400 allows the actual error message to reach the React frontend for display.
            statusCode: 400,
            body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
        };
    }
}
