-- ============================================================================
-- Channel V1 — Cross-Organization Communication
-- ============================================================================
-- Applied to the vSeva Supabase project (nwkzjmppuvytfulprjxt) via Supabase
-- MCP apply_migration. Kept here as the reviewable record. Safe/idempotent to
-- re-run (IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS throughout).
--
-- Reused, unchanged: get_my_org_id(), is_org_admin() (existing helper
-- functions), the organizations table (no schema change), the vihar_entries
-- table (no schema/RLS change — see get_channel_recent_vihars below).
-- ============================================================================


-- 1. Schema --------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.channel_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  followed_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT channel_follows_no_self_follow CHECK (follower_organization_id <> followed_organization_id),
  CONSTRAINT channel_follows_unique_pair UNIQUE (follower_organization_id, followed_organization_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_follows_follower ON public.channel_follows (follower_organization_id);
CREATE INDEX IF NOT EXISTS idx_channel_follows_followed ON public.channel_follows (followed_organization_id);

CREATE TABLE IF NOT EXISTS public.channel_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  posting_permission text NOT NULL DEFAULT 'captain_only'
    CHECK (posting_permission IN ('captain_only', 'all_members')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.channel_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_channel_posts_org_created
  ON public.channel_posts (organization_id, created_at DESC);


-- 2. Helper functions ------------------------------------------------------

-- Defaults an org with no explicit channel_settings row to 'captain_only'
-- (matches the product default), so posting a row into channel_settings is
-- only needed when an org actually changes the setting.
CREATE OR REPLACE FUNCTION public.get_channel_posting_permission(p_organization_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT posting_permission FROM public.channel_settings WHERE organization_id = p_organization_id),
    'captain_only'
  );
$$;

-- Whether the caller's organization currently follows p_organization_id
-- (or IS p_organization_id — a member always has access to their own org's
-- Channel). Centralizes the "own org OR followed org" read rule used by
-- both table RLS and the Realtime Authorization policy below.
CREATE OR REPLACE FUNCTION public.can_read_channel(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_organization_id = public.get_my_org_id()
    OR EXISTS (
      SELECT 1 FROM public.channel_follows
      WHERE follower_organization_id = public.get_my_org_id()
        AND followed_organization_id = p_organization_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_channel_posting_permission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_channel(uuid) TO authenticated;


-- 3. RLS: channel_follows ---------------------------------------------------

ALTER TABLE public.channel_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "channel_follows_select_own_org" ON public.channel_follows;
CREATE POLICY "channel_follows_select_own_org" ON public.channel_follows
FOR SELECT TO authenticated
USING (follower_organization_id = public.get_my_org_id());

-- Only the Captain/org-head (is_org_admin()) of the follower org can create
-- or remove a follow — never a Sevak, and never on behalf of another org.
DROP POLICY IF EXISTS "channel_follows_insert_captain_only" ON public.channel_follows;
CREATE POLICY "channel_follows_insert_captain_only" ON public.channel_follows
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin()
  AND follower_organization_id = public.get_my_org_id()
);

DROP POLICY IF EXISTS "channel_follows_delete_captain_only" ON public.channel_follows;
CREATE POLICY "channel_follows_delete_captain_only" ON public.channel_follows
FOR DELETE TO authenticated
USING (
  public.is_org_admin()
  AND follower_organization_id = public.get_my_org_id()
);


-- 4. RLS: channel_settings ---------------------------------------------------

ALTER TABLE public.channel_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "channel_settings_select_own_org" ON public.channel_settings;
CREATE POLICY "channel_settings_select_own_org" ON public.channel_settings
FOR SELECT TO authenticated
USING (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS "channel_settings_upsert_captain_only" ON public.channel_settings;
CREATE POLICY "channel_settings_upsert_captain_only" ON public.channel_settings
FOR INSERT TO authenticated
WITH CHECK (public.is_org_admin() AND organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS "channel_settings_update_captain_only" ON public.channel_settings;
CREATE POLICY "channel_settings_update_captain_only" ON public.channel_settings
FOR UPDATE TO authenticated
USING (public.is_org_admin() AND organization_id = public.get_my_org_id())
WITH CHECK (public.is_org_admin() AND organization_id = public.get_my_org_id());


-- 5. RLS: channel_posts -------------------------------------------------------

ALTER TABLE public.channel_posts ENABLE ROW LEVEL SECURITY;

-- Read: own org's posts, or a followed org's posts.
DROP POLICY IF EXISTS "channel_posts_select_own_or_followed" ON public.channel_posts;
CREATE POLICY "channel_posts_select_own_or_followed" ON public.channel_posts
FOR SELECT TO authenticated
USING (public.can_read_channel(organization_id));

-- Insert: only into your OWN org's Channel (never a followed org's), and
-- only if your role satisfies that org's posting_permission setting.
DROP POLICY IF EXISTS "channel_posts_insert_own_org" ON public.channel_posts;
CREATE POLICY "channel_posts_insert_own_org" ON public.channel_posts
FOR INSERT TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND organization_id = public.get_my_org_id()
  AND (
    public.is_org_admin()
    OR public.get_channel_posting_permission(organization_id) = 'all_members'
  )
);

-- Delete: only your own message.
DROP POLICY IF EXISTS "channel_posts_delete_own_message" ON public.channel_posts;
CREATE POLICY "channel_posts_delete_own_message" ON public.channel_posts
FOR DELETE TO authenticated
USING (author_user_id = auth.uid() AND organization_id = public.get_my_org_id());


-- 6. Narrow read RPCs (reuse existing data, no new cross-org RLS grants) -----

-- Discover: search registered organizations by name/city/town. Returns only
-- the minimal identity fields Channel's discovery UI needs — organizations'
-- own SELECT RLS stays scoped to "own org only" (unchanged); this function
-- is the narrow, controlled exception, matching the existing get-org-roster
-- / get-sevak-names pattern of purpose-built narrow reads instead of
-- widening a table's RLS.
CREATE OR REPLACE FUNCTION public.search_channel_organizations(p_query text, p_limit int DEFAULT 20)
RETURNS TABLE (id uuid, name text, city text, town text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name, o.city, o.town
  FROM public.organizations o
  WHERE o.id <> public.get_my_org_id()
    AND (
      p_query IS NULL OR p_query = '' OR
      o.name ILIKE '%' || p_query || '%' OR
      o.city ILIKE '%' || p_query || '%' OR
      o.town ILIKE '%' || p_query || '%'
    )
  ORDER BY o.name
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

-- Organization profile for the Channel org page — same narrow-field
-- rationale as above. Vice-captain name only (matches the public Directory's
-- own level of disclosure); no mobile numbers or other private fields.
CREATE OR REPLACE FUNCTION public.get_channel_org_profile(p_organization_id uuid)
RETURNS TABLE (id uuid, name text, city text, town text, vice_captain_name text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name, o.city, o.town, o.vice_captain_name, o.created_at
  FROM public.organizations o
  WHERE o.id = p_organization_id;
$$;

-- Recent Vihars for the Channel org page. Reads the existing vihar_entries
-- table (no duplication, no schema change) but returns only the same
-- summary shape already shown elsewhere in the app (date/from/to/type/
-- distance/sevak count) — never sevak names or other per-entry detail.
-- Approved entries only, matching every other cross-cutting Vihar read in
-- this codebase (get_top_sevaks_leaderboard, get_org_activity_stats, etc).
CREATE OR REPLACE FUNCTION public.get_channel_recent_vihars(p_organization_id uuid, p_limit int DEFAULT 5)
RETURNS TABLE (
  vihar_date date,
  vihar_from text,
  vihar_to text,
  vihar_type text,
  distance_km numeric,
  sevak_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.vihar_date,
    v.vihar_from,
    v.vihar_to,
    v.vihar_type,
    v.distance_km,
    COALESCE(array_length(v.sevaks, 1), 0) AS sevak_count
  FROM public.vihar_entries v
  WHERE v.organization_id = p_organization_id
    AND v.status = 'approved'
  ORDER BY v.vihar_date DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 10);
$$;

GRANT EXECUTE ON FUNCTION public.search_channel_organizations(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_channel_org_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_channel_recent_vihars(uuid, int) TO authenticated;


-- 7. Push notification fan-out (reuses the existing notifications table —
--    same table/webhook/send-push.js pipeline every other notification type
--    already uses; one row per eligible recipient, same as the existing
--    notify_captains_new_vihar_submission pattern. channel_posts itself
--    still stores exactly one row per message.) -----------------------------

CREATE OR REPLACE FUNCTION public.notify_channel_followers_new_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_name text;
BEGIN
  SELECT name INTO v_org_name FROM public.organizations WHERE id = NEW.organization_id;

  INSERT INTO public.notifications (user_id, organization_id, type, title, message, payload)
  SELECT
    p.id,
    p.organization_id,
    'channel_message',
    coalesce(v_org_name, 'A followed organization') || ' posted an update',
    left(NEW.message, 200),
    jsonb_build_object('kind', 'channel_post', 'organization_id', NEW.organization_id, 'post_id', NEW.id)
  FROM public.channel_follows cf
  JOIN public.profiles p ON p.organization_id = cf.follower_organization_id
  WHERE cf.followed_organization_id = NEW.organization_id
    AND p.is_active = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_channel_followers ON public.channel_posts;
CREATE TRIGGER trg_notify_channel_followers
AFTER INSERT ON public.channel_posts
FOR EACH ROW EXECUTE FUNCTION public.notify_channel_followers_new_post();


-- 8. Realtime: database-triggered Broadcast on new post ----------------------

CREATE OR REPLACE FUNCTION public.broadcast_channel_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'channel:org:' || NEW.organization_id::text,  -- topic
    'INSERT',                                       -- event
    TG_OP,                                           -- operation
    TG_TABLE_NAME,                                   -- table
    TG_TABLE_SCHEMA,                                 -- schema
    NEW,
    NULL
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_channel_post ON public.channel_posts;
CREATE TRIGGER trg_broadcast_channel_post
AFTER INSERT ON public.channel_posts
FOR EACH ROW EXECUTE FUNCTION public.broadcast_channel_post();


-- 9. Realtime Authorization: private topic subscription ----------------------
-- A user may subscribe to `channel:org:<id>` only if they can read that
-- org's Channel (own org, or their org follows it) — same rule as the table
-- RLS above, via the same can_read_channel() helper.

DROP POLICY IF EXISTS "channel_topic_subscribe_authorized" ON realtime.messages;
CREATE POLICY "channel_topic_subscribe_authorized" ON realtime.messages
FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'channel:org:%'
  AND public.can_read_channel(substring(realtime.topic() from 13)::uuid)
);


-- 10. 30-day retention: pg_cron daily cleanup ---------------------------------
-- NOTE: pg_cron was not installed on this project before Channel — enabling
-- it here is the one piece of infrastructure this feature turns on, exactly
-- for this retention requirement. Reported explicitly in the Channel V1
-- final report, not silently enabled.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.cleanup_expired_channel_posts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.channel_posts
  WHERE created_at < now() - interval '30 days';
$$;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'channel_posts_daily_cleanup';
SELECT cron.schedule(
  'channel_posts_daily_cleanup',
  '17 3 * * *', -- once daily, 03:17 UTC — a deliberately off-the-hour, low-traffic time
  $$ SELECT public.cleanup_expired_channel_posts(); $$
);
