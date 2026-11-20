-- Super Admin accounts that don't need a Captain profile, a Super-Admin-only Directory, and an audit log
-- for "Open as Captain". Additive and idempotent; nothing is deleted. Rollback: scripts/platform_admins_rollback.sql
--
-- 1. platform_admins: the vSeva platform owner(s). The Directory database functions check this table (they
--    can't read Netlify's SUPER_ADMIN_EMAILS). Keep it in step with SUPER_ADMIN_EMAILS on the vseva site.
-- 2. The 9 Directory functions accepted ANY Captain (profiles.role = 'admin'), so any group's Captain could approve,
--    edit or archive public Directory listings by calling them directly. They now accept platform admins only.
-- 3. directory_*.reviewed_by_id pointed at profiles, which a profile-less Super Admin account doesn't have; it now
--    points at auth.users (every existing value is a user id, so nothing changes for existing rows).
-- 4. admin_audit_log: who opened which Captain account, and when (written by netlify/functions/super-admin.js).

begin;

create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;  -- no policies: service role only
revoke all on public.platform_admins from anon, authenticated;

create or replace function public.is_platform_admin(p_uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$ select p_uid is not null and exists (select 1 from public.platform_admins where user_id = p_uid) $$;
revoke all on function public.is_platform_admin(uuid) from public, anon;
grant execute on function public.is_platform_admin(uuid) to authenticated;

-- today's platform owner on the vseva site (SUPER_ADMIN_EMAILS), so the Directory keeps working before and after deploy
insert into public.platform_admins (user_id, email, note)
select u.id, lower(u.email), 'from SUPER_ADMIN_EMAILS, 18 Nov 2026'
  from auth.users u where lower(u.email) in ('viharsevavashi@gmail.com')
on conflict (user_id) do nothing;

create table if not exists public.admin_audit_log (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  actor_id        uuid,
  actor_email     text,
  action          text not null,
  target_user_id  uuid,
  target_email    text,
  organization_id uuid,
  detail          jsonb not null default '{}'::jsonb
);
alter table public.admin_audit_log enable row level security;  -- no policies: service role only
revoke all on public.admin_audit_log from anon, authenticated;
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.directory_submissions drop constraint if exists directory_submissions_reviewed_by_id_fkey;
alter table public.directory_submissions add constraint directory_submissions_reviewed_by_id_fkey
  foreign key (reviewed_by_id) references auth.users(id) on delete set null;
alter table public.directory_change_requests drop constraint if exists directory_change_requests_reviewed_by_id_fkey;
alter table public.directory_change_requests add constraint directory_change_requests_reviewed_by_id_fkey
  foreign key (reviewed_by_id) references auth.users(id) on delete set null;

-- Swap the "any Captain" check for the platform-admin check inside each Directory function, keeping the rest of
-- each function exactly as it is in production. Fails (and rolls everything back) if a function doesn't match.
do $$
declare
  f text;
  def text;
  changed text;
begin
  foreach f in array array[
    'admin_delete_directory_listing', 'admin_update_directory_listing', 'approve_directory_change_request',
    'approve_directory_submission', 'get_directory_counts', 'get_pending_directory_change_requests',
    'get_pending_directory_submissions', 'reject_directory_change_request', 'reject_directory_submission'
  ] loop
    select pg_get_functiondef(p.oid) into def
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = f;
    if def is null then raise exception 'function % not found', f; end if;
    if position('is_platform_admin' in def) > 0 then continue; end if;  -- already done
    changed := replace(def,
      'NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = ''admin'')',
      'NOT public.is_platform_admin(p_admin_id)');
    changed := replace(changed,
      'NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin'')',
      'NOT public.is_platform_admin()');
    if changed = def then raise exception 'function % has an unexpected permission check; not changed', f; end if;
    changed := replace(changed, 'only a Captain/Admin can', 'only a Super Admin can');
    execute changed;
  end loop;
end $$;

commit;
