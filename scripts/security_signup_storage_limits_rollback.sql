-- Rollback for scripts/security_signup_storage_limits.sql (restores the org-creating sign-up path - unsafe).
create or replace function public.handle_new_user()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  new_org_id uuid;
begin
  if new.raw_user_meta_data->>'org_name' is not null then
    insert into public.organizations (name, city, created_by)
    values (new.raw_user_meta_data->>'org_name', new.raw_user_meta_data->>'city', new.id)
    returning id into new_org_id;
    insert into public.profiles (id, organization_id, role, full_name, username, mobile)
    values (new.id, new_org_id, 'admin', new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'mobile');
  end if;
  return new;
end;
$function$;
update storage.buckets set file_size_limit = null, allowed_mime_types = null where id in ('avatars', 'incident-reports');
