-- White-label brands, STAGE 1 of 2 — additive and behaviour-neutral.
-- Safe to apply before the new code is deployed: every existing organisation has
-- brand = NULL, which means "vSeva", and with all brands equal the Channel rules
-- below behave exactly as they do today.
--
-- What it does
--   1. organizations.brand and registration_requests.brand (nullable text).
--      NULL = vSeva (the original product). 'ssg' = Shraman Seva Group.
--   2. Channel segregation, enforced in the database (not just the UI):
--        * search_channel_organizations  -> only same-brand orgs are discoverable
--        * channel_follows INSERT policy -> cannot follow an org of another brand
--        * can_read_channel              -> own org, or a followed org of the SAME brand
--          (this one function also gates channel_posts SELECT and the Realtime
--           topic authorisation, so posts and live updates are covered too)
--        * get_channel_org_profile / get_channel_recent_vihars -> same-brand only,
--          and no longer callable by a signed-out visitor (they returned any
--          org's profile / recent Vihars to anonymous callers before).
--   Directory is deliberately untouched — it stays common to every brand.
--
-- Rollback: restore the previous function bodies / policy (saved in
-- scripts/brand_rollback_stage1.sql) and `alter table ... drop column brand`.
--   5. SOS alerts to Captains are titled with the organisation's brand ('🚨 VSeva SOS' for
--      vSeva organisations — unchanged — and '🚨 SSG SOS' for SSG ones).

begin;

-- 1. Columns ---------------------------------------------------------------
alter table public.organizations
  add column if not exists brand text;
alter table public.registration_requests
  add column if not exists brand text;

alter table public.organizations
  drop constraint if exists organizations_brand_format;
alter table public.organizations
  add constraint organizations_brand_format check (brand is null or brand ~ '^[a-z0-9_-]{2,20}$');

alter table public.registration_requests
  drop constraint if exists registration_requests_brand_format;
alter table public.registration_requests
  add constraint registration_requests_brand_format check (brand is null or brand ~ '^[a-z0-9_-]{2,20}$');

-- 2. Helpers ---------------------------------------------------------------
create or replace function public.org_brand(p_org uuid)
 returns text
 language sql
 stable
 security definer
 set search_path to 'public'
as $$
  select coalesce((select o.brand from public.organizations o where o.id = p_org), 'vseva');
$$;

revoke all on function public.org_brand(uuid) from public, anon;
grant execute on function public.org_brand(uuid) to authenticated, service_role;

-- 3. Channel: reading ------------------------------------------------------
create or replace function public.can_read_channel(p_organization_id uuid)
 returns boolean
 language sql
 stable
 security definer
 set search_path to 'public'
as $$
  select p_organization_id = public.get_my_org_id()
    or exists (
      select 1 from public.channel_follows f
      where f.follower_organization_id = public.get_my_org_id()
        and f.followed_organization_id = p_organization_id
        and public.org_brand(f.followed_organization_id) = public.org_brand(f.follower_organization_id)
    );
$$;

create or replace function public.search_channel_organizations(p_query text, p_limit integer default 20)
 returns table(id uuid, name text, city text, town text)
 language sql
 stable
 security definer
 set search_path to 'public'
as $$
  select o.id, o.name, o.city, o.town
  from public.organizations o
  where o.id <> public.get_my_org_id()
    and coalesce(o.brand, 'vseva') = public.org_brand(public.get_my_org_id())
    and (
      p_query is null or p_query = '' or
      o.name ilike '%' || p_query || '%' or
      o.city ilike '%' || p_query || '%' or
      o.town ilike '%' || p_query || '%'
    )
  order by o.name
  limit least(greatest(p_limit, 1), 50);
$$;

create or replace function public.get_channel_org_profile(p_organization_id uuid)
 returns table(id uuid, name text, city text, town text, vice_captain_name text, created_at timestamp with time zone)
 language sql
 stable
 security definer
 set search_path to 'public'
