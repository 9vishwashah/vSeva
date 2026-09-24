-- ============================================================================
-- Sevak Vihar Entry With Captain Approval Workflow
-- ============================================================================
-- STATUS: Applied directly to the vSeva Supabase project (nwkzjmppuvytfulprjxt)
-- via two migrations: `vihar_approval_workflow` and
-- `vihar_approval_workflow_leaderboard_filter`. This file is kept as the
-- reviewable record of exactly what was run. Re-running it is safe/idempotent
-- (IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS throughout).
--
-- What this does, and why it's safe against the existing 623 rows / 504 profiles:
--   1. Adds three columns to public.vihar_entries: status (NOT NULL DEFAULT
--      'approved', CHECK IN pending/approved/rejected), reviewed_by (uuid, FK
--      -> profiles.id), reviewed_at (timestamptz). DEFAULT 'approved' backfilled
--      every existing row and means the Captain's existing "New Entry" flow
--      (which never sets status itself) stays official immediately — verified:
--      all 623 pre-existing rows read back as status = 'approved'.
--   2. Adds ONE new, purely additive INSERT policy so a Sevak can create their
--      own pending row. Does not touch any existing policy. The existing
--      SELECT policy for Sevaks ("sevak_can_read_own_entries") was inspected
--      and is already scoped to rows containing their own username — so a
--      pending/rejected submission is already invisible to uninvolved Sevaks
--      with no further RLS change needed.
--   3. Fixes a real bug this inspection uncovered: the AFTER INSERT trigger
--      `sync_vihar_sevaks` (denormalizes vihar_entries.sevaks into the
--      vihar_sevaks join table) ran as SECURITY INVOKER, and vihar_sevaks has
--      no INSERT policy for the 'sevak' role — only for admins. Without this
--      fix, the moment a Sevak was allowed to INSERT into vihar_entries, this
--      trigger would hit "permission denied for table vihar_sevaks" and roll
--      back the whole submission. Same function body, only SECURITY DEFINER
--      (+ SET search_path) added — admin behavior is unchanged since admins
--      already had their own vihar_sevaks INSERT rights.
--   4. Adds four new SECURITY DEFINER functions, each checking auth.uid()
--      server-side (never a client-supplied id): notify_vihar_participants,
--      notify_captains_new_vihar_submission, approve_vihar_entry,
--      reject_vihar_entry.
--   5. Patches three existing RPCs that read vihar_entries directly with no
--      status awareness — get_sevak_rank and get_top_sevaks_leaderboard (the
--      Dashboard's Rank stat and Leaderboard cards) and get_org_activity_stats
--      (Super Admin's per-org entry count) — adding exactly one
--      `status = 'approved'` condition each. Every other join, formula,
--      grouping and ordering is byte-for-byte the original body.
--      get_total_org_sevaks was inspected and never reads vihar_entries at
--      all (profiles only), so it needed no change.
-- ============================================================================

-- 1. Schema: additive columns -------------------------------------------------

ALTER TABLE public.vihar_entries
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.vihar_entries
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id);

ALTER TABLE public.vihar_entries
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_vihar_entries_org_status
  ON public.vihar_entries (organization_id, status);


-- 2. RLS: allow a Sevak to submit their own pending entry ---------------------

DROP POLICY IF EXISTS "sevaks_insert_own_pending_vihar" ON public.vihar_entries;
CREATE POLICY "sevaks_insert_own_pending_vihar" ON public.vihar_entries
FOR INSERT TO authenticated
WITH CHECK (
  status = 'pending'
  AND created_by = auth.uid()
  AND organization_id = get_my_org_id()
);


-- 3. Bug fix: make the vihar_sevaks sync trigger bypass RLS -------------------

CREATE OR REPLACE FUNCTION public.sync_vihar_sevaks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  sevak_username text;
  sevak_profile_id uuid;
begin
  if new.sevaks is null then
    return new;
  end if;

  foreach sevak_username in array new.sevaks loop
    select p.id
    into sevak_profile_id
    from public.profiles p
    where p.username = sevak_username
      and p.organization_id = new.organization_id;

    if sevak_profile_id is not null then
      insert into public.vihar_sevaks (vihar_id, sevak_id, organization_id)
      values (new.id, sevak_profile_id, new.organization_id)
      on conflict do nothing;
    end if;
  end loop;

  return new;
end;
$function$;


-- 4. Notification + approval RPCs ---------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_vihar_participants(p_entry_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.vihar_entries;
  v_recipients uuid[];
BEGIN
  SELECT * INTO v_entry FROM public.vihar_entries WHERE id = p_entry_id AND status = 'approved';
  IF v_entry IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND organization_id = v_entry.organization_id
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE organization_id = v_entry.organization_id
      AND payload->>'kind' = 'vihar_recorded'
      AND (payload->>'entry_id')::bigint = v_entry.id
  ) THEN
    RETURN;
  END IF;

  SELECT array_agg(DISTINCT p.id) INTO v_recipients
  FROM public.profiles p
  WHERE p.organization_id = v_entry.organization_id
    AND p.username = ANY (coalesce(v_entry.sevaks, ARRAY[]::text[]));

  IF v_recipients IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, organization_id, type, title, message, payload)
  SELECT
    uid,
    v_entry.organization_id,
    'info',
    'Your Vihar has been recorded',
    'The Vihar on ' || to_char(v_entry.vihar_date, 'DD Mon YYYY') || ' (' || v_entry.vihar_from || ' -> ' || v_entry.vihar_to || ') has been recorded successfully.',
    jsonb_build_object('kind', 'vihar_recorded', 'entry_id', v_entry.id, 'vihar_date', v_entry.vihar_date)
  FROM unnest(v_recipients) AS uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_vihar_participants(bigint) TO authenticated;


