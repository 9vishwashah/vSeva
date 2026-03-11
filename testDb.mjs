import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) console.error(error);
    else {
        data.forEach(p => console.log(`[${p.username}] -> [${p.full_name}] | org: ${p.organization_id} | active: ${p.is_active}`));
    }
}
check();