as $$
  select o.id, o.name, o.city, o.town, o.vice_captain_name, o.created_at
  from public.organizations o
  where o.id = p_organization_id
    and public.get_my_org_id() is not null
    and (o.id = public.get_my_org_id()
         or coalesce(o.brand, 'vseva') = public.org_brand(public.get_my_org_id()));
$$;

create or replace function public.get_channel_recent_vihars(p_organization_id uuid, p_limit integer default 5)
 returns table(vihar_date date, vihar_from text, vihar_to text, vihar_type text, distance_km numeric, sevak_count integer)
 language sql
 stable
 security definer
 set search_path to 'public'
as $$
  select
    v.vihar_date,
    v.vihar_from,
    v.vihar_to,
    v.vihar_type,
    v.distance_km,
    coalesce(array_length(v.sevaks, 1), 0) as sevak_count
  from public.vihar_entries v
  where v.organization_id = p_organization_id
    and v.status = 'approved'
    and public.get_my_org_id() is not null
    and (v.organization_id = public.get_my_org_id()
         or public.org_brand(v.organization_id) = public.org_brand(public.get_my_org_id()))
  order by v.vihar_date desc
  limit least(greatest(p_limit, 1), 10);
$$;

-- 4. Channel: following ----------------------------------------------------
drop policy if exists channel_follows_insert_captain_only on public.channel_follows;
create policy channel_follows_insert_captain_only on public.channel_follows
  for insert to authenticated
  with check (
    public.is_org_admin()
    and follower_organization_id = public.get_my_org_id()
    and public.org_brand(followed_organization_id) = public.org_brand(follower_organization_id)
  );

-- 5. SOS notification title -------------------------------------------------
-- create_sos_alert hard-coded the title '🚨 VSeva SOS'. It now takes the brand
-- label of the caller's organisation; vSeva organisations (brand NULL) still get
-- exactly '🚨 VSeva SOS'. Nothing else in the function changes.
create or replace function public.brand_label(p_org uuid)
 returns text
 language sql
 stable
 security definer
 set search_path to 'public'
as $$
  select case public.org_brand(p_org) when 'ssg' then 'SSG' else 'VSeva' end;
$$;

revoke all on function public.brand_label(uuid) from public, anon;
grant execute on function public.brand_label(uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_sos_alert(p_note text DEFAULT NULL::text, p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric, p_location_accuracy numeric DEFAULT NULL::numeric, p_location_source text DEFAULT NULL::text, p_vihar_entry_id bigint DEFAULT NULL::bigint)
 RETURNS sos_alerts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_sevak_name text;
  v_row public.sos_alerts;
BEGIN
  v_org_id := public.get_my_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found for the current user';
  END IF;

  BEGIN
    INSERT INTO public.sos_alerts (
      org_id, triggered_by, note, latitude, longitude, location_accuracy, location_source, vihar_entry_id
    ) VALUES (
      v_org_id, auth.uid(), p_note, p_latitude, p_longitude, p_location_accuracy, p_location_source, p_vihar_entry_id
    )
    RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    -- Duplicate press / spam attempt — hand back the existing active SOS
    -- instead of erroring or sending a second notification.
    SELECT * INTO v_row FROM public.sos_alerts
      WHERE triggered_by = auth.uid() AND status = 'active'
      LIMIT 1;
    RETURN v_row;
  END;

  SELECT full_name INTO v_sevak_name FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.notifications (user_id, organization_id, type, title, message, payload)
  SELECT
    p.id,
    v_org_id,
    'sos',
    '🚨 ' || public.brand_label(v_org_id) || ' SOS',
    coalesce(v_sevak_name, 'A Sevak') || ' has triggered an SOS — immediate assistance required',
    jsonb_build_object('kind', 'sos', 'sos_id', v_row.id, 'org_id', v_org_id, 'triggered_by', auth.uid())
  FROM public.profiles p
  WHERE p.organization_id = v_org_id
    AND p.role = 'admin'
    AND p.is_active = true;

  RETURN v_row;
END;
$function$;

commit;
