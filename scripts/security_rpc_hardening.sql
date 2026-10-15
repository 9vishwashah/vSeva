-- Security hardening of SECURITY DEFINER RPCs (audit 15 Oct 2026). Applied via Supabase MCP as migration
-- "security_rpc_hardening". Rollback: scripts/security_rpc_hardening_rollback.sql (restores the previous,
-- vulnerable definitions - use only if this breaks something, and re-apply a fix right after).
--
-- 1. Directory moderation RPCs trusted the caller-supplied p_admin_id: anyone (even signed out) who knew a
--    Captain's id could approve / edit / archive / reject Community Directory records. They now also require
--    p_admin_id to be the signed-in user. The app already passes currentUser.id, so callers are unaffected.
-- 2. get_sevak_rank, get_total_org_sevaks and get_top_sevaks_leaderboard took any org_id, so anyone could read
--    another group's Sevak names, genders and counts. They now answer only for the caller's own organization
--    (get_my_org_id()); for any other org they return 0 / an empty result, as for an org with no data.
-- 3. Cron-only cleanup functions and trigger functions were callable over /rest/v1/rpc. EXECUTE is revoked from
--    the API roles. pg_cron runs them as postgres, and trigger functions do not need EXECUTE to fire.

do $$
declare
  fn text;
  def text;
begin
  foreach fn in array array['admin_delete_directory_listing','admin_update_directory_listing',
    'approve_directory_change_request','approve_directory_submission',
    'reject_directory_change_request','reject_directory_submission'] loop
    select pg_get_functiondef(p.oid) into def from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = fn;
    if def is null then raise exception 'function % not found', fn; end if;
    if position('auth.uid() IS DISTINCT FROM p_admin_id' in def) > 0 then continue; end if; -- already applied
    def := replace(def,
      'IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = ''admin'') THEN',
      'IF auth.uid() IS DISTINCT FROM p_admin_id OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = ''admin'') THEN');
    if position('auth.uid() IS DISTINCT FROM p_admin_id' in def) = 0 then raise exception 'guard not found in %', fn; end if;
    execute def;
  end loop;
end $$;

create or replace function public.get_total_org_sevaks(org_id uuid)
 returns integer language sql security definer set search_path to 'public', 'pg_temp'
as $function$
  select count(*)::integer
  from profiles
  where organization_id = org_id
    and org_id = public.get_my_org_id()
    and role = 'sevak'
    and is_active = true;
$function$;

create or replace function public.get_sevak_rank(org_id uuid, sevak_username text)
 returns integer language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  v_rank integer;
begin
  if org_id is distinct from public.get_my_org_id() then
    return 0;
  end if;
  with stats as (
    select unnest(sevaks) as username, count(*) as total_vihars, coalesce(sum(distance_km), 0) as total_km
    from public.vihar_entries
    where organization_id = org_id and status = 'approved'
    group by username
  ),
  ranking as (
    select username, rank() over (order by total_vihars desc, total_km desc) as rnk from stats
  )
  select rnk into v_rank from ranking where username = sevak_username;
  return coalesce(v_rank, 0);
end;
$function$;

create or replace function public.get_top_sevaks_leaderboard(org_id uuid, limit_val integer default 10)
 returns json language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  result json;
begin
  if org_id is distinct from public.get_my_org_id() then
    return json_build_object('overall', null, 'male', null, 'female', null);
  end if;
  with sevak_stats as (
    select s.username, s.full_name, coalesce(s.gender, 'Male') as gender,
           count(ve.id) as count, coalesce(sum(ve.distance_km), 0) as km
    from profiles s
    left join vihar_entries ve
      on ve.organization_id = s.organization_id and s.username = any(ve.sevaks) and ve.status = 'approved'
    where s.organization_id = org_id and s.role = 'sevak' and s.is_active = true
    group by s.username, s.full_name, s.gender
  ),
  ranked_stats as (
    select *,
      rank() over (partition by null order by count desc, km desc) as overall_rank,
      rank() over (partition by gender order by count desc, km desc) as gender_rank
    from sevak_stats
  )
  select json_build_object(
    'overall', (select json_agg(row_to_json(r)) from (select * from ranked_stats order by count desc, km desc limit limit_val) r),
    'male', (select json_agg(row_to_json(r)) from (select * from ranked_stats where lower(gender) = 'male' order by count desc, km desc limit limit_val) r),
    'female', (select json_agg(row_to_json(r)) from (select * from ranked_stats where lower(gender) = 'female' order by count desc, km desc limit limit_val) r)
  ) into result;
  return result;
end;
$function$;

revoke execute on function public.cleanup_expired_channel_posts() from public, anon, authenticated;
revoke execute on function public.delete_old_notifications() from public, anon, authenticated;
revoke execute on function public.broadcast_channel_post() from public, anon, authenticated;
revoke execute on function public.guard_sevak_password_change() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.notify_channel_followers_new_post() from public, anon, authenticated;
revoke execute on function public.notify_send_push_webhook() from public, anon, authenticated;
revoke execute on function public.set_channel_post_reply_snapshot() from public, anon, authenticated;
revoke execute on function public.sync_vihar_sevaks() from public, anon, authenticated;

-- 4. Table policies that allowed reads across every organization, signed in or not:
--    - upcoming_vihars: two SELECT policies were `true`, exposing every group's upcoming Vihars including the
--      emergency contact name and phone. The app only ever reads its own organization's rows.
--    - push_subscriptions: "Service role can read all subscriptions" was `true` for every role. The service role
--      bypasses RLS anyway, so the policy only opened the table to everyone else. (The table is currently empty.)
--    - organizations: any signed-in user could insert an organization row. Organizations are created only by
--      approve-org (service role) and the handle_new_user trigger (security definer), neither of which needs it.
drop policy if exists "Org members can view upcoming vihars" on public.upcoming_vihars;
drop policy if exists "Users can view org upcoming vihars" on public.upcoming_vihars;
create policy "Org members can view upcoming vihars" on public.upcoming_vihars
  for select to authenticated using (organization_id = public.get_my_org_id());

drop policy if exists "Service role can read all subscriptions" on public.push_subscriptions;

drop policy if exists "Enable insert for authenticated users only" on public.organizations;
