import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data, error } = await supabase
        .from('registration_requests')
        .select('*');
    
    if (error) {
        console.error(error);
    } else {
        console.log(`Total Requests: ${data.length}`);
        console.log("Details:", data.map(r => ({ id: r.id, group: r.vihar_group_name, status: r.status })));
    }
}
check();
