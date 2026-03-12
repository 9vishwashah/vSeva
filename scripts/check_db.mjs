import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const rs = {};
  const { data: notifs, error: err1 } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(5);
  rs.notifs = notifs;
  rs.err1 = err1;

  const { data: vihars, error: err2 } = await supabase.from('upcoming_vihars').select('*').order('created_at', { ascending: false }).limit(5);
  rs.vihars = vihars;
  rs.err2 = err2;

  fs.writeFileSync('db_out.json', JSON.stringify(rs, null, 2));
}

check();
