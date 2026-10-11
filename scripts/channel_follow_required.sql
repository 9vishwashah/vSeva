-- VChat: a group's recent Vihars and vice-captain name are only for its own members and groups that follow it
-- (same rule as its messages: public.can_read_channel). Name and city stay visible so Discover can list it.
-- Applied to the live project as migration "channel_follow_required".

CREATE OR REPLACE FUNCTION public.get_channel_recent_vihars(p_organization_id uuid, p_limit integer DEFAULT 5)
RETURNS TABLE(vihar_date date, vihar_from text, vihar_to text, vihar_type text, distance_km numeric, sevak_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select v.vihar_date, v.vihar_from, v.vihar_to, v.vihar_type, v.distance_km,
         coalesce(array_length(v.sevaks, 1), 0) as sevak_count
  from public.vihar_entries v
  where v.organization_id = p_organization_id
    and v.status = 'approved'
    and public.can_read_channel(v.organization_id)
  order by v.vihar_date desc
  limit least(greatest(p_limit, 1), 10);
$$;

CREATE OR REPLACE FUNCTION public.get_channel_org_profile(p_organization_id uuid)
RETURNS TABLE(id uuid, name text, city text, town text, vice_captain_name text, created_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  select o.id, o.name, o.city, o.town,
         case when public.can_read_channel(o.id) then o.vice_captain_name end as vice_captain_name,
         o.created_at
  from public.organizations o
  where o.id = p_organization_id
    and public.get_my_org_id() is not null
    and (o.id = public.get_my_org_id() or coalesce(o.brand, 'vseva') = public.org_brand(public.get_my_org_id()));
$$;
