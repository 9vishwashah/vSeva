-- WhatsApp Vihar reminders (Meta WhatsApp Cloud API).  PREPARED, NOT APPLIED. Needs the owner's approval.
--
-- Purely additive: new tables and functions only. Nothing existing is altered, and the existing reminder logic
-- (send_inactivity_reminders in scripts/vihar_reminders_daily.sql) is NOT changed or copied.
--
-- How it fits on top of the existing reminders:
--   09:00 IST  send_inactivity_reminders() decides who is due (latest APPROVED Vihar, or the day a Sevak with no
--              Vihar was added; never before 14 Oct; nothing in Chaturmas; the Captain's 3 day-intervals, once per
--              quiet spell) and writes one notifications row (type 'inactivity', payload.days_since) per Sevak.
--   later      whatsapp_enqueue_due() turns TODAY's inactivity notifications into WhatsApp jobs, but only for
--              organisations the super-admin switched on, for Sevaks with consent (the group's consent, confirmed
--              once by the super-admin, or their own opt-in) who have not opted out, with a valid number.
--              {{2}} (days) is copied from the notification's payload.days_since, so it always equals the push.
--   worker     the whatsapp-worker Edge Function claims due jobs, re-checks each one (whatsapp_recheck), checks
--              the server-side readiness gate, and sends the approved template.
--   webhook    the whatsapp-webhook Edge Function records sent / delivered / read / failed (whatsapp_record_event).
--
-- Push and in-app notifications are untouched: WhatsApp only READS notifications rows.
-- Scheduling (pg_cron) is in scripts/whatsapp_reminders_cron.sql and is applied separately, later.
-- Rollback: scripts/whatsapp_reminders_rollback.sql

