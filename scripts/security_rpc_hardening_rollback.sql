-- Rollback for scripts/security_rpc_hardening.sql. This RESTORES THE VULNERABLE behaviour; use only if the
-- hardening breaks a screen, and fix forward right after.

do $$
declare
  fn text;
  def text;
begin
  foreach fn in array array['admin_delete_directory_listing','admin_update_directory_listing',
    'approve_directory_change_request','approve_directory_submission',
    'reject_directory_change_request','reject_directory_submission'] loop
    select pg_get_functiondef(p.oid) into def from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = fn;
    def := replace(def, 'IF auth.uid() IS DISTINCT FROM p_admin_id OR NOT EXISTS', 'IF NOT EXISTS');
    execute def;
  end loop;
end $$;

create or replace function public.get_total_org_sevaks(org_id uuid)
 returns integer language sql security definer set search_path to 'public', 'pg_temp'
as $function$
  select count(*)::integer from profiles where organization_id = org_id and role = 'sevak' and is_active = true;
$function$;

create or replace function public.get_sevak_rank(org_id uuid, sevak_username text)
 returns integer language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  v_rank integer;
begin
  with stats as (
    select unnest(sevaks) as username, count(*) as total_vihars, coalesce(sum(distance_km), 0) as total_km
    from public.vihar_entries where organization_id = org_id and status = 'approved' group by username
  ),
  ranking as (select username, rank() over (order by total_vihars desc, total_km desc) as rnk from stats)
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

grant execute on function public.cleanup_expired_channel_posts() to anon, authenticated;
grant execute on function public.delete_old_notifications() to anon, authenticated;
grant execute on function public.broadcast_channel_post() to anon, authenticated;
grant execute on function public.guard_sevak_password_change() to anon, authenticated;
grant execute on function public.handle_new_user() to anon, authenticated;
grant execute on function public.notify_channel_followers_new_post() to anon, authenticated;
grant execute on function public.notify_send_push_webhook() to anon, authenticated;
grant execute on function public.set_channel_post_reply_snapshot() to anon, authenticated;
grant execute on function public.sync_vihar_sevaks() to anon, authenticated;

drop policy if exists "Org members can view upcoming vihars" on public.upcoming_vihars;
create policy "Org members can view upcoming vihars" on public.upcoming_vihars for select using (true);
create policy "Users can view org upcoming vihars" on public.upcoming_vihars for select using (true);
create policy "Service role can read all subscriptions" on public.push_subscriptions for select using (true);
create policy "Enable insert for authenticated users only" on public.organizations for insert to authenticated with check (true);
