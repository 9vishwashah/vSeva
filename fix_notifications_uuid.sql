-- ============================================================
-- FIX: notifications table user_id / organization_id columns
-- were BIGINT but should be UUID to match Supabase auth.uid()
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Drop the policy that depends on the user_id column
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

-- (If there are other policies like "Users can insert own notifications", drop them too)
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can manage all notifications" ON public.notifications;

-- Step 2: Alter columns from BIGINT → UUID
-- We truncate because casting from bigint to UUID directly is not strictly possible
-- and previous data had errors anyway.
TRUNCATE TABLE public.notifications;

ALTER TABLE public.notifications
  ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;

ALTER TABLE public.notifications
  ALTER COLUMN organization_id TYPE UUID USING organization_id::text::uuid;

-- Step 3: Recreate the policy
-- Assuming the standard policy for users to view their own notifications
CREATE POLICY "Users can view own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" 
  ON public.notifications 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" 
  ON public.notifications 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Step 4: Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
  AND column_name IN ('user_id', 'organization_id');
