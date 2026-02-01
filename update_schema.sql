-- Run this in your Supabase SQL Editor to support the new approval flow
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS password text;
