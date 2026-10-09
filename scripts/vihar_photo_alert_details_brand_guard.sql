-- 1. Vihar entry photo (optional; offered on Shraman Seva Group's entry forms): vihar_entries.photo_url + a
--    "vihar-photos" storage bucket. Files live under <organization_id>/..., and only members of that group can
--    upload there. The bucket is public-read like "avatars" (paths are random, never listed).
-- 2. Alert Vihar details: Samuday, Sadhu / Sadhvi names, wheelchair (+ how many), car seva, emergency contact,
--    police security. create_upcoming_alert takes them as optional arguments (older app versions keep working).
-- 3. Brand isolation: a channel post only notifies following groups of the SAME brand (vSeva <-> SSG never mix).
-- Run once in the Supabase SQL editor (applied to the live project as migration
-- "vihar_photo_alert_details_brand_guard").

-- 1 ------------------------------------------------------------------------------------------------------------
ALTER TABLE public.vihar_entries ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.vihar_entries DROP CONSTRAINT IF EXISTS vihar_entries_photo_url_check;
ALTER TABLE public.vihar_entries ADD CONSTRAINT vihar_entries_photo_url_check
  CHECK (photo_url IS NULL OR (photo_url ~* '^https://' AND char_length(photo_url) <= 1000));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('vihar-photos', 'vihar-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS vihar_photos_public_read ON storage.objects;
CREATE POLICY vihar_photos_public_read ON storage.objects FOR SELECT
  USING (bucket_id = 'vihar-photos');
DROP POLICY IF EXISTS vihar_photos_group_upload ON storage.objects;
CREATE POLICY vihar_photos_group_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vihar-photos' AND (storage.foldername(name))[1] = public.get_my_org_id()::text);
DROP POLICY IF EXISTS vihar_photos_owner_delete ON storage.objects;
CREATE POLICY vihar_photos_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vihar-photos' AND owner = auth.uid());

-- 2 ------------------------------------------------------------------------------------------------------------
ALTER TABLE public.upcoming_vihars
  ADD COLUMN IF NOT EXISTS samuday text,
  ADD COLUMN IF NOT EXISTS sadhu_sadhvi_names text,
  ADD COLUMN IF NOT EXISTS wheelchair_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wheelchair_count integer,
  ADD COLUMN IF NOT EXISTS car_seva_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS police_security boolean NOT NULL DEFAULT false;

ALTER TABLE public.upcoming_vihars DROP CONSTRAINT IF EXISTS upcoming_vihars_details_check;
ALTER TABLE public.upcoming_vihars ADD CONSTRAINT upcoming_vihars_details_check CHECK (
  char_length(coalesce(samuday, '')) <= 120
  AND char_length(coalesce(sadhu_sadhvi_names, '')) <= 500
  AND char_length(coalesce(emergency_contact_name, '')) <= 80
  AND (emergency_contact_phone IS NULL OR emergency_contact_phone ~ '^[0-9]{10}$')
  AND (wheelchair_count IS NULL OR wheelchair_count BETWEEN 1 AND 50)
);

DROP FUNCTION IF EXISTS public.create_upcoming_alert(text, text, text, text, text, integer, integer);
CREATE OR REPLACE FUNCTION public.create_upcoming_alert(
  vihar_date_input text,
  vihar_time_input text,
  from_loc text,
  to_loc text,
  v_type text,
  s_count integer,
  sv_count integer,
  p_samuday text DEFAULT NULL,
  p_sadhu_sadhvi_names text DEFAULT NULL,
  p_wheelchair_required boolean DEFAULT false,
  p_wheelchair_count integer DEFAULT NULL,
  p_car_seva_required boolean DEFAULT false,
  p_emergency_contact_name text DEFAULT NULL,
  p_emergency_contact_phone text DEFAULT NULL,
  p_police_security boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_new_vihar_id UUID;
  v_message TEXT;
  v_extras TEXT[] := ARRAY[]::text[];
  v_date DATE;
  v_time TIME;
  v_phone TEXT;
BEGIN
  v_date := vihar_date_input::DATE;
  v_time := vihar_time_input::TIME;
  v_user_id := auth.uid();

  SELECT organization_id INTO v_org_id FROM public.profiles WHERE id = v_user_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found for the current user';
  END IF;

  v_phone := nullif(right(regexp_replace(coalesce(p_emergency_contact_phone, ''), '\D', '', 'g'), 10), '');

  INSERT INTO public.upcoming_vihars (
    organization_id, created_by, vihar_date, vihar_time, from_location, to_location, vihar_type, sadhu_count, sadhvi_count,
    samuday, sadhu_sadhvi_names, wheelchair_required, wheelchair_count, car_seva_required,
    emergency_contact_name, emergency_contact_phone, police_security
  ) VALUES (
    v_org_id, v_user_id, v_date, v_time, from_loc, to_loc, v_type, s_count, sv_count,
    nullif(btrim(p_samuday), ''), nullif(btrim(p_sadhu_sadhvi_names), ''),
    coalesce(p_wheelchair_required, false),
    CASE WHEN coalesce(p_wheelchair_required, false) THEN greatest(coalesce(p_wheelchair_count, 1), 1) END,
    coalesce(p_car_seva_required, false),
    nullif(btrim(p_emergency_contact_name), ''), v_phone,
    coalesce(p_police_security, false)
  )
  RETURNING id INTO v_new_vihar_id;

  -- e.g. "Upcoming Vihar on 12 Mar 2026 at 06:00 AM from A to B. Wheelchair x2, Car Seva"
  v_message := 'Upcoming Vihar on ' || to_char(v_date, 'DD Mon YYYY') || ' at ' || to_char(v_time, 'HH:MI AM') || ' from ' || from_loc || ' to ' || to_loc;
  IF coalesce(p_wheelchair_required, false) THEN
    v_extras := v_extras || ('Wheelchair x' || greatest(coalesce(p_wheelchair_count, 1), 1));
  END IF;
  IF coalesce(p_car_seva_required, false) THEN v_extras := v_extras || 'Car Seva'::text; END IF;
  IF coalesce(p_police_security, false) THEN v_extras := v_extras || 'Police security'::text; END IF;
  IF cardinality(v_extras) > 0 THEN
    v_message := v_message || '. ' || array_to_string(v_extras, ', ');
  END IF;

  INSERT INTO public.notifications (user_id, organization_id, type, title, message, payload)
  SELECT p.id, v_org_id, 'alert_upcoming', '📢 New Upcoming Vihar Alert!', v_message,
    jsonb_build_object(
      'vihar_id', v_new_vihar_id, 'from', from_loc, 'to', to_loc, 'date', v_date, 'time', v_time, 'type', v_type,
      'sadhu_count', s_count, 'sadhvi_count', sv_count
    )
  FROM public.profiles p
  WHERE p.organization_id = v_org_id AND p.is_active = true;

  RETURN json_build_object('success', true, 'vihar_id', v_new_vihar_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_upcoming_alert(text, text, text, text, text, integer, integer, text, text, boolean, integer, boolean, text, text, boolean) TO authenticated, service_role;

-- 3 ------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_channel_followers_new_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_name text;
  v_first_name text;
  v_body text;
BEGIN
  SELECT name INTO v_org_name FROM public.organizations WHERE id = NEW.organization_id;

  SELECT nullif(split_part(btrim(coalesce(full_name, '')), ' ', 1), '')
    INTO v_first_name
    FROM public.profiles WHERE id = NEW.author_user_id;

  v_body := coalesce(v_first_name, 'Someone') || ': ' || left(NEW.message, 200);

  -- Own-org members (excluding the poster): the "My Vihar Group Chat" case.
  INSERT INTO public.notifications (user_id, organization_id, type, title, message, payload)
  SELECT
    p.id,
    NEW.organization_id,
    'channel_message',
    coalesce(v_org_name, 'Your organization') || ' Channel',
    v_body,
    jsonb_build_object('kind', 'channel_post', 'organization_id', NEW.organization_id, 'post_id', NEW.id)
  FROM public.profiles p
  WHERE p.organization_id = NEW.organization_id
    AND p.id != NEW.author_user_id
    AND p.is_active = true;

  -- Following-org members: the cross-org follower case, only within the same brand.
  INSERT INTO public.notifications (user_id, organization_id, type, title, message, payload)
  SELECT
    p.id,
    p.organization_id,
    'channel_message',
    coalesce(v_org_name, 'A followed organization') || ' posted an update',
    v_body,
    jsonb_build_object('kind', 'channel_post', 'organization_id', NEW.organization_id, 'post_id', NEW.id)
  FROM public.channel_follows cf
  JOIN public.profiles p ON p.organization_id = cf.follower_organization_id
  WHERE cf.followed_organization_id = NEW.organization_id
    AND public.org_brand(cf.follower_organization_id) = public.org_brand(NEW.organization_id)
    AND p.is_active = true;

  RETURN NEW;
END;
$$;
