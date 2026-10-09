-- Channel (VChat) notifications now say WHO wrote the message: "Aagam: <message>".
-- Same recipients and payload as before; only the notification body changes.
-- (This is the version live on the project; scripts/channel_feature.sql holds the original.)
-- Already applied to the live project as migration "channel_notification_sender_first_name".
CREATE OR REPLACE FUNCTION public.notify_channel_followers_new_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_name text;
  v_first_name text;
  v_body text;
BEGIN
  SELECT name INTO v_org_name FROM public.organizations WHERE id = NEW.organization_id;

  SELECT nullif(split_part(btrim(coalesce(full_name, '')), ' ', 1), '')
    INTO v_first_name
    FROM public.profiles WHERE id = NEW.author_user_id;

  v_body := coalesce(v_first_name, 'Someone') || ': ' || left(NEW.message, 200);

  -- Own-org members (excluding the poster) — the "My Vihar Group Chat" case.
  INSERT INTO public.notifications (user_id, organization_id, type, title, message, payload)
  SELECT
    p.id,
    NEW.organization_id,
    'channel_message',
    coalesce(v_org_name, 'Your organization') || ' Channel',
    v_body,
    jsonb_build_object('kind', 'channel_post', 'organization_id', NEW.organization_id, 'post_id', NEW.id)
  FROM public.profiles p
  WHERE p.organization_id = NEW.organization_id
    AND p.id != NEW.author_user_id
    AND p.is_active = true;

  -- Following-org members — the cross-org follower case.
  INSERT INTO public.notifications (user_id, organization_id, type, title, message, payload)
  SELECT
    p.id,
    p.organization_id,
    'channel_message',
    coalesce(v_org_name, 'A followed organization') || ' posted an update',
    v_body,
    jsonb_build_object('kind', 'channel_post', 'organization_id', NEW.organization_id, 'post_id', NEW.id)
  FROM public.channel_follows cf
  JOIN public.profiles p ON p.organization_id = cf.follower_organization_id
  WHERE cf.followed_organization_id = NEW.organization_id
    AND p.is_active = true;

  RETURN NEW;
END;
$function$;
