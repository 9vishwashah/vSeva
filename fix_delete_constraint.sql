-- The issue is that 'organizations' table references 'auth.users' via 'created_by' 
-- but does not have ON DELETE CASCADE. So when you try to delete a user, 
-- Postgres blocks it to preserve the organization data.

-- This script drops the existing constraint and re-adds it with ON DELETE CASCADE.
-- WARNING: This means if the User who created the Org is deleted, the ENTIRE Organization 
-- and all its data (profiles, etc.) will be deleted. This is good for testing cleanup.

ALTER TABLE public.organizations
DROP CONSTRAINT IF EXISTS organizations_created_by_fkey;

ALTER TABLE public.organizations
ADD CONSTRAINT organizations_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES auth.users (id)
ON DELETE CASCADE;
