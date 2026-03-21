import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabaseAdmin.rpc('run_sql', {
    sql_query: "SELECT * FROM pg_policies WHERE tablename = 'profiles';"
  });
  console.log("Error:", error);
  console.log("Data:", data);
}
check();
