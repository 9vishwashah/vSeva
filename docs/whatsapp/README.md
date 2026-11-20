# vSeva – WhatsApp Vihar reminders

Status (15 Nov 2026): **application side built and tested locally. Nothing deployed, no migration applied,
no message sent.** Meta's review of the sender display name is still **IN REVIEW**.

## What it does

A Sevak gets the approved WhatsApp template `vihar_reminder` **only if all of these hold**:

1. The **super-admin switched WhatsApp on for their group**: Super Admin → organisation → *WhatsApp reminders*.
   Every other group sends nothing (cost control). Captains and brand-scoped admins cannot switch it on.
2. The existing reminder run made a reminder for them today (same rules as the push reminder, see below).
3. They have **consent** and have not opted out: either **group consent** (see below) or their own opt-in.
4. Their number is a valid Indian mobile.
5. The **server-side production gate** passes (see *Go-live*).
6. Per-group limits allow it: max messages a day, and an optional extra gap in days between WhatsApps to one Sevak (default 0, so WhatsApp follows the Captain's days exactly).

### Consent

WhatsApp's Business Policy requires that people agreed to receive a business's WhatsApp messages. The API does not
block messages without it, but unexpected messages get blocked or reported, which lowers vSeva's quality rating and
messaging limits; India's DPDP Act also expects consent. So consent is kept, but Sevaks do not have to do anything:

- **Group consent (recommended, the default way):** in Super Admin → organisation → WhatsApp, turn on *Group consent*
  once the Captain has told the group that vSeva sends Vihar reminders on WhatsApp. Every Sevak, existing and new,
  then counts as agreed. Your email and the date are stored as the consent record (`group_consent_by/at`, audit log).
- **Opting out always works:** a Sevak can switch it off in Profile (the card shows it on by default), you can switch
  a Sevak off in the panel, and a Sevak who blocks marketing messages in WhatsApp is opted out automatically (131050).
- **Opt-in only:** with group consent off, only Sevaks who switch it on themselves (or you record) receive messages.

### The days count matches the app exactly

WhatsApp does **not** calculate inactivity itself. The existing `send_inactivity_reminders()` (09:00 IST,
`scripts/vihar_reminders_daily.sql`, unchanged) decides who is due and writes `notifications` rows of type
`inactivity` with `payload.days_since`. `whatsapp_enqueue_due()` turns *today's* rows into WhatsApp jobs and copies
`days_since` into `{{2}}`. So the WhatsApp message always says the same number of days as the push, and follows the
same rules:

- latest **approved** Vihar (pending and rejected never count);
- a Sevak with no Vihar is counted from the day they were added;
- never counted from before this Vihar Year's 14 October; nothing in Chaturmas;
- the Captain's up-to-3 reminder days (e.g. 5, 7, 15), each once per quiet spell.

Right before sending, `whatsapp_recheck()` cancels the job if the group was switched off, the Sevak opted out or
became inactive, or a Vihar was approved after the quiet spell began. Jobs expire at the end of their India day, so a
stale day count is never sent tomorrow. Push and in-app notifications are untouched: WhatsApp only reads them.

## Files

| Path | What |
|---|---|
| `scripts/whatsapp_reminders.sql` | Migration (additive): tables, enqueue / claim / recheck / webhook-event functions, Sevak opt-in RPCs |
| `scripts/whatsapp_reminders_cron.sql` | pg_cron schedule (apply last, at go-live) |
| `scripts/whatsapp_reminders_rollback.sql` | Removes only the WhatsApp objects |
| `supabase/functions/whatsapp-worker/` | Edge Function: readiness check, sending, test sends |
| `supabase/functions/whatsapp-webhook/` | Edge Function: Meta webhook (verification, signature, statuses) |
| `supabase/functions/_shared/whatsapp/` | Graph client, template, gate, retries, phone, webhook parsing (+ unit tests) |
| `supabase/config.toml` | Both functions authenticate themselves (`verify_jwt = false`) |
| `supabase/tests/whatsapp_sql.test.mjs` | Database tests on PGlite, using the real reminder function |
| `netlify/functions/_shared/whatsappAdmin.js` | Super Admin actions (`wa_*`), platform owner only (+ tests) |
| `components/WhatsAppAdminPanel.tsx` | Super Admin → organisation → WhatsApp section |
| `components/WhatsAppOptInCard.tsx` | Sevak Profile opt-in (only shown when the group is switched on) |
| `docs/whatsapp/vSeva-WhatsApp.postman_collection.json` | Postman collection (variables, no tokens) |

Run the tests: `npm run test:whatsapp` (36 tests; Meta is always mocked; nothing is sent).

## Database (proposed, not applied)

- `whatsapp_config`: one row with the global switches, template, and readiness read from Meta
  (sender name status, template status, webhook verified, controlled delivery, last gate result).
- `whatsapp_org_settings`: per group `enabled` (super-admin only), `daily_limit`, `min_days_between`,
  `send_time`, `timezone`. The inactivity days are *not* here: they stay in `org_reminder_settings`.
- `whatsapp_preferences`: per Sevak opt-in, consent time and source, opt-out time, reminders on/off,
  phone validity, last WhatsApp time.
- `whatsapp_messages`: the queue. `notification_id` is unique (one WhatsApp per reminder); `meta_message_id` unique;
  status `queued → sending → accepted → sent → delivered → read`, or `failed` / `cancelled` / `expired`.
- `whatsapp_events`: delivery log with a unique `dedupe_key` (Meta re-sends webhooks). No phone numbers stored.
- `whatsapp_audit_log`: every super-admin WhatsApp action.

RLS is on for all of them. Clients can read only their own preference row and their group's on/off flag; every write
goes through the service role (Netlify / Edge Functions) or the Sevak's own `set_my_whatsapp_opt_in`.
Concurrent workers cannot send the same job: `whatsapp_claim_batch` uses `FOR UPDATE SKIP LOCKED`.

## Secrets

Supabase → Edge Functions → Secrets (never in the app, never in git):

| Secret | Value |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | System User token for the VSeva app (not Little Bunnies) |
| `WHATSAPP_PHONE_NUMBER_ID` | `1452234317984360` |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | `1691237689298935` |
| `WHATSAPP_VERIFY_TOKEN` | a long random string you choose; the same goes into Meta's webhook settings |
| `WHATSAPP_APP_SECRET` | VSeva app → Settings → Basic → App Secret |
| `WHATSAPP_API_VERSION` | `v25.0` (check it is still supported before deploying) |
| `WHATSAPP_CRON_SECRET` | a long random string; also set in Netlify env and in Vault (`whatsapp_cron_secret`) |
| `WHATSAPP_AUTOMATION_ENABLED` | `false` (until go-live) |
| `WHATSAPP_TEST_MODE` | `true` (until go-live) |
| `WHATSAPP_PRODUCTION_MODE` | `false` (until go-live) |
| `WHATSAPP_TEST_RECIPIENTS` | comma-separated test numbers, e.g. `919XXXXXXXXX` |
| `WHATSAPP_MAX_BATCH` / `WHATSAPP_MAX_PER_SECOND` | optional, default 25 and 5 |

Netlify environment: `WHATSAPP_CRON_SECRET` (same value), so Super Admin can refresh status and send a test.

## Deploy (each step needs the owner's go-ahead)

1. **Migration:** review then run `scripts/whatsapp_reminders.sql` in the Supabase SQL Editor.
2. **Secrets:** set the Edge Function secrets above, with automation off, test mode on and production off.
3. **Functions:** `supabase functions deploy whatsapp-webhook` and `supabase functions deploy whatsapp-worker`
   (the project's `config.toml` keeps `verify_jwt = false` for both).
4. **Webhook in Meta:** VSeva app → WhatsApp → Configuration → Callback URL
   `https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook`, Verify token = `WHATSAPP_VERIFY_TOKEN`,
   then subscribe to the **messages** field. Super Admin then shows *Webhook: Verified*.
5. **Netlify:** add `WHATSAPP_CRON_SECRET`, then push (Super Admin panel goes live; it shows "not set up" until step 1).
6. **Refresh from Meta** in Super Admin to read sender and template status.

### Go-live (production gate)

Automated sending stays blocked until **all** of these are true. The worker checks them on the server on every run,
and no organisation or browser can override them:

1. Meta display name review approved (`name_status` APPROVED / AVAILABLE_WITHOUT_REVIEW, read from Meta).
2. Correct VSeva WABA and Phone Number IDs in the secrets (anything else is refused).
3. `vihar_reminder` (hi, MARKETING) is APPROVED under the VSeva WABA (read from Meta).
4. All required secrets set.
5. Webhook verified by Meta.
6. A test message confirmed **delivered** by the webhook (send it from Super Admin → *Send test*; test mode only,
   allow-listed numbers only).
7. Secrets switched: `WHATSAPP_AUTOMATION_ENABLED=true`, `WHATSAPP_PRODUCTION_MODE=true`, `WHATSAPP_TEST_MODE=false`.
8. Super Admin: *Automation* on, then *Production mode* on (refused until 1, 3, 5 and 6 pass).
9. Super Admin: switch on the chosen organisation(s) and confirm *Group consent* for each.
10. Apply `scripts/whatsapp_reminders_cron.sql` (needs Vault secrets `whatsapp_worker_url`, `whatsapp_cron_secret`).

## Troubleshooting

- **HTTP 200 "accepted" but nothing arrived.** Accepted is not delivery. Look at the message history in Super Admin
  (or `whatsapp_events`) for the webhook's `failed` event and its Meta error code. Common: `131026` undeliverable
  (number not on WhatsApp, or the sender is not yet allowed to message it), `131049` Meta's per-user marketing cap,
  `131050` the user stopped marketing messages (they are opted out automatically), `132001` template name/language
  mismatch, `190` expired token. The original test (accepted, not received) happened while the display name was in
  review; its exact cause is still unknown until a webhook event is captured.
- **Super Admin says "not set up yet":** the migration is not applied.
- **"WhatsApp worker is not configured":** `WHATSAPP_CRON_SECRET` is missing in Netlify.
- **Nothing queued for a group:** check it is switched on, Sevaks opted in, numbers are valid, the Captain's reminders
  are on, and today is not in Chaturmas.

## Token rotation

Create a new System User token in Business Settings (VSeva app, `whatsapp_business_messaging` and
`whatsapp_business_management`), update `WHATSAPP_ACCESS_TOKEN` in Supabase secrets, run *Refresh from Meta*, then
revoke the old token. Do not touch Little Bunnies' tokens or apps.
