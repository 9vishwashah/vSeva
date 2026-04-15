-- Drop old version (if it exists with fewer params)
DROP FUNCTION IF EXISTS public.update_sevak_profile_by_admin(uuid, text, integer, text, text, text, text);
DROP FUNCTION IF EXISTS public.update_sevak_profile_by_admin(uuid, text, integer, text, text);
DROP FUNCTION IF EXISTS public.update_sevak_profile_by_admin;

-- Recreate with all required parameters
CREATE OR REPLACE FUNCTION public.update_sevak_profile_by_admin(
  p_target_user_id   uuid,
  p_mobile           text,
  p_age              integer,
  p_blood_group      text,
  p_emergency_number text,
  p_address          text,
  p_gender           text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_org   uuid;
  v_target_org   uuid;
BEGIN
  -- Verify the caller is an admin
  SELECT organization_id INTO v_caller_org
  FROM public.profiles
  WHERE id = auth.uid() AND role IN ('admin', 'super_admin');

  IF v_caller_org IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can update sevak profiles.';
  END IF;

  -- Verify the target user belongs to the same org
  SELECT organization_id INTO v_target_org
  FROM public.profiles
  WHERE id = p_target_user_id;

  IF v_target_org IS NULL OR (v_target_org <> v_caller_org) THEN
    -- Allow super_admin to update anyone
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Target user not in your organization.';
    END IF;
  END IF;

  -- Perform the update (only update non-null fields)
  UPDATE public.profiles SET
    mobile           = COALESCE(p_mobile,           mobile),
    age              = COALESCE(p_age,               age),
    blood_group      = COALESCE(p_blood_group,       blood_group),
    emergency_number = COALESCE(p_emergency_number,  emergency_number),
    address          = COALESCE(p_address,            address),
    gender           = COALESCE(p_gender,             gender)
  WHERE id = p_target_user_id;
END;
$$;

-- Grant execution to authenticated users (admins only enforced inside function via SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.update_sevak_profile_by_admin(uuid, text, integer, text, text, text, text) TO authenticated;