CREATE OR REPLACE FUNCTION public.notify_captains_new_vihar_submission(p_entry_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.vihar_entries;
  v_submitter_name text;
BEGIN
  SELECT * INTO v_entry FROM public.vihar_entries WHERE id = p_entry_id AND status = 'pending';
  IF v_entry IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND organization_id = v_entry.organization_id
      AND (id = v_entry.created_by OR role = 'admin')
  ) THEN
    RETURN;
  END IF;

  SELECT full_name INTO v_submitter_name FROM public.profiles WHERE id = v_entry.created_by;

  INSERT INTO public.notifications (user_id, organization_id, type, title, message, payload)
  SELECT
    p.id,
    v_entry.organization_id,
    'alert',
    'New Vihar awaiting approval',
    coalesce(v_submitter_name, 'A Sevak') || ' submitted a Vihar entry for ' || to_char(v_entry.vihar_date, 'DD Mon YYYY') || '. Review now.',
    jsonb_build_object('kind', 'vihar_submission', 'entry_id', v_entry.id, 'vihar_date', v_entry.vihar_date)
  FROM public.profiles p
  WHERE p.organization_id = v_entry.organization_id
    AND p.role = 'admin'
    AND p.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_captains_new_vihar_submission(bigint) TO authenticated;


CREATE OR REPLACE FUNCTION public.approve_vihar_entry(p_entry_id bigint)
RETURNS public.vihar_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_org uuid;
  v_entry public.vihar_entries;
BEGIN
  SELECT role, organization_id INTO v_caller_role, v_caller_org
  FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: only a Captain/Admin can approve a Vihar entry.';
  END IF;

  UPDATE public.vihar_entries
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_entry_id
    AND status = 'pending'
    AND organization_id = v_caller_org
  RETURNING * INTO v_entry;

  IF v_entry IS NULL THEN
    SELECT * INTO v_entry FROM public.vihar_entries WHERE id = p_entry_id AND organization_id = v_caller_org;
    RETURN v_entry;
  END IF;

  PERFORM public.notify_vihar_participants(v_entry.id);
  RETURN v_entry;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_vihar_entry(bigint) TO authenticated;


CREATE OR REPLACE FUNCTION public.reject_vihar_entry(p_entry_id bigint, p_reason text DEFAULT NULL)
RETURNS public.vihar_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_org uuid;
  v_entry public.vihar_entries;
