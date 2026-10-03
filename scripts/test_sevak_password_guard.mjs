// Checks the Sevak password guard from the outside, the way a Sevak could attack it:
// signs in as the given Sevak and tries to change their own password to the SAME value
// (so a successful change leaves the account unchanged).
//   node scripts/test_sevak_password_guard.mjs <sevak username> <password>
// Stage 1 (observe): change succeeds, a row with had_grant=false appears in password_change_log.
// Stage 2 (enforce): change is refused.
// Also confirms normal sign-in still works afterwards.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const [username, password] = process.argv.slice(2);
if (!username || !password) { console.error('usage: test_sevak_password_guard.mjs <username> <password>'); process.exit(2); }

const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_ANON_KEY;
const clean = username.toLowerCase().replace(/[^a-z0-9]/g, '');
const emails = [`${clean}@vsevak.in`, `${clean}@vsevak`, username.toLowerCase()];

const client = createClient(url, key, { auth: { persistSession: false } });
let session = null;
for (const email of emails) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (!error && data.session) { session = data.session; break; }
}
if (!session) { console.error('sign-in failed'); process.exit(1); }
console.log('1. sign-in: OK');

const { error } = await client.auth.updateUser({ password });
console.log('2. self password change:', error ? `REFUSED -> ${error.message}` : 'ALLOWED');

const again = createClient(url, key, { auth: { persistSession: false } });
let ok = false;
for (const email of emails) {
  const r = await again.auth.signInWithPassword({ email, password });
  if (!r.error) { ok = true; break; }
}
console.log('3. sign-in still works afterwards:', ok ? 'YES' : 'NO  <-- investigate');
