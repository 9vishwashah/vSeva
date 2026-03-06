-- ============================================================
-- Migration: Add last_login_at column to profiles table
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Add the column (safe — skips if already exists)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add RLS UPDATE policy if it doesn't already exist
-- (Allows each user to write their own last_login_at on login)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can update their own last_login_at'
  ) THEN
    EXECUTE '
      CREATE POLICY "Users can update their own last_login_at"
      ON public.profiles
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id)
    ';
  END IF;
END
$$;

-- ============================================================
-- Done! The column will be populated next time a sevak logs in.
-- Existing sevaks who haven't logged in yet will show "Never".
-- ============================================================
