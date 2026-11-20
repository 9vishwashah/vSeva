-- Rollback for scripts/whatsapp_reminders.sql (and the cron jobs). Removes ONLY the WhatsApp objects.
-- Nothing else is touched: push / in-app notifications and the existing reminder run keep working.
-- Note: this deletes the WhatsApp queue, delivery log, consent records and audit log. Export them first if needed.

select cron.unschedule(jobid) from cron.job where jobname in ('whatsapp-enqueue-daily', 'whatsapp-worker');

drop function if exists public.set_my_whatsapp_opt_in(boolean);
drop function if exists public.get_my_whatsapp_status();
drop function if exists public.whatsapp_record_event(text, text, timestamptz, text, text, jsonb);
drop function if exists public.whatsapp_recheck(bigint);
drop function if exists public.whatsapp_claim_batch(integer);
drop function if exists public.whatsapp_enqueue_due(uuid);
drop function if exists public.whatsapp_ist_day_bounds();
drop function if exists public.whatsapp_normalize_phone(text);

drop table if exists public.whatsapp_events;
drop table if exists public.whatsapp_messages;
drop table if exists public.whatsapp_audit_log;
drop table if exists public.whatsapp_preferences;
drop table if exists public.whatsapp_org_settings;
drop table if exists public.whatsapp_config;
