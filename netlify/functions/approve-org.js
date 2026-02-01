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
        const supabaseAdmin = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

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
            statusCode: 500,
            body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
        };
    }
}
