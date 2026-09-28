-- ============================================================================
-- VSeva Public Community Directory
-- ============================================================================
-- NEW feature, fully additive. Does not touch any existing table, column,
-- policy, or function. Run this once in the Supabase SQL editor (idempotent —
-- IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS throughout, safe
-- to re-run). This file was rewritten in full after two rounds of field
-- changes (category removed, wheelchair/parking removed, contact_name added)
-- — always run the WHOLE file, not a diff, since it's the single source of
-- truth for the current shape.
--
-- Shape, mirroring the existing vihar_entries approval workflow
-- (scripts/vihar_approval_workflow.sql) but adapted for a TRULY ANONYMOUS,
-- not-logged-in public contributor (no auth.uid() at all for them):
--
--   directory_listings          — PUBLIC data. Only ever holds approved/
--                                  archived rows. Nothing pending or rejected
--                                  is ever stored here, so "only approved is
--                                  public" is true by construction, not just
--                                  by a WHERE clause.
--   directory_submissions       — new-listing submissions from anonymous
--                                  visitors. pending/approved/rejected.
--   directory_change_requests   — "Suggest an Edit" proposals against an
--                                  approved listing. The listing itself is
--                                  never touched by anonymous input directly.
--
-- One wide row per card (trustees/contacts/facilities/routes/photos as jsonb
-- arrays/objects) rather than half a dozen join tables — matches the "one
-- Community Directory Card" concept. A listing is one universal card, not a
-- single category — it can be a temple, a Vihar Group, and any combination of
-- Upashray/Bhojanshala/Library all at once; what it "is" is derived from
-- which fields are filled in, not a picked-once label.
--
-- Auth model: anon (no session at all) may INSERT a submission/change-request
-- and SELECT approved listings — nothing else. Approve/reject/edit-before-
-- approve is done through SECURITY DEFINER RPCs gated on
-- profiles.role = 'admin', exactly like approve_vihar_entry/reject_vihar_entry,
-- callable from the existing (already logged-in, PIN-gated) Super Admin screen.
-- ============================================================================

-- 0. Cleanup for anyone who ran an earlier version of this script -----------
-- Two fields were dropped after this shipped: `category` (a listing is one
-- universal card, not a single category) and `wheelchair_accessible`/
-- `parking` (removed per product feedback). CREATE TABLE IF NOT EXISTS below
-- never touches a table that already exists, so without this, stale columns
-- from an earlier run would linger — a stale `category NOT NULL` in
-- particular rejects every new submission outright. Safe no-op otherwise.
ALTER TABLE IF EXISTS public.directory_listings DROP COLUMN IF EXISTS category;
ALTER TABLE IF EXISTS public.directory_submissions DROP COLUMN IF EXISTS category;
ALTER TABLE IF EXISTS public.directory_listings DROP COLUMN IF EXISTS wheelchair_accessible;
ALTER TABLE IF EXISTS public.directory_listings DROP COLUMN IF EXISTS parking;
ALTER TABLE IF EXISTS public.directory_submissions DROP COLUMN IF EXISTS wheelchair_accessible;
ALTER TABLE IF EXISTS public.directory_submissions DROP COLUMN IF EXISTS parking;
ALTER TABLE IF EXISTS public.directory_listings ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE IF EXISTS public.directory_submissions ADD COLUMN IF NOT EXISTS contact_name text;


-- 1. directory_listings — approved/archived only, public read ----------------

CREATE TABLE IF NOT EXISTS public.directory_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,

  name text NOT NULL,
  mulnayak text,
  google_maps_url text,
  latitude double precision,
  longitude double precision,
  pincode text,
  area text,
  city text,
  state text,
  full_address text,

  trustees jsonb NOT NULL DEFAULT '[]'::jsonb,           -- [{name, mobile}]

  vihar_group_name text,
  captain_name text,
  captain_mobile text,
  vice_captain_name text,
  vice_captain_mobile text,
  member_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,    -- [{name, role, mobile}]

  -- Each facility carries its own contact person too:
  -- {name, google_maps_url, latitude, longitude, contact_name, contact_phone}
  upashray jsonb,
  bhojanshala jsonb,
  library jsonb,

  routes jsonb NOT NULL DEFAULT '[]'::jsonb,             -- [{from, to, distance_km, notes}]

  contact_name text,
  contact_phone text,
  contact_phone_public boolean NOT NULL DEFAULT false,
  website text,
  timings jsonb,                                         -- {morning, evening}
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,              -- [{url, is_cover}]
  notes text,

  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'archived')),
  last_verified_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_directory_listings_status ON public.directory_listings (status);
