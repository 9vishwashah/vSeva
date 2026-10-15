-- Audit 15 Oct 2026 (applied as migration "security_signup_storage_limits", approved by the owner).
-- 1. handle_new_user used to create a new organization, with the new account as its Captain, whenever the
--    sign-up metadata carried "org_name". That bypassed manual approval of new groups (approve-org) and was
--    reachable through public sign-up. Never used (0 accounts had org_name). Now it does nothing; organizations
--    are created only by approve-org. The trigger stays in place so nothing else changes.
-- 2. Upload limits on buckets that had none (existing files: avatars max 123 KB jpeg, incidents max 4 MB).
create or replace function public.handle_new_user()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  return new;
end;
$function$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/*'] where id = 'avatars';
update storage.buckets set file_size_limit = 20971520, allowed_mime_types = array['image/*','video/*'] where id = 'incident-reports';