BEGIN
  SELECT role, organization_id INTO v_caller_role, v_caller_org
  FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: only a Captain/Admin can reject a Vihar entry.';
  END IF;

  UPDATE public.vihar_entries
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_entry_id
    AND status = 'pending'
    AND organization_id = v_caller_org
  RETURNING * INTO v_entry;

  IF v_entry IS NULL THEN
    SELECT * INTO v_entry FROM public.vihar_entries WHERE id = p_entry_id AND organization_id = v_caller_org;
    RETURN v_entry;
  END IF;

  INSERT INTO public.notifications (user_id, organization_id, type, title, message, payload)
  VALUES (
    v_entry.created_by,
    v_entry.organization_id,
    'info',
    'Vihar submission not approved',
    'Your Vihar submission for ' || to_char(v_entry.vihar_date, 'DD Mon YYYY') ||
      ' was not approved.' || CASE WHEN p_reason IS NOT NULL AND p_reason <> '' THEN ' Reason: ' || p_reason ELSE '' END,
    jsonb_build_object('kind', 'vihar_rejected', 'entry_id', v_entry.id, 'vihar_date', v_entry.vihar_date)
  );

  RETURN v_entry;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_vihar_entry(bigint, text) TO authenticated;


-- 5. Patch existing leaderboard/rank/activity RPCs ----------------------------
-- Every formula, join, grouping and ordering is preserved exactly as found in
-- the live database; only a `status = 'approved'` condition is added.

CREATE OR REPLACE FUNCTION public.get_sevak_rank(org_id uuid, sevak_username text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_rank integer;
begin
  with stats as (
    select
      unnest(sevaks) as username,
      count(*) as total_vihars,
      coalesce(sum(distance_km), 0) as total_km
    from public.vihar_entries
    where organization_id = org_id
      and status = 'approved'
    group by username
  ),
  ranking as (
    select
      username,
      rank() over (order by total_vihars desc, total_km desc) as rnk
    from stats
  )
  select rnk into v_rank
  from ranking
  where username = sevak_username;

  return coalesce(v_rank, 0); -- Return 0 if not ranked/found
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_top_sevaks_leaderboard(org_id uuid, limit_val integer DEFAULT 10)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
BEGIN
    WITH sevak_stats AS (
        SELECT
            s.username,
            s.full_name,
            COALESCE(s.gender, 'Male') AS gender,
            COUNT(ve.id) AS count,
            COALESCE(SUM(ve.distance_km), 0) AS km
        FROM profiles s
        LEFT JOIN vihar_entries ve
            ON ve.organization_id = s.organization_id
            AND s.username = ANY(ve.sevaks)
            AND ve.status = 'approved'
        WHERE s.organization_id = org_id
          AND s.role = 'sevak'
          AND s.is_active = true
        GROUP BY s.username, s.full_name, s.gender
    ),
    ranked_stats AS (
        SELECT
            *,
            RANK() OVER (PARTITION BY NULL ORDER BY count DESC, km DESC) as overall_rank,
            RANK() OVER (PARTITION BY gender ORDER BY count DESC, km DESC) as gender_rank
        FROM sevak_stats
    )
    SELECT json_build_object(
        'overall', (SELECT json_agg(row_to_json(r)) FROM (SELECT * FROM ranked_stats ORDER BY count DESC, km DESC LIMIT limit_val) r),
        'male', (SELECT json_agg(row_to_json(r)) FROM (SELECT * FROM ranked_stats WHERE lower(gender) = 'male' ORDER BY count DESC, km DESC LIMIT limit_val) r),
        'female', (SELECT json_agg(row_to_json(r)) FROM (SELECT * FROM ranked_stats WHERE lower(gender) = 'female' ORDER BY count DESC, km DESC LIMIT limit_val) r)
    ) INTO result;

    RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_org_activity_stats()
 RETURNS TABLE(org_id uuid, org_name text, city text, created_at timestamp with time zone, total_sevaks bigint, total_entries bigint, last_updated timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    SELECT
        o.id as org_id,
        o.name as org_name,
        o.city,
        o.created_at,
        COUNT(DISTINCT p.id) as total_sevaks,
        COUNT(DISTINCT v.id) as total_entries,
        MAX(v.created_at) as last_updated
    FROM
        public.organizations o
    LEFT JOIN
        public.profiles p ON o.id = p.organization_id AND p.role = 'sevak' AND p.is_active = true
    LEFT JOIN
        public.vihar_entries v ON o.id = v.organization_id AND v.status = 'approved'
    GROUP BY
        o.id, o.name, o.city, o.created_at
    ORDER BY
        o.created_at DESC;
$function$;