-- ───────────────────────────── 1. Global configuration (one row) ─────────────────────────────
-- Written only by the service role (super-admin Netlify function, Edge Functions). No client access.
create table if not exists public.whatsapp_config (
  id smallint primary key default 1 check (id = 1),
  automation_enabled boolean not null default false,   -- master switch (also needs the WHATSAPP_AUTOMATION_ENABLED secret)
  production_mode boolean not null default false,      -- also needs the WHATSAPP_PRODUCTION_MODE secret
  template_name text not null default 'vihar_reminder',
  template_language text not null default 'hi',
  -- readiness, refreshed from the Graph API by whatsapp-worker (mode "check"); never typed in by hand
  sender_display_name text,
  sender_phone text,
  sender_name_status text,          -- Meta name_status: APPROVED / AVAILABLE_WITHOUT_REVIEW / PENDING_REVIEW ...
  sender_quality_rating text,
  template_status text,             -- APPROVED / PENDING / REJECTED ...
  template_category text,           -- MARKETING
  template_id text,
  last_checked_at timestamptz,
  last_check_error text,
  webhook_verified_at timestamptz,  -- set when Meta's GET verification succeeds
  controlled_delivery_at timestamptz, -- set when a TEST message is confirmed DELIVERED by the webhook
  readiness jsonb,                  -- the worker's last gate result: { canSendProduction, productionBlockers, message, ... }
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into public.whatsapp_config (id) values (1) on conflict (id) do nothing;
alter table public.whatsapp_config enable row level security;

-- ───────────────────────────── 2. Per-organisation switch (super-admin only) ─────────────────────────────
-- An organisation sends nothing unless the super-admin turns it on here. Captains can read it (so the app knows
-- whether to offer the opt-in) but never write it. The inactivity days are NOT stored here: they come from
-- org_reminder_settings through the existing reminder run.
create table if not exists public.whatsapp_org_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  enabled boolean not null default false,
  daily_limit integer not null default 100 check (daily_limit between 1 and 1000),       -- cost cap per day
  min_days_between integer not null default 0 check (min_days_between between 0 and 60), -- extra gap per Sevak (0 = follow the Captain's days exactly)
  send_time time not null default '09:15',
  timezone text not null default 'Asia/Kolkata',
  -- 'group': consent given once for the whole group (the Captain informed the Sevaks; the super-admin confirmed it),
  --          so every Sevak counts as agreed unless they opt out.  'opt_in': each Sevak must opt in themselves.
  consent_mode text not null default 'group' check (consent_mode in ('group', 'opt_in')),
  group_consent_by text,
  group_consent_at timestamptz,
  enabled_by text,
  enabled_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.whatsapp_org_settings enable row level security;
drop policy if exists "WhatsApp org settings: org read" on public.whatsapp_org_settings;
create policy "WhatsApp org settings: org read" on public.whatsapp_org_settings
  for select to authenticated using (organization_id = public.get_my_org_id());

-- ───────────────────────────── 3. Individual consent / preference ─────────────────────────────
create table if not exists public.whatsapp_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  opted_in boolean not null default false,
  consent_at timestamptz,
  consent_source text check (consent_source in ('sevak_app', 'super_admin', 'captain', 'import')),
  opted_out_at timestamptz,
  reminders_enabled boolean not null default true,
  phone_status text not null default 'unknown' check (phone_status in ('unknown', 'valid', 'invalid', 'not_on_whatsapp')),
  phone_checked_at timestamptz,
  last_reminder_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists whatsapp_preferences_org_idx on public.whatsapp_preferences (organization_id);
alter table public.whatsapp_preferences enable row level security;
drop policy if exists "WhatsApp preferences: own read" on public.whatsapp_preferences;
create policy "WhatsApp preferences: own read" on public.whatsapp_preferences
  for select to authenticated using (user_id = auth.uid());

-- ───────────────────────────── 4. Queue (one row per WhatsApp message) ─────────────────────────────
create table if not exists public.whatsapp_messages (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  notification_id text unique,            -- the inactivity notification it came from: one WhatsApp per notification
  kind text not null default 'vihar_reminder',
  phone_e164 text not null,               -- digits only, with country code (e.g. 9198XXXXXXXX); needed to send
  template_name text not null,
  template_language text not null,
  template_params jsonb not null,         -- ["<Sevak name>", "<days>"] in the approved order
  is_test boolean not null default false,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'accepted', 'sent', 'delivered', 'read', 'failed', 'cancelled', 'expired')),
  scheduled_at timestamptz not null default now(),
  expires_at timestamptz not null,        -- end of the IST day it was due, so a stale day count is never sent
  attempts integer not null default 0,
  next_retry_at timestamptz,
  locked_at timestamptz,
  retryable boolean not null default false,
  meta_message_id text unique,
  last_error_code text,
  last_error_message text,
  cancel_reason text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz
);
create index if not exists whatsapp_messages_due_idx on public.whatsapp_messages (status, scheduled_at);
create index if not exists whatsapp_messages_org_idx on public.whatsapp_messages (organization_id, created_at desc);
alter table public.whatsapp_messages enable row level security;   -- service role only

