-- VChat: reply to a specific message. Already applied to the live project as migration "channel_post_replies".
-- A reply stores which message it answers (reply_to_id) plus a snapshot of who wrote it and the first part of its
-- text, filled in by the database (never trusted from the app). The snapshot means the quote still reads correctly
-- in the list without a join; if the original is deleted the FK clears reply_to_id and the app shows
-- "Original message deleted" instead of the text (the stale excerpt is purged by the daily cleanup).

ALTER TABLE public.channel_posts
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.channel_posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_to_author text,
  ADD COLUMN IF NOT EXISTS reply_to_excerpt text;

CREATE INDEX IF NOT EXISTS idx_channel_posts_reply_to
  ON public.channel_posts (reply_to_id) WHERE reply_to_id IS NOT NULL;

-- Always (re)derive the snapshot from the real parent, and only accept a parent from the SAME organization's
-- channel: a client cannot quote text it could not already read, or forge what a quote says.
CREATE OR REPLACE FUNCTION public.set_channel_post_reply_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_parent_message text;
  v_parent_author text;
  v_found boolean := false;
BEGIN
  IF NEW.reply_to_id IS NOT NULL THEN
    SELECT cp.message, coalesce(p.full_name, 'Member'), true
      INTO v_parent_message, v_parent_author, v_found
      FROM public.channel_posts cp
      LEFT JOIN public.profiles p ON p.id = cp.author_user_id
      WHERE cp.id = NEW.reply_to_id
        AND cp.organization_id = NEW.organization_id;
  END IF;

  IF v_found THEN
    NEW.reply_to_author := v_parent_author;
    NEW.reply_to_excerpt := left(v_parent_message, 140);
  ELSE
    NEW.reply_to_id := NULL;
    NEW.reply_to_author := NULL;
    NEW.reply_to_excerpt := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_channel_post_reply_snapshot ON public.channel_posts;
CREATE TRIGGER trg_channel_post_reply_snapshot
BEFORE INSERT ON public.channel_posts
FOR EACH ROW EXECUTE FUNCTION public.set_channel_post_reply_snapshot();

-- Realtime broadcast carries the reply fields too, so a reply shows its quote the moment it arrives.
CREATE OR REPLACE FUNCTION public.broadcast_channel_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_author_name text;
  v_author_avatar_url text;
  v_author_role text;
BEGIN
  SELECT full_name, avatar_url, role
    INTO v_author_name, v_author_avatar_url, v_author_role
    FROM public.profiles WHERE id = NEW.author_user_id;

  PERFORM realtime.send(
    jsonb_build_object(
      'id', NEW.id,
      'organization_id', NEW.organization_id,
      'author_user_id', NEW.author_user_id,
      'author_name', coalesce(v_author_name, 'Member'),
      'author_avatar_url', v_author_avatar_url,
      'author_role', v_author_role,
      'message', NEW.message,
      'created_at', NEW.created_at,
      'reply_to_id', NEW.reply_to_id,
      'reply_to_author', NEW.reply_to_author,
      'reply_to_excerpt', NEW.reply_to_excerpt
    ),
    'INSERT',
    'channel:org:' || NEW.organization_id::text,
    true
  );
  RETURN NEW;
END;
$function$;

-- The message list returns the reply fields.
DROP FUNCTION IF EXISTS public.get_channel_posts(uuid, timestamptz, integer);
CREATE OR REPLACE FUNCTION public.get_channel_posts(p_organization_id uuid, p_before timestamptz DEFAULT NULL, p_limit integer DEFAULT 30)
RETURNS TABLE(
  id uuid, organization_id uuid, author_user_id uuid, author_name text, author_avatar_url text, author_role text,
  message text, created_at timestamptz,
  reply_to_id uuid, reply_to_author text, reply_to_excerpt text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    cp.id, cp.organization_id, cp.author_user_id,
    coalesce(p.full_name, 'Member') AS author_name,
    p.avatar_url AS author_avatar_url,
    p.role AS author_role,
    cp.message, cp.created_at,
    cp.reply_to_id, cp.reply_to_author, cp.reply_to_excerpt
  FROM public.channel_posts cp
  LEFT JOIN public.profiles p ON p.id = cp.author_user_id
  WHERE cp.organization_id = p_organization_id
    AND public.can_read_channel(p_organization_id)
    AND (p_before IS NULL OR cp.created_at < p_before)
  ORDER BY cp.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 30);
$function$;
GRANT EXECUTE ON FUNCTION public.get_channel_posts(uuid, timestamptz, integer) TO authenticated, service_role;

-- Daily cleanup: besides the 30-day expiry, drop the quoted text of replies whose original message is gone.
CREATE OR REPLACE FUNCTION public.cleanup_expired_channel_posts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DELETE FROM public.channel_posts
  WHERE created_at < now() - interval '30 days';
  UPDATE public.channel_posts
  SET reply_to_excerpt = NULL
  WHERE reply_to_id IS NULL AND reply_to_author IS NOT NULL AND reply_to_excerpt IS NOT NULL;
$function$;
