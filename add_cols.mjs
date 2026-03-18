import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function addCols() {
  const { data, error } = await supabaseAdmin.rpc('run_sql', {
    sql_query: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_number text, ADD COLUMN IF NOT EXISTS address text;"
  });
  if (error) {
    console.error("RPC failed, trying fallback:", error);
    // fallback if no rpc
    const res = await supabaseAdmin.from('profiles').select('id').limit(1);
    console.log(res);
  } else {
    console.log("Success:", data);
  }
}
addCols();
