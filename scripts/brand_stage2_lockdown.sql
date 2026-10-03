-- White-label brands, STAGE 2 of 2 — closes the Super Admin data paths.
--
-- APPLY ONLY AFTER:
--   (a) the new code is deployed (Super Admin reads/writes go through the
--       authenticated Netlify functions, not these RPCs / table policies), and
--   (b) SUPER_ADMIN_EMAILS is set in the vSeva Netlify site's environment
--       (and BRAND_ADMIN_EMAILS_SSG on the SSG site) — otherwise nobody can
--       open /super-admin until it is.
-- If you apply this earlier, the OLD deployed Super Admin page stops working.
--
-- Why this exists. Verified against the live database before writing this:
--   * get_pending_registration_requests() is SECURITY DEFINER and executable by
--     the anonymous role; it returns SELECT * of every pending request —
--     names, mobile numbers, emails, home addresses — to anyone on the internet.
--   * get_org_activity_stats() likewise returns every organisation to anyone.
--   * registration_requests has an UPDATE policy of "true" for every signed-in
--     user (any Sevak could approve/alter any request) and a SELECT policy for
--     "any Captain of any organisation" (every Captain can read every other
--     group's applicant details).
--   * The approve-org Netlify function performed no authentication at all.
-- The functions now do their own authorisation and brand scoping with the service
-- role, so none of the above needs to stay open.
--
-- Rollback (restores today's behaviour — i.e. the holes):
--   grant execute on function public.get_pending_registration_requests(), public.get_org_activity_stats() to anon, authenticated;
--   create policy "Enable update for authenticated users only" on public.registration_requests for update to authenticated using (true) with check (true);
--   create policy "Enable select for admins" on public.registration_requests for select to authenticated
--     using (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'));

begin;

revoke execute on function public.get_pending_registration_requests() from public, anon, authenticated;
revoke execute on function public.get_org_activity_stats()            from public, anon, authenticated;
grant  execute on function public.get_pending_registration_requests() to service_role;
grant  execute on function public.get_org_activity_stats()            to service_role;

drop policy if exists "Enable update for authenticated users only" on public.registration_requests;
drop policy if exists "Enable select for admins"                   on public.registration_requests;

-- Public registration stays open (that is how a new Captain applies) but can only
-- ever create a PENDING request.
drop policy if exists "Enable insert for everyone" on public.registration_requests;
create policy "Enable insert for everyone" on public.registration_requests
  for insert to public
  with check (status = 'pending');

commit;
