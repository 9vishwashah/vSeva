-- Removes the Sevak password guard completely (trigger, function, helper tables).
begin;
drop trigger if exists guard_sevak_password_change on auth.users;
drop function if exists public.guard_sevak_password_change();
drop table if exists public.password_change_grants;
drop table if exists public.password_change_log;
commit;
