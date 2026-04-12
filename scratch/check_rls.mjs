import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRLS() {
    const { data, error } = await supabase.rpc('pg_get_rowlevelsecurity', { table_name: 'registration_requests' });
    // If RPC doesn't exist, try querying pg_catalog
    if (error) {
        const { data: policies, error: pErr } = await supabase
            .from('pg_policies')
            .select('*')
            .eq('tablename', 'registration_requests');
        
        if (pErr) {
            console.error("Error checking policies:", pErr);
        } else {
            console.log("Policies:", policies);
        }
    } else {
        console.log("RLS Status:", data);
    }

    const { data: hasRLS, error: hError } = await supabase.rpc('check_table_rls', { t_name: 'registration_requests' });
    if (hError) {
         const { data: tableInfo, error: tErr } = await supabase
            .from('pg_class')
            .select('relrowsecurity')
            .eq('relname', 'registration_requests')
            .single();
         if (tErr) console.error(tErr);
         else console.log("Table relrowsecurity:", tableInfo.relrowsecurity);
    }
}
checkRLS();
