-- Sevak password guard, STAGE 1 of 2: OBSERVE ONLY — blocks nothing.
--
-- Goal: only a Captain (through the update-user-phone Netlify function) may change a Sevak's
-- password; a Sevak must not be able to change their own (supabase.auth.updateUser from the
-- browser). The login service does not tell the database WHO is changing a password, so:
--   * the server function writes a short-lived "grant" row just before it changes a Sevak's password;
--   * a trigger on auth.users sees every password change; for a Sevak account without a grant
--     it will (stage 2) refuse the change.
--
-- Why two stages: Supabase's login service can re-hash a stored password during a NORMAL sign-in
-- (hash upgrades). If it does, a blocking trigger would break every Sevak login. This stage only
-- RECORDS what happens, never blocks, and fails open, so it is safe to apply first.
--
-- How to read the result (run after each action, newest first):
--   select * from public.password_change_log order by at desc limit 20;
--   1. Sign in as a Sevak (several times)      -> expect NO new rows. (A row here means logins
--      change the password hash: DO NOT apply stage 2.)
--   2. As a Captain, edit a Sevak's mobile     -> expect a row with had_grant = true
--      (requires the updated update-user-phone function to be deployed first).
--   3. (optional) node scripts/test_sevak_password_guard.mjs <username> <password>
--      -> expect a row with had_grant = false (that is the change stage 2 will block).
--
-- Rollback: scripts/sevak_password_guard_rollback.sql

begin;

-- Short-lived permission slips written only by server code using the service role.
create table if not exists public.password_change_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '2 minutes')
);
alter table public.password_change_grants enable row level security;  -- no policies: invisible to clients
revoke all on table public.password_change_grants from anon, authenticated;

-- What the trigger saw (kept small; delete rows whenever you like).
create table if not exists public.password_change_log (
  id bigserial primary key,
  user_id uuid not null,
  role text,
  had_grant boolean not null,
  at timestamptz not null default now()
);
alter table public.password_change_log enable row level security;
revoke all on table public.password_change_log from anon, authenticated;

create or replace function public.guard_sevak_password_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $$
declare
  v_role text;
  v_grant boolean := false;
begin
  begin
    select p.role into v_role from public.profiles p where p.id = new.id;
    if v_role = 'sevak' then
      select exists (
        select 1 from public.password_change_grants g where g.user_id = new.id and g.expires_at > now()
      ) into v_grant;
      insert into public.password_change_log (user_id, role, had_grant) values (new.id, v_role, v_grant);
      if v_grant then
        delete from public.password_change_grants where user_id = new.id;  -- one use only
      end if;
    end if;
  exception when others then
    null;  -- observe mode: never get in the way of the login service
  end;
  return new;
end;
$$;

drop trigger if exists guard_sevak_password_change on auth.users;
create trigger guard_sevak_password_change
  before update of encrypted_password on auth.users
  for each row
  when (old.encrypted_password is distinct from new.encrypted_password)
  execute function public.guard_sevak_password_change();

commit;
