-- FIX FOR 42P17: Infinite Recursion in Profiles Policy

-- 1. Create a secure function to check if the current user is an admin.
-- 'SECURITY DEFINER' allows this function to bypass RLS when querying the profiles table.
CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- 2. Create a secure function to get the current user's organization ID.
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- 3. Drop the broken policy
DROP POLICY IF EXISTS "Profiles: self or admin" ON public.profiles;

-- 4. Create the corrected non-recursive policy
CREATE POLICY "Profiles: self or admin"
ON public.profiles
FOR SELECT
USING (
  -- User can see their own profile
  id = auth.uid()
  OR
  -- Admin can see profiles in their organization
  (
    public.is_org_admin() 
    AND 
    organization_id = public.get_my_org_id()
  )
);

-- 5. Update Vihar Sevaks Policy (just in case)
DROP POLICY IF EXISTS "Vihar Sevaks: self or admin" ON public.vihar_sevaks;

CREATE POLICY "Vihar Sevaks: self or admin"
ON public.vihar_sevaks
FOR SELECT
USING (
  sevak_id = auth.uid()
  OR
  (
    public.is_org_admin() 
    AND 
    organization_id = public.get_my_org_id()
  )
);
