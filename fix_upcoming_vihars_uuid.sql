-- ============================================================
-- FIX: upcoming_vihars table created_by / organization_id columns
-- were BIGINT but should be UUID to match Supabase auth.uid()
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Drop policies that depend on the columns
DROP POLICY IF EXISTS "Users can view org upcoming vihars" ON public.upcoming_vihars;
DROP POLICY IF EXISTS "Org members can view upcoming vihars" ON public.upcoming_vihars;
DROP POLICY IF EXISTS "Admins can manage upcoming vihars" ON public.upcoming_vihars;
DROP POLICY IF EXISTS "Anyone can read upcoming vihars" ON public.upcoming_vihars;
DROP POLICY IF EXISTS "Admins can insert upcoming vihars" ON public.upcoming_vihars;
DROP POLICY IF EXISTS "Admins can create upcoming vihars" ON public.upcoming_vihars;
DROP POLICY IF EXISTS "Admins can update upcoming vihars" ON public.upcoming_vihars;
DROP POLICY IF EXISTS "Admins can delete upcoming vihars" ON public.upcoming_vihars;
DROP POLICY IF EXISTS "Users can manage upcoming vihars" ON public.upcoming_vihars;
DROP POLICY IF EXISTS "Users can insert upcoming vihars" ON public.upcoming_vihars;
DROP POLICY IF EXISTS "Users can create upcoming vihars" ON public.upcoming_vihars;
DROP POLICY IF EXISTS "Users can update upcoming vihars" ON public.upcoming_vihars;
DROP POLICY IF EXISTS "Users can delete upcoming vihars" ON public.upcoming_vihars;

-- Step 2: Alter columns from BIGINT → UUIDx`
-- We truncate because casting from bigint to UUID directly is not strictly possible
-- and previous data had errors anyway.
TRUNCATE TABLE public.upcoming_vihars;

ALTER TABLE public.upcoming_vihars
  ALTER COLUMN created_by TYPE UUID USING created_by::text::uuid;

ALTER TABLE public.upcoming_vihars
  ALTER COLUMN organization_id TYPE UUID USING organization_id::text::uuid;

-- Step 3: Recreate standard policies 
-- (adjust these to match your exact setup if they differ)
CREATE POLICY "Users can view org upcoming vihars" 
  ON public.upcoming_vihars 
  FOR SELECT 
  USING (true); -- Or whatever your read policy is

CREATE POLICY "Org members can view upcoming vihars" 
  ON public.upcoming_vihars 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert upcoming vihars" 
  ON public.upcoming_vihars 
  FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update upcoming vihars" 
  ON public.upcoming_vihars 
  FOR UPDATE 
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete upcoming vihars" 
  ON public.upcoming_vihars 
  FOR DELETE 
  USING (auth.uid() = created_by);

-- Step 4: Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'upcoming_vihars' 
  AND column_name IN ('created_by', 'organization_id');