-- ───────────────────────────── 5. Delivery events (log + webhook dedupe) ─────────────────────────────
-- No phone numbers here: Meta's recipient_id is removed before the event is stored.
create table if not exists public.whatsapp_events (
  id bigint generated always as identity primary key,
  dedupe_key text not null unique,        -- meta_message_id : status : timestamp  (Meta resends webhooks)
  message_id bigint references public.whatsapp_messages(id) on delete set null,
  organization_id uuid,
  meta_message_id text,
  status text not null,
  error_code text,
  error_title text,
  event_at timestamptz,
  provider jsonb,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_events_message_idx on public.whatsapp_events (meta_message_id);
alter table public.whatsapp_events enable row level security;

-- ───────────────────────────── 6. Audit log (super-admin actions) ─────────────────────────────
create table if not exists public.whatsapp_audit_log (
  id bigint generated always as identity primary key,
  actor text not null,
  action text not null,
  organization_id uuid,
  target_user_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
alter table public.whatsapp_audit_log enable row level security;

revoke all on public.whatsapp_config, public.whatsapp_messages, public.whatsapp_events, public.whatsapp_audit_log
  from anon, authenticated;
revoke insert, update, delete on public.whatsapp_org_settings, public.whatsapp_preferences from anon, authenticated;
revoke all on public.whatsapp_org_settings, public.whatsapp_preferences from anon;

-- ───────────────────────────── 7. Helpers ─────────────────────────────
-- Indian mobile -> 91XXXXXXXXXX; anything else -> null (treated as invalid, never sent).
create or replace function public.whatsapp_normalize_phone(p text)
returns text language sql immutable as $$
  select case
    when d ~ '^[6-9][0-9]{9}$' then '91' || d
    when d ~ '^91[6-9][0-9]{9}$' then d
    when d ~ '^0[6-9][0-9]{9}$' then '91' || substr(d, 2)
    else null end
  from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) s
$$;

-- The start and end of "today" in India, used for the daily window.
create or replace function public.whatsapp_ist_day_bounds(out day_start timestamptz, out day_end timestamptz)
language sql stable as $$
  select ((now() at time zone 'Asia/Kolkata')::date)::timestamp at time zone 'Asia/Kolkata',
         (((now() at time zone 'Asia/Kolkata')::date) + 1)::timestamp at time zone 'Asia/Kolkata'
$$;

-- ───────────────────────────── 8. Build today's jobs from today's inactivity notifications ─────────────────────────────
create or replace function public.whatsapp_enqueue_due(p_org uuid default null)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  b record;
  v_cfg public.whatsapp_config;
  v_count integer := 0;
begin
  select * into v_cfg from public.whatsapp_config where id = 1;
  select * into b from public.whatsapp_ist_day_bounds();

  -- numbers that can never work are marked so the super-admin sees them (no message is created for them)
  update public.whatsapp_preferences wp set phone_status = 'invalid', phone_checked_at = now()
    from public.profiles p
   where p.id = wp.user_id and public.whatsapp_normalize_phone(p.mobile) is null and wp.phone_status <> 'invalid';

  with candidates as (
    select n.id::text as notification_id, n.organization_id, n.user_id,
           btrim(coalesce(p.full_name, '')) as full_name,
           (n.payload->>'days_since') as days_since,
           public.whatsapp_normalize_phone(p.mobile) as phone,
           ws.daily_limit, ws.send_time, ws.timezone,
           row_number() over (partition by n.organization_id order by n.created_at, n.id::text) as rn
      from public.notifications n
      join public.whatsapp_org_settings ws on ws.organization_id = n.organization_id and ws.enabled
      join public.profiles p on p.id = n.user_id and p.role = 'sevak' and coalesce(p.is_active, true)
      left join public.whatsapp_preferences wp on wp.user_id = n.user_id
     where n.type = 'inactivity'
       and n.created_at >= b.day_start and n.created_at < b.day_end
       and (p_org is null or n.organization_id = p_org)
       -- consent: the Sevak's own opt-in, or the group's consent (unless this Sevak opted out)
       and wp.opted_out_at is null
       and (coalesce(wp.opted_in, false) or (ws.consent_mode = 'group' and ws.group_consent_at is not null))
       and coalesce(wp.reminders_enabled, true)
       and coalesce(wp.phone_status, 'unknown') not in ('invalid', 'not_on_whatsapp')
       and public.whatsapp_normalize_phone(p.mobile) is not null
       and (n.payload->>'days_since') ~ '^[0-9]+$'
       -- WhatsApp repeat gap (cost control), on top of the existing once-per-tier rule
       and (wp.last_reminder_at is null or wp.last_reminder_at < now() - make_interval(days => ws.min_days_between))
       and not exists (select 1 from public.whatsapp_messages m where m.notification_id = n.id::text)
  ),
  already as (
    select organization_id, count(*) as sent_today from public.whatsapp_messages
     where created_at >= b.day_start and not is_test group by organization_id
  )
  insert into public.whatsapp_messages (organization_id, user_id, notification_id, phone_e164, template_name,
                                        template_language, template_params, scheduled_at, expires_at)
  select c.organization_id, c.user_id, c.notification_id, c.phone, v_cfg.template_name, v_cfg.template_language,
         jsonb_build_array(nullif(c.full_name, ''), c.days_since),
         greatest(now(), ((now() at time zone c.timezone)::date + c.send_time) at time zone c.timezone),
         b.day_end
    from candidates c
    left join already a on a.organization_id = c.organization_id
   where c.full_name <> ''
     and c.rn + coalesce(a.sent_today, 0) <= c.daily_limit
  on conflict (notification_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

-- ───────────────────────────── 9. Worker helpers ─────────────────────────────
-- Claims up to p_limit due jobs for ONE worker; concurrent workers never get the same row (SKIP LOCKED).
create or replace function public.whatsapp_claim_batch(p_limit integer default 25)
returns setof public.whatsapp_messages
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- jobs past their day are never sent (the day count would be wrong tomorrow)
  update public.whatsapp_messages set status = 'expired', cancel_reason = 'past its day', locked_at = null
   where status in ('queued', 'sending') and expires_at <= now();
  -- a worker that died mid-send releases its rows after 10 minutes
  update public.whatsapp_messages set status = 'queued', locked_at = null
   where status = 'sending' and locked_at < now() - interval '10 minutes';

  return query
  update public.whatsapp_messages m
     set status = 'sending', locked_at = now(), attempts = m.attempts + 1
   where m.id in (
     select id from public.whatsapp_messages
      where status = 'queued' and scheduled_at <= now()
        and (next_retry_at is null or next_retry_at <= now()) and expires_at > now()
      order by scheduled_at, id
      for update skip locked
      limit greatest(1, least(p_limit, 200)))
  returning m.*;
end;
$function$;

-- Re-checked immediately before sending. Returns null when the job may go, otherwise the reason it must not.
create or replace function public.whatsapp_recheck(p_message_id bigint)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  m public.whatsapp_messages;
  v_since date;
  v_last date;
begin
  select * into m from public.whatsapp_messages where id = p_message_id;
  if m.id is null then return 'job not found'; end if;
  if m.is_test then return null; end if;
  if not exists (select 1 from public.whatsapp_org_settings where organization_id = m.organization_id and enabled) then
    return 'organisation switched off'; end if;
  if exists (select 1 from public.whatsapp_preferences
              where user_id = m.user_id and (opted_out_at is not null or not reminders_enabled or phone_status in ('invalid', 'not_on_whatsapp'))) then
    return 'no WhatsApp consent'; end if;
  if not (exists (select 1 from public.whatsapp_preferences where user_id = m.user_id and opted_in)
          or exists (select 1 from public.whatsapp_org_settings where organization_id = m.organization_id
                      and consent_mode = 'group' and group_consent_at is not null)) then
    return 'no WhatsApp consent'; end if;
  if not exists (select 1 from public.profiles where id = m.user_id and role = 'sevak' and coalesce(is_active, true)
                    and organization_id = m.organization_id) then
    return 'Sevak inactive or moved'; end if;
  -- a Vihar approved after the quiet spell began means the reminder is no longer true
  select (n.payload->>'since')::date into v_since from public.notifications n where n.id::text = m.notification_id;
  select max(e.vihar_date) into v_last
    from public.vihar_entries e join public.profiles p on p.id = m.user_id
   where e.organization_id = m.organization_id and e.status = 'approved' and p.username = any(e.sevaks);
  if v_since is not null and v_last is not null and v_last > v_since then return 'new approved Vihar'; end if;
  return null;
end;
$function$;

-- ───────────────────────────── 10. Webhook status events ─────────────────────────────
-- Idempotent: the same Meta event twice changes nothing. Status only moves forward
-- (accepted < sent < delivered < read); failed is recorded whenever Meta reports it.
create or replace function public.whatsapp_record_event(
  p_meta_message_id text, p_status text, p_event_at timestamptz,
  p_error_code text default null, p_error_title text default null, p_provider jsonb default null)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  m public.whatsapp_messages;
  v_key text := p_meta_message_id || ':' || p_status || ':' || coalesce(extract(epoch from p_event_at)::bigint::text, '');
  v_rank_new int := case p_status when 'sent' then 2 when 'delivered' then 3 when 'read' then 4 else 0 end;
  v_rank_old int;
begin
  if p_status not in ('sent', 'delivered', 'read', 'failed') then return 'ignored status'; end if;
  select * into m from public.whatsapp_messages where meta_message_id = p_meta_message_id;

  insert into public.whatsapp_events (dedupe_key, message_id, organization_id, meta_message_id, status, error_code, error_title, event_at, provider)
  values (v_key, m.id, m.organization_id, p_meta_message_id, p_status, p_error_code, p_error_title, p_event_at, p_provider)
  on conflict (dedupe_key) do nothing;
  if not found then return 'duplicate'; end if;
  if m.id is null then return 'unknown message'; end if;

  v_rank_old := case m.status when 'accepted' then 1 when 'sent' then 2 when 'delivered' then 3 when 'read' then 4 else 0 end;
  if p_status = 'failed' then
    update public.whatsapp_messages set status = 'failed', failed_at = coalesce(p_event_at, now()),
           last_error_code = p_error_code, last_error_message = p_error_title, retryable = false
     where id = m.id;
  elsif v_rank_new > v_rank_old then
    update public.whatsapp_messages set status = p_status,
           sent_at = case when p_status = 'sent' then coalesce(p_event_at, now()) else sent_at end,
           delivered_at = case when p_status = 'delivered' then coalesce(p_event_at, now()) else delivered_at end,
           read_at = case when p_status = 'read' then coalesce(p_event_at, now()) else read_at end
     where id = m.id;
  end if;
  -- first confirmed delivery of a TEST message = the "controlled delivery" readiness check
  if p_status in ('delivered', 'read') and m.is_test then
    update public.whatsapp_config set controlled_delivery_at = coalesce(controlled_delivery_at, now()) where id = 1;
  end if;
  return 'recorded';
end;
$function$;

-- ───────────────────────────── 11. Sevak's own opt-in (Profile screen) ─────────────────────────────
create or replace function public.get_my_whatsapp_status()
returns table (org_enabled boolean, opted_in boolean, consent_at timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(ws.enabled, false),
         case when wp.opted_out_at is not null then false
              when coalesce(wp.opted_in, false) then true
              else coalesce(ws.consent_mode = 'group' and ws.group_consent_at is not null, false) end,
         coalesce(wp.consent_at, ws.group_consent_at)
    from public.profiles p
    left join public.whatsapp_org_settings ws on ws.organization_id = p.organization_id
    left join public.whatsapp_preferences wp on wp.user_id = p.id
   where p.id = auth.uid()
$$;

create or replace function public.set_my_whatsapp_opt_in(p_opt_in boolean)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  select organization_id into v_org from public.profiles where id = auth.uid();
  if v_org is null then raise exception 'No organisation found'; end if;
  if p_opt_in and not exists (select 1 from public.whatsapp_org_settings where organization_id = v_org and enabled) then
    raise exception 'WhatsApp reminders are not available for your group yet';
  end if;
  insert into public.whatsapp_preferences (user_id, organization_id, opted_in, consent_at, consent_source, opted_out_at)
  values (auth.uid(), v_org, p_opt_in, case when p_opt_in then now() end, case when p_opt_in then 'sevak_app' end,
          case when p_opt_in then null else now() end)
  on conflict (user_id) do update
    set opted_in = excluded.opted_in,
        consent_at = case when excluded.opted_in then now() else public.whatsapp_preferences.consent_at end,
        consent_source = case when excluded.opted_in then 'sevak_app' else public.whatsapp_preferences.consent_source end,
        opted_out_at = case when excluded.opted_in then null else now() end,
        organization_id = v_org, updated_at = now();
  -- opting out cancels anything still waiting
  if not p_opt_in then
    update public.whatsapp_messages set status = 'cancelled', cancel_reason = 'Sevak opted out', locked_at = null
     where user_id = auth.uid() and status = 'queued';
  end if;
  return p_opt_in;
end;
$function$;

revoke all on function public.whatsapp_enqueue_due(uuid), public.whatsapp_claim_batch(integer), public.whatsapp_recheck(bigint),
  public.whatsapp_record_event(text, text, timestamptz, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.get_my_whatsapp_status(), public.set_my_whatsapp_opt_in(boolean) from public, anon;
grant execute on function public.get_my_whatsapp_status(), public.set_my_whatsapp_opt_in(boolean) to authenticated;
