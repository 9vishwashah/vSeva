import { createClient } from '@supabase/supabase-js';

export async function handler(event) {
    try {
        const supabaseAdmin = createClient(
            (process.env.SUPABASE_URL && process.env.SUPABASE_URL.includes('.supabase.co') ? process.env.SUPABASE_URL : process.env.VITE_SUPABASE_URL),
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const email = 'unitedtyresvapi@gmail.com';
        const newPassword = '9824112292';

        // 1. Get User ID
        // admin.listUsers() is pagination based, but we can list by email if supported or just list first page and find.
        // Actually, generateLink or updateUser might perform lookup.
        // There isn't a direct "getUserByEmail" in admin api publicly always exposed cleanly without list.
        // But we can blindly try to update? No, existing method updateUserById requires ID.

        // Let's search.
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) throw listError;

        const user = users.find(u => u.email === email);

        if (!user) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: `User ${email} not found` }),
            };
        }

        // 2. Update Password
        const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { password: newPassword }
        );

        if (updateError) throw updateError;

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Success! Password for ${email} has been reset to ${newPassword}`,
                user: data.user
            }),
        };

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
}
