-- WhatsApp reminders: scheduling.  PREPARED, NOT APPLIED. Apply only after scripts/whatsapp_reminders.sql, the
-- Edge Functions are deployed, and the owner approves going live (see docs/whatsapp/README.md, "Go-live").
--
-- Even with this applied, nothing is sent until the server-side readiness gate passes (Meta sender approved,
-- template approved, webhook verified, a test message delivered, secrets set, the global switches on) AND the
-- super-admin has switched the organisation on AND the Sevak has opted in.
--
-- Needs two Vault secrets (Supabase Dashboard → Project Settings → Vault):
--   whatsapp_worker_url   = https://<project-ref>.supabase.co/functions/v1/whatsapp-worker
--   whatsapp_cron_secret  = the same value as the WHATSAPP_CRON_SECRET Edge Function secret

-- 09:05 IST (03:35 UTC): after send_inactivity_reminders (09:00 IST) has written today's notifications,
-- turn the eligible ones into WhatsApp jobs.
select cron.unschedule(jobid) from cron.job where jobname = 'whatsapp-enqueue-daily';
select cron.schedule('whatsapp-enqueue-daily', '35 3 * * *', $$ select public.whatsapp_enqueue_due(); $$);

-- Every 10 minutes: the worker sends due jobs in small batches (and refreshes Meta readiness).
select cron.unschedule(jobid) from cron.job where jobname = 'whatsapp-worker';
select cron.schedule('whatsapp-worker', '*/10 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'whatsapp_worker_url'),
    headers := jsonb_build_object('Content-Type', 'application/json',
                 'x-whatsapp-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'whatsapp_cron_secret')),
    body := '{"mode":"run"}'::jsonb,
    timeout_milliseconds := 55000
  );
$$);

-- To pause: select cron.unschedule(jobid) from cron.job where jobname in ('whatsapp-enqueue-daily', 'whatsapp-worker');
