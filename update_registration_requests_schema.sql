-- This script updates the existing registration_requests table to the new schema
-- It renames old columns to maintain consistency and adds new required fields.

ALTER TABLE public.registration_requests 
  RENAME COLUMN org_name TO vihar_group_name;

ALTER TABLE public.registration_requests 
  RENAME COLUMN full_name TO captain_name;

ALTER TABLE public.registration_requests 
  ADD COLUMN IF NOT EXISTS vice_captain_name text,
  ADD COLUMN IF NOT EXISTS full_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pin_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'Maharashtra',
  ADD COLUMN IF NOT EXISTS sangh_name text NOT NULL DEFAULT '';

-- Remove defaults after adding columns if you want them to be strictly required for future inserts
ALTER TABLE public.registration_requests ALTER COLUMN full_address DROP DEFAULT;
ALTER TABLE public.registration_requests ALTER COLUMN pin_code DROP DEFAULT;
ALTER TABLE public.registration_requests ALTER COLUMN sangh_name DROP DEFAULT;

-- Ensure Vihar Group Name has the correct default
ALTER TABLE public.registration_requests ALTER COLUMN vihar_group_name SET DEFAULT 'Vihar Seva Group';
