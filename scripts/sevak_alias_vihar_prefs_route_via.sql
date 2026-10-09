-- 1. Sevak "Alias": an optional reference name the Captain sets when creating / editing a Sevak.
-- 2. (Shraman Seva Group) Sevak "Vihar Type" (Internal / External / Both) and Seva preferences
--    (multi-select: Walking, Car Seva, Wheelchair Seva), filled in on the Sevak's profile.
-- 3. Routes: optional "via" place and a Google Maps link per route. A route is now unique per
--    (group, from, to, via), so "A -> B" and "A -> B via C" can both exist.
-- Additive only. Run once in the Supabase SQL editor (applied to the live project as migration
-- "sevak_alias_vihar_prefs_route_via").

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS alias text,
  ADD COLUMN IF NOT EXISTS vihar_scope text,
  ADD COLUMN IF NOT EXISTS seva_preferences text[];

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_alias_len_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_alias_len_check CHECK (char_length(coalesce(alias, '')) <= 60);
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_vihar_scope_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_vihar_scope_check CHECK (vihar_scope IS NULL OR vihar_scope IN ('Internal', 'External', 'Both'));
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_seva_preferences_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_seva_preferences_check CHECK (
  seva_preferences IS NULL OR seva_preferences <@ ARRAY['Walking', 'Car Seva', 'Wheelchair Seva']::text[]
);

-- A Sevak edits their own profile. Same rules as before ('' keeps the old value for the three oldest
-- fields; NULL = leave unchanged, '' = clear for the newer ones). For seva_preferences an empty array clears.
DROP FUNCTION IF EXISTS public.update_own_profile(text, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.update_own_profile(
  p_blood_group            text DEFAULT ''::text,
  p_emergency_number       text DEFAULT ''::text,
  p_address                text DEFAULT ''::text,
  p_emergency_contact_name text DEFAULT NULL,
  p_occupation             text DEFAULT NULL,
  p_occupation_details     text DEFAULT NULL,
  p_vihar_scope            text DEFAULT NULL,
  p_seva_preferences       text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles
  SET
    blood_group      = CASE WHEN p_blood_group <> ''      THEN p_blood_group      ELSE blood_group      END,
    emergency_number = CASE WHEN p_emergency_number <> '' THEN p_emergency_number ELSE emergency_number END,
    address          = CASE WHEN p_address <> ''          THEN p_address          ELSE address          END,
    emergency_contact_name = CASE WHEN p_emergency_contact_name IS NULL THEN emergency_contact_name ELSE NULLIF(btrim(p_emergency_contact_name), '') END,
    occupation             = CASE WHEN p_occupation IS NULL THEN occupation ELSE NULLIF(btrim(p_occupation), '') END,
    occupation_details     = CASE WHEN p_occupation_details IS NULL THEN occupation_details ELSE NULLIF(btrim(p_occupation_details), '') END,
    vihar_scope            = CASE WHEN p_vihar_scope IS NULL THEN vihar_scope ELSE NULLIF(btrim(p_vihar_scope), '') END,
    seva_preferences       = CASE WHEN p_seva_preferences IS NULL THEN seva_preferences
                                  WHEN cardinality(p_seva_preferences) = 0 THEN NULL
                                  ELSE p_seva_preferences END
  WHERE id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_own_profile(text, text, text, text, text, text, text, text[]) TO anon, authenticated, service_role;

-- A Captain edits a Sevak in their group (NULL = leave unchanged; '' / empty array = clear).
DROP FUNCTION IF EXISTS public.update_sevak_profile_by_admin(uuid, text, integer, text, text, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.update_sevak_profile_by_admin(
  p_target_user_id         uuid,
  p_mobile                 text,
  p_age                    integer,
  p_blood_group            text,
  p_emergency_number       text,
  p_address                text,
  p_gender                 text,
  p_emergency_contact_name text DEFAULT NULL,
  p_occupation             text DEFAULT NULL,
  p_occupation_details     text DEFAULT NULL,
  p_alias                  text DEFAULT NULL,
  p_vihar_scope            text DEFAULT NULL,
  p_seva_preferences       text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_caller_org   uuid;
  v_target_org   uuid;
BEGIN
  SELECT organization_id INTO v_caller_org
  FROM public.profiles
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin');

  IF v_caller_org IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can update sevak profiles.';
  END IF;

  SELECT organization_id INTO v_target_org
  FROM public.profiles
  WHERE id = p_target_user_id;

  IF v_target_org IS NULL OR (v_target_org <> v_caller_org) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Target user not in your organization.';
    END IF;
  END IF;

  UPDATE public.profiles SET
    mobile           = COALESCE(p_mobile,           mobile),
    age              = COALESCE(p_age,               age),
    blood_group      = COALESCE(p_blood_group,       blood_group),
    emergency_number = COALESCE(p_emergency_number,  emergency_number),
    address          = COALESCE(p_address,            address),
    gender           = COALESCE(p_gender,             gender),
    emergency_contact_name = CASE WHEN p_emergency_contact_name IS NULL THEN emergency_contact_name ELSE NULLIF(btrim(p_emergency_contact_name), '') END,
    occupation             = CASE WHEN p_occupation IS NULL THEN occupation ELSE NULLIF(btrim(p_occupation), '') END,
    occupation_details     = CASE WHEN p_occupation_details IS NULL THEN occupation_details ELSE NULLIF(btrim(p_occupation_details), '') END,
    alias                  = CASE WHEN p_alias IS NULL THEN alias ELSE NULLIF(btrim(p_alias), '') END,
    vihar_scope            = CASE WHEN p_vihar_scope IS NULL THEN vihar_scope ELSE NULLIF(btrim(p_vihar_scope), '') END,
    seva_preferences       = CASE WHEN p_seva_preferences IS NULL THEN seva_preferences
                                  WHEN cardinality(p_seva_preferences) = 0 THEN NULL
                                  ELSE p_seva_preferences END
  WHERE id = p_target_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_sevak_profile_by_admin(uuid, text, integer, text, text, text, text, text, text, text, text, text, text[]) TO anon, authenticated, service_role;

-- Routes: via + Google Maps link
ALTER TABLE public.area_routes
  ADD COLUMN IF NOT EXISTS via text,
  ADD COLUMN IF NOT EXISTS maps_url text;

ALTER TABLE public.area_routes DROP CONSTRAINT IF EXISTS area_routes_maps_url_check;
ALTER TABLE public.area_routes ADD CONSTRAINT area_routes_maps_url_check CHECK (
  maps_url IS NULL OR (maps_url ~* '^https://' AND char_length(maps_url) <= 1000)
);
ALTER TABLE public.area_routes DROP CONSTRAINT IF EXISTS area_routes_via_len_check;
ALTER TABLE public.area_routes ADD CONSTRAINT area_routes_via_len_check CHECK (char_length(coalesce(via, '')) <= 200);

ALTER TABLE public.area_routes DROP CONSTRAINT IF EXISTS area_routes_org_from_to_unique;
CREATE UNIQUE INDEX IF NOT EXISTS area_routes_org_from_to_via_unique
  ON public.area_routes (organization_id, from_name, to_name, (coalesce(via, '')));
