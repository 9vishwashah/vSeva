-- Sevak password guard, STAGE 2 of 2: ENFORCE.
--
-- Apply ONLY after stage 1 has been observed (see its header) and:
--   * Sevak sign-ins produced no rows in password_change_log, and
--   * the updated update-user-phone Netlify function is deployed (otherwise a Captain editing a
--     Sevak's mobile number is refused too).
--
-- After this, changing a Sevak account's password without a server-issued grant fails with
--   "Passwords for Sevak accounts are changed by their Captain."
-- If the trigger itself ever errors for another reason it fails OPEN (the change is allowed) —
-- only the deliberate refusal below blocks.
--
-- Immediate rollback (restores observe-only behaviour): re-run scripts/sevak_password_guard_1_observe.sql
-- Full removal: scripts/sevak_password_guard_rollback.sql

begin;

create or replace function public.guard_sevak_password_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $$
declare
  v_role text;
  v_grant boolean := false;
  v_block boolean := false;
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
      else
        v_block := true;
      end if;
    end if;
  exception when others then
    return new;  -- fail open
  end;

  if v_block then
    raise exception 'Passwords for Sevak accounts are changed by their Captain.';
  end if;
  return new;
end;
$$;

commit;