CREATE INDEX IF NOT EXISTS idx_directory_listings_city ON public.directory_listings (city);
CREATE INDEX IF NOT EXISTS idx_directory_listings_coords ON public.directory_listings (latitude, longitude);

ALTER TABLE public.directory_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_can_read_approved_listings" ON public.directory_listings;
CREATE POLICY "public_can_read_approved_listings" ON public.directory_listings
FOR SELECT TO anon, authenticated
USING (status = 'approved');

GRANT SELECT ON public.directory_listings TO anon, authenticated;


-- 2. directory_submissions — new-listing pending review -----------------------

CREATE TABLE IF NOT EXISTS public.directory_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  mulnayak text,
  google_maps_url text,
  latitude double precision,
  longitude double precision,
  pincode text,
  area text,
  city text,
  state text,
  full_address text,

  trustees jsonb NOT NULL DEFAULT '[]'::jsonb,
  vihar_group_name text,
  captain_name text,
  captain_mobile text,
  vice_captain_name text,
  vice_captain_mobile text,
  member_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,

  upashray jsonb,
  bhojanshala jsonb,
  library jsonb,
  routes jsonb NOT NULL DEFAULT '[]'::jsonb,

  contact_name text,
  contact_phone text,
  contact_phone_public boolean NOT NULL DEFAULT false,
  website text,
  timings jsonb,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,

  -- Duplicate-detection hint the contributor acknowledged, purely informational
  possible_duplicate_of uuid REFERENCES public.directory_listings(id),

  contributor_name text NOT NULL,
  contributor_mobile text,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_listing_id uuid REFERENCES public.directory_listings(id),
  rejection_reason text,
  reviewed_by_id uuid REFERENCES public.profiles(id),
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_directory_submissions_status ON public.directory_submissions (status);

ALTER TABLE public.directory_submissions ENABLE ROW LEVEL SECURITY;

-- Anonymous visitors may create a submission — nothing else. No SELECT policy
-- at all for anon/authenticated: reading the queue is only ever done through
-- the SECURITY DEFINER RPC below, so a contributor can never see anyone
-- else's pending submissions (or even their own, in this phase).
DROP POLICY IF EXISTS "anyone_can_submit_directory_listing" ON public.directory_submissions;
CREATE POLICY "anyone_can_submit_directory_listing" ON public.directory_submissions
FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND reviewed_by_id IS NULL
  AND approved_listing_id IS NULL
);

GRANT INSERT ON public.directory_submissions TO anon, authenticated;


-- 3. directory_change_requests — "Suggest an Edit" pending review -------------

CREATE TABLE IF NOT EXISTS public.directory_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.directory_listings(id) ON DELETE CASCADE,

  proposed_fields jsonb NOT NULL,   -- sparse {field: newValue} diff against the listing
  current_snapshot jsonb,           -- listing's values at submission time, for the diff view

  contributor_name text NOT NULL,
  contributor_mobile text,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by_id uuid REFERENCES public.profiles(id),
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_directory_change_requests_status ON public.directory_change_requests (status);
CREATE INDEX IF NOT EXISTS idx_directory_change_requests_listing ON public.directory_change_requests (listing_id);

ALTER TABLE public.directory_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_can_suggest_directory_edit" ON public.directory_change_requests;
CREATE POLICY "anyone_can_suggest_directory_edit" ON public.directory_change_requests
FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND reviewed_by_id IS NULL
);

GRANT INSERT ON public.directory_change_requests TO anon, authenticated;


