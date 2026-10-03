-- Restores the Channel functions/policy exactly as they were before
-- scripts/brand_stage1_additive.sql (captured from the live DB, 3 Oct 2026).
-- Does not drop the brand columns — do that separately if you really want to:
--   alter table public.organizations drop column brand;
--   alter table public.registration_requests drop column brand;

begin;

create or replace function public.can_read_channel(p_organization_id uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  SELECT p_organization_id = public.get_my_org_id()
    OR EXISTS (
      SELECT 1 FROM public.channel_follows
      WHERE follower_organization_id = public.get_my_org_id()
        AND followed_organization_id = p_organization_id
    );
$$;

create or replace function public.search_channel_organizations(p_query text, p_limit integer default 20)
 returns table(id uuid, name text, city text, town text)
 language sql stable security definer set search_path to 'public'
as $$
  SELECT o.id, o.name, o.city, o.town
  FROM public.organizations o
  WHERE o.id <> public.get_my_org_id()
    AND (
      p_query IS NULL OR p_query = '' OR
      o.name ILIKE '%' || p_query || '%' OR
      o.city ILIKE '%' || p_query || '%' OR
      o.town ILIKE '%' || p_query || '%'
    )
  ORDER BY o.name
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

create or replace function public.get_channel_org_profile(p_organization_id uuid)
 returns table(id uuid, name text, city text, town text, vice_captain_name text, created_at timestamp with time zone)
 language sql stable security definer set search_path to 'public'
as $$
  SELECT o.id, o.name, o.city, o.town, o.vice_captain_name, o.created_at
  FROM public.organizations o
  WHERE o.id = p_organization_id;
$$;

create or replace function public.get_channel_recent_vihars(p_organization_id uuid, p_limit integer default 5)
 returns table(vihar_date date, vihar_from text, vihar_to text, vihar_type text, distance_km numeric, sevak_count integer)
 language sql stable security definer set search_path to 'public'
as $$
  SELECT v.vihar_date, v.vihar_from, v.vihar_to, v.vihar_type, v.distance_km,
         COALESCE(array_length(v.sevaks, 1), 0) AS sevak_count
  FROM public.vihar_entries v
  WHERE v.organization_id = p_organization_id AND v.status = 'approved'
  ORDER BY v.vihar_date DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 10);
$$;

drop policy if exists channel_follows_insert_captain_only on public.channel_follows;
create policy channel_follows_insert_captain_only on public.channel_follows
  for insert to authenticated
  with check (public.is_org_admin() and follower_organization_id = public.get_my_org_id());

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
    '🚨 VSeva SOS',
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
