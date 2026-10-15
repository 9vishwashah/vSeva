-- Applied 15 Oct 2026 as migration "push_webhook_url_vjas" (owner-approved).
-- vseva.netlify.app no longer exists (404 since at least 12 Oct 2026), so no push notification was delivered.
-- The notifications webhook now posts to the production custom domain. Rollback = the same function with the old
-- URL 'https://vseva.netlify.app/.netlify/functions/send-push' (which is dead, so there is nothing to roll back to).
CREATE OR REPLACE FUNCTION public.notify_send_push_webhook()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://vseva.vjas.in/.netlify/functions/send-push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$function$;
revoke execute on function public.notify_send_push_webhook() from public, anon, authenticated;
