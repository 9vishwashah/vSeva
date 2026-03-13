import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debug() {
    console.log("--- Checking Extensions ---");
    const { data: ext, error: extErr } = await supabase.rpc('debug_check_extensions');
    if (extErr) {
        // Fallback if rpc doesn't exist
        console.log("Could not run debug_check_extensions, trying manual query...");
        const { data: ext2, error: extErr2 } = await supabase.from('pg_extension').select('extname');
        if (extErr2) console.error("Error checking extensions:", extErr2);
        else console.log("Extensions:", ext2);
    } else {
        console.log("Extensions:", ext);
    }

    console.log("\n--- Checking RPC Function create_upcoming_alert ---");
    const { data: funcs, error: funcErr } = await supabase.rpc('debug_check_function', { func_name: 'create_upcoming_alert' });
    if (funcErr) {
        console.log("Could not run debug_check_function, checking profiles for org IDs...");
        const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, full_name, organization_id, role').limit(5);
        if (pErr) console.error("Error checking profiles:", pErr);
        else console.log("Profiles Sample:", profiles);
    } else {
        console.log("Function details:", funcs);
    }
}
debug();
