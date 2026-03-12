import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: users, error: e1 } = await supabase.from('profiles').select('id, organization_id').limit(5);
  console.log('Users:', users);
}

check();
