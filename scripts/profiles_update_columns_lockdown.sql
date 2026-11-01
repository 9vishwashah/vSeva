-- SECURITY FIX (optional but strongly recommended): limit what a signed-in user may change on their own profile row.
--
-- Today the only UPDATE policy on profiles is "Users can update their own last_login_at", which allows ANY column of
-- the user's own row, and the authenticated role has a table-wide UPDATE grant. So any Sevak could, through the API,
-- set their own role to 'admin' (Captain) or move themselves to another organisation_id.
--
-- The app only ever writes these columns directly on the user's own row:
--   last_login_at (App.tsx, Login.tsx), avatar_url, yearly_goal, date_of_birth (dataService.ts),
--   age (older app versions still installed).
-- Everything else goes through security-definer functions (update_own_profile, update_sevak_profile_by_admin,
-- create/delete via Netlify functions with the service role), which column grants do not affect.
--
-- Run after scripts/date_of_birth_birthdays.sql (needs the date_of_birth column). To undo:
--   grant update on public.profiles to authenticated;

revoke update on public.profiles from authenticated, anon;
grant update (last_login_at, avatar_url, yearly_goal, date_of_birth, age) on public.profiles to authenticated;
