-- =============================================================================
-- vSeva: Sevak Self-Profile Update RPC
-- Run this in the Supabase SQL Editor
-- =============================================================================

-- Allows a logged-in sevak to update ONLY their own blood_group,
-- emergency_number, and address. Uses SECURITY DEFINER so RLS is bypassed
-- safely — the function itself enforces auth.uid() = the current user's row.

CREATE OR REPLACE FUNCTION update_own_profile(
  p_blood_group       TEXT DEFAULT '',
  p_emergency_number  TEXT DEFAULT '',
  p_address           TEXT DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET
    blood_group      = CASE WHEN p_blood_group <> ''      THEN p_blood_group      ELSE blood_group      END,
    emergency_number = CASE WHEN p_emergency_number <> '' THEN p_emergency_number ELSE emergency_number END,
    address          = CASE WHEN p_address <> ''          THEN p_address          ELSE address          END
  WHERE id = auth.uid();
END;
$$;

-- Grant execute permission to authenticated (logged-in) users
GRANT EXECUTE ON FUNCTION update_own_profile TO authenticated;

-- =============================================================================
-- Verification: After running, a sevak should be able to call:
--   SELECT update_own_profile('O+', '9876543210', 'Ahmedabad, Gujarat');
-- and see their profile updated in the profiles table.
-- =============================================================================
