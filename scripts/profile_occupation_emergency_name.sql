-- Family Emergency Number: whose number it is. Occupation / Profession for organisational insight.
-- Run once in the Supabase SQL editor (already applied to the live project as migration
-- "profile_occupation_emergency_name").

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS occupation_details text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_occupation_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_occupation_check CHECK (
  occupation IS NULL OR occupation IN (
    'Student', 'Business / Entrepreneur', 'Salaried / Private Job', 'Government Job', 'Professional',
    'Teacher / Professor', 'Doctor / Healthcare', 'Engineer / IT', 'CA / Finance / Accounts',
    'Lawyer / Legal', 'Homemaker', 'House Wife', 'Self-Employed', 'Other'
  )
);
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_text_len_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_text_len_check CHECK (
  char_length(coalesce(emergency_contact_name, '')) <= 80 AND char_length(coalesce(occupation_details, '')) <= 120
);

-- A Sevak edits their own profile. '' keeps the old value (existing behaviour) for the three old fields;
-- for the new fields NULL = leave unchanged and '' = clear.
DROP FUNCTION IF EXISTS public.update_own_profile(text, text, text);
CREATE OR REPLACE FUNCTION public.update_own_profile(
  p_blood_group            text DEFAULT ''::text,
  p_emergency_number       text DEFAULT ''::text,
  p_address                text DEFAULT ''::text,
  p_emergency_contact_name text DEFAULT NULL,
  p_occupation             text DEFAULT NULL,
  p_occupation_details     text DEFAULT NULL
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
    occupation_details     = CASE WHEN p_occupation_details IS NULL THEN occupation_details ELSE NULLIF(btrim(p_occupation_details), '') END
  WHERE id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_own_profile(text, text, text, text, text, text) TO anon, authenticated, service_role;

-- A Captain edits a Sevak in their group (NULL = leave unchanged).
DROP FUNCTION IF EXISTS public.update_sevak_profile_by_admin(uuid, text, integer, text, text, text, text);
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
  p_occupation_details     text DEFAULT NULL
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
    occupation_details     = CASE WHEN p_occupation_details IS NULL THEN occupation_details ELSE NULLIF(btrim(p_occupation_details), '') END
  WHERE id = p_target_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_sevak_profile_by_admin(uuid, text, integer, text, text, text, text, text, text, text) TO anon, authenticated, service_role;

-- The public emergency page (QR scan) also shows whose number the family contact is.
DROP FUNCTION IF EXISTS public.get_public_sevak_profile(text);
CREATE OR REPLACE FUNCTION public.get_public_sevak_profile(p_username text)
RETURNS TABLE(full_name text, organization_id uuid, is_active boolean, blood_group text, mobile text, emergency_number text, address text, gender text, role text, org_name text, org_city text, emergency_contact_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.full_name, p.organization_id, p.is_active, p.blood_group, p.mobile, p.emergency_number,
        p.address, p.gender::TEXT, p.role::TEXT, o.name, o.city, p.emergency_contact_name
    FROM profiles p
    LEFT JOIN organizations o ON o.id = p.organization_id
    WHERE p.username = p_username;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_sevak_profile(text) TO anon, authenticated, service_role;
