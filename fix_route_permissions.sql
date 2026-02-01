-- 1. Enable RLS on area_routes (if not already enabled)
ALTER TABLE public.area_routes ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing update policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Enable update for Org Admins" ON public.area_routes;

-- 3. Create Update Policy for Org Admins
-- This allows a user to update a route ONLY if:
-- a) They are authenticated
-- b) They are an 'admin' in the 'profiles' table
-- c) Their profile's organization_id matches the route's organization_id
CREATE POLICY "Enable update for Org Admins" ON public.area_routes
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. Ensure Select Policy exists (just in case)
DROP POLICY IF EXISTS "Enable read access for all users in same org" ON public.area_routes;
CREATE POLICY "Enable read access for all users in same org" ON public.area_routes
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- 5. Ensure Insert Policy (just in case)
DROP POLICY IF EXISTS "Enable insert for Org Admins" ON public.area_routes;
CREATE POLICY "Enable insert for Org Admins" ON public.area_routes
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 6. Ensure Delete Policy (just in case)
DROP POLICY IF EXISTS "Enable delete for Org Admins" ON public.area_routes;
CREATE POLICY "Enable delete for Org Admins" ON public.area_routes
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
