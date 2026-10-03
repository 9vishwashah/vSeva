// Checks the Sevak password guard from the outside, the way a Sevak could attack it:
// signs in as the given Sevak and tries to change their own password to a DIFFERENT value
// (Supabase itself rejects "same as old", which would prove nothing). If the change is
// allowed (guard not enforcing) it is immediately reverted.
//   node scripts/test_sevak_password_guard.mjs <sevak username> <password>
// Stage 1 (observe): change is ALLOWED then reverted; a row with had_grant=false appears in password_change_log.
// Stage 2 (enforce): change is REFUSED with "Passwords for Sevak accounts are changed by their Captain."
// Also confirms the original password still signs in afterwards.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const [username, password] = process.argv.slice(2);
if (!username || !password) { console.error('usage: test_sevak_password_guard.mjs <username> <password>'); process.exit(2); }

const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_ANON_KEY;
const clean = username.toLowerCase().replace(/[^a-z0-9]/g, '');
const emails = [`${clean}@vsevak.in`, `${clean}@vsevak`, username.toLowerCase()];
const probe = password + '#guardtest';

const client = createClient(url, key, { auth: { persistSession: false } });
let session = null;
for (const email of emails) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (!error && data.session) { session = data.session; break; }
}
if (!session) { console.error('sign-in failed'); process.exit(1); }
console.log('1. sign-in: OK');

const { error } = await client.auth.updateUser({ password: probe });
if (error) {
  console.log('2. self password change to a different value: REFUSED ->', error.message);
} else {
  console.log('2. self password change to a different value: ALLOWED  <-- guard is NOT enforcing; reverting');
  const back = await client.auth.updateUser({ password });
  console.log('   revert:', back.error ? `FAILED -> ${back.error.message}  (password is now "${probe}")` : 'done');
}

const again = createClient(url, key, { auth: { persistSession: false } });
let ok = false;
for (const email of emails) {
  const r = await again.auth.signInWithPassword({ email, password });
  if (!r.error) { ok = true; break; }
}
console.log('3. original password still signs in:', ok ? 'YES' : 'NO  <-- investigate');
