-- Run once in the Supabase SQL editor.
-- Adds a Vice Captain name field on organizations, edited from Profile &
-- Settings by the org's Captain (ORG_ADMIN). Captain name itself is just
-- profiles.full_name for that admin — no new column needed for it.

alter table public.organizations add column if not exists vice_captain_name text;
