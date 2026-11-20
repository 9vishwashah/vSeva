-- Undo scripts/platform_admins.sql: Directory functions accept any Captain again, reviewer ids point at profiles.
-- Keeps the platform_admins and admin_audit_log tables (drop them by hand if really wanted).
begin;

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
    changed := replace(def, 'NOT public.is_platform_admin(p_admin_id)',
      'NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = ''admin'')');
    changed := replace(changed, 'NOT public.is_platform_admin()',
      'NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin'')');
    changed := replace(changed, 'only a Super Admin can', 'only a Captain/Admin can');
    if changed <> def then execute changed; end if;
  end loop;
end $$;

-- a reviewer without a profile (a profile-less Super Admin) can't be referenced by profiles: clear those first
update public.directory_submissions set reviewed_by_id = null
 where reviewed_by_id is not null and not exists (select 1 from public.profiles p where p.id = reviewed_by_id);
update public.directory_change_requests set reviewed_by_id = null
 where reviewed_by_id is not null and not exists (select 1 from public.profiles p where p.id = reviewed_by_id);
alter table public.directory_submissions drop constraint if exists directory_submissions_reviewed_by_id_fkey;
alter table public.directory_submissions add constraint directory_submissions_reviewed_by_id_fkey
  foreign key (reviewed_by_id) references public.profiles(id) on delete set null;
alter table public.directory_change_requests drop constraint if exists directory_change_requests_reviewed_by_id_fkey;
alter table public.directory_change_requests add constraint directory_change_requests_reviewed_by_id_fkey
  foreign key (reviewed_by_id) references public.profiles(id) on delete set null;

commit;