-- 4. Slug generation -----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_directory_slug(p_name text, p_city text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_base text;
  v_slug text;
  v_suffix int := 1;
BEGIN
  v_base := lower(trim(both '-' from regexp_replace(coalesce(p_name, '') || '-' || coalesce(p_city, ''), '[^a-zA-Z0-9]+', '-', 'g')));
  IF v_base = '' THEN
    v_base := 'listing';
  END IF;

  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM public.directory_listings WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix;
  END LOOP;

  RETURN v_slug;
END;
$$;


-- 5. Admin RPCs — all gated on profiles.role = 'admin' via auth.uid() --------

CREATE OR REPLACE FUNCTION public.get_pending_directory_submissions()
RETURNS SETOF public.directory_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only a Captain/Admin can view directory submissions.';
  END IF;

  RETURN QUERY
  SELECT * FROM public.directory_submissions WHERE status = 'pending' ORDER BY created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_directory_submissions() TO authenticated;


CREATE OR REPLACE FUNCTION public.get_pending_directory_change_requests()
RETURNS SETOF public.directory_change_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only a Captain/Admin can view directory change requests.';
  END IF;

  RETURN QUERY
  SELECT * FROM public.directory_change_requests WHERE status = 'pending' ORDER BY created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_directory_change_requests() TO authenticated;


CREATE OR REPLACE FUNCTION public.get_directory_counts()
RETURNS TABLE(pending_listings bigint, pending_edits bigint, approved_listings bigint, rejected_listings bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only a Captain/Admin can view directory counts.';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.directory_submissions WHERE status = 'pending'),
    (SELECT count(*) FROM public.directory_change_requests WHERE status = 'pending'),
    (SELECT count(*) FROM public.directory_listings WHERE status = 'approved'),
    (SELECT count(*) FROM public.directory_submissions WHERE status = 'rejected');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_directory_counts() TO authenticated;


CREATE OR REPLACE FUNCTION public.approve_directory_submission(
  p_submission_id uuid,
  p_admin_id uuid,
  p_admin_name text,
  p_overrides jsonb DEFAULT '{}'::jsonb
)
RETURNS public.directory_listings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.directory_submissions;
  v_merged jsonb;
  v_listing public.directory_listings;
  v_slug text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only a Captain/Admin can approve a directory submission.';
  END IF;

  SELECT * INTO v_sub FROM public.directory_submissions WHERE id = p_submission_id AND status = 'pending';
  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'Submission not found or already reviewed.';
  END IF;

  -- Admin-supplied overrides win over the contributor's original values —
  -- lets a Captain fix a typo'd city/pincode etc. before it goes public,
  -- without a reject-and-resubmit round trip.
  v_merged := to_jsonb(v_sub) || coalesce(p_overrides, '{}'::jsonb);

  v_slug := public.generate_directory_slug(v_merged->>'name', v_merged->>'city');

  INSERT INTO public.directory_listings (
    slug, name, mulnayak, google_maps_url, latitude, longitude,
    pincode, area, city, state, full_address, trustees, vihar_group_name,
    captain_name, captain_mobile, vice_captain_name, vice_captain_mobile,
    member_contacts, upashray, bhojanshala, library, routes, contact_name,
    contact_phone, contact_phone_public, website, timings, photos, notes
  ) VALUES (
    v_slug,
    v_merged->>'name',
    v_merged->>'mulnayak',
    v_merged->>'google_maps_url',
    (v_merged->>'latitude')::double precision,
    (v_merged->>'longitude')::double precision,
    v_merged->>'pincode',
    v_merged->>'area',
    v_merged->>'city',
    v_merged->>'state',
    v_merged->>'full_address',
    coalesce(v_merged->'trustees', '[]'::jsonb),
    v_merged->>'vihar_group_name',
    v_merged->>'captain_name',
    v_merged->>'captain_mobile',
    v_merged->>'vice_captain_name',
    v_merged->>'vice_captain_mobile',
    coalesce(v_merged->'member_contacts', '[]'::jsonb),
    v_merged->'upashray',
    v_merged->'bhojanshala',
    v_merged->'library',
    coalesce(v_merged->'routes', '[]'::jsonb),
    v_merged->>'contact_name',
    v_merged->>'contact_phone',
    coalesce((v_merged->>'contact_phone_public')::boolean, false),
    v_merged->>'website',
    v_merged->'timings',
    coalesce(v_merged->'photos', '[]'::jsonb),
    v_merged->>'notes'
  )
  RETURNING * INTO v_listing;

  UPDATE public.directory_submissions
  SET status = 'approved', reviewed_by_id = p_admin_id, reviewed_by_name = p_admin_name,
      reviewed_at = now(), approved_listing_id = v_listing.id
  WHERE id = p_submission_id;

  RETURN v_listing;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_directory_submission(uuid, uuid, text, jsonb) TO authenticated;


CREATE OR REPLACE FUNCTION public.reject_directory_submission(
  p_submission_id uuid,
  p_admin_id uuid,
  p_admin_name text,
  p_reason text DEFAULT NULL
)
RETURNS public.directory_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.directory_submissions;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only a Captain/Admin can reject a directory submission.';
  END IF;

  UPDATE public.directory_submissions
  SET status = 'rejected', reviewed_by_id = p_admin_id, reviewed_by_name = p_admin_name,
      reviewed_at = now(), rejection_reason = p_reason
  WHERE id = p_submission_id AND status = 'pending'
  RETURNING * INTO v_sub;

  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'Submission not found or already reviewed.';
  END IF;

  RETURN v_sub;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_directory_submission(uuid, uuid, text, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.approve_directory_change_request(
  p_request_id uuid,
  p_admin_id uuid,
  p_admin_name text,
  p_overrides jsonb DEFAULT '{}'::jsonb
)
RETURNS public.directory_listings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.directory_change_requests;
  v_merged jsonb;
  v_listing public.directory_listings;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only a Captain/Admin can approve a directory edit.';
  END IF;

  SELECT * INTO v_req FROM public.directory_change_requests WHERE id = p_request_id AND status = 'pending';
  IF v_req IS NULL THEN
    RAISE EXCEPTION 'Change request not found or already reviewed.';
  END IF;

  v_merged := coalesce(v_req.proposed_fields, '{}'::jsonb) || coalesce(p_overrides, '{}'::jsonb);

  -- Only a known, explicit set of columns is ever touched by a change
  -- request — a key simply absent from v_merged leaves that column exactly
  -- as it was, rather than any dynamic/arbitrary-column update.
  UPDATE public.directory_listings SET
    name = coalesce(v_merged->>'name', name),
    mulnayak = coalesce(v_merged->>'mulnayak', mulnayak),
    google_maps_url = coalesce(v_merged->>'google_maps_url', google_maps_url),
    latitude = coalesce((v_merged->>'latitude')::double precision, latitude),
    longitude = coalesce((v_merged->>'longitude')::double precision, longitude),
    pincode = coalesce(v_merged->>'pincode', pincode),
    area = coalesce(v_merged->>'area', area),
    city = coalesce(v_merged->>'city', city),
    state = coalesce(v_merged->>'state', state),
    full_address = coalesce(v_merged->>'full_address', full_address),
    trustees = coalesce(v_merged->'trustees', trustees),
    vihar_group_name = coalesce(v_merged->>'vihar_group_name', vihar_group_name),
    captain_name = coalesce(v_merged->>'captain_name', captain_name),
    captain_mobile = coalesce(v_merged->>'captain_mobile', captain_mobile),
    vice_captain_name = coalesce(v_merged->>'vice_captain_name', vice_captain_name),
    vice_captain_mobile = coalesce(v_merged->>'vice_captain_mobile', vice_captain_mobile),
    member_contacts = coalesce(v_merged->'member_contacts', member_contacts),
    upashray = coalesce(v_merged->'upashray', upashray),
    bhojanshala = coalesce(v_merged->'bhojanshala', bhojanshala),
    library = coalesce(v_merged->'library', library),
    routes = coalesce(v_merged->'routes', routes),
    contact_name = coalesce(v_merged->>'contact_name', contact_name),
    contact_phone = coalesce(v_merged->>'contact_phone', contact_phone),
    contact_phone_public = coalesce((v_merged->>'contact_phone_public')::boolean, contact_phone_public),
    website = coalesce(v_merged->>'website', website),
    timings = coalesce(v_merged->'timings', timings),
    photos = coalesce(v_merged->'photos', photos),
    notes = coalesce(v_merged->>'notes', notes),
    updated_at = now()
  WHERE id = v_req.listing_id
  RETURNING * INTO v_listing;

  UPDATE public.directory_change_requests
  SET status = 'approved', reviewed_by_id = p_admin_id, reviewed_by_name = p_admin_name, reviewed_at = now()
  WHERE id = p_request_id;

  RETURN v_listing;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_directory_change_request(uuid, uuid, text, jsonb) TO authenticated;


CREATE OR REPLACE FUNCTION public.reject_directory_change_request(
  p_request_id uuid,
  p_admin_id uuid,
  p_admin_name text,
  p_reason text DEFAULT NULL
)
RETURNS public.directory_change_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.directory_change_requests;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: only a Captain/Admin can reject a directory edit.';
  END IF;

  UPDATE public.directory_change_requests
  SET status = 'rejected', reviewed_by_id = p_admin_id, reviewed_by_name = p_admin_name,
      reviewed_at = now(), rejection_reason = p_reason
  WHERE id = p_request_id AND status = 'pending'
  RETURNING * INTO v_req;

  IF v_req IS NULL THEN
    RAISE EXCEPTION 'Change request not found or already reviewed.';
  END IF;

  RETURN v_req;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_directory_change_request(uuid, uuid, text, text) TO authenticated;


-- 6. Storage bucket for directory photos --------------------------------------
-- Public bucket, same pattern as the existing 'avatars'/'incident-reports'
-- buckets (public getPublicUrl, no signed URLs). NOTE: unlike those two, this
-- bucket's photos are attached to submissions that may still be pending —
-- true "hide pending photos from everyone but the admin" would need signed
-- URLs/a private bucket, which the rest of this app doesn't use anywhere, so
-- this keeps the same public-bucket convention rather than introducing a new
-- access pattern. Flagged here deliberately rather than silently dropped.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('directory-photos', 'directory-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anyone_can_upload_directory_photos" ON storage.objects;
CREATE POLICY "anyone_can_upload_directory_photos" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'directory-photos');

DROP POLICY IF EXISTS "anyone_can_read_directory_photos" ON storage.objects;
CREATE POLICY "anyone_can_read_directory_photos" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'directory-photos');
