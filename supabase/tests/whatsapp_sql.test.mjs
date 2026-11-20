// Database tests for scripts/whatsapp_reminders.sql, run on PGlite (real Postgres in WebAssembly, local only).
// They load the REAL send_inactivity_reminders() from scripts/vihar_reminders_daily.sql, so the WhatsApp days
// count is checked against the app's existing reminder logic, not a copy of it.   Run: npm run test:whatsapp
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const root = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

// Minimal stand-ins for the parts of the vSeva schema the WhatsApp SQL touches.
const STUBS = `
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create role authenticated; create role anon;
create table organizations (id uuid primary key, name text);
create table profiles (id uuid primary key, organization_id uuid references organizations(id), username text unique, full_name text,
  mobile text, role text, is_active boolean default true, created_at timestamptz default now());
create table vihar_entries (id bigint generated always as identity primary key, organization_id uuid, vihar_date date, sevaks text[], status text);
create table notifications (id bigint generated always as identity primary key, user_id uuid, organization_id uuid, type text,
  title text, message text, payload jsonb, is_read boolean default false, created_at timestamptz default now());
create table org_reminder_settings (organization_id uuid primary key, enabled boolean default true, days int[] default '{5,7,15}',
  message text default 'Kindly Join In Seva', banner text default 'walks-on', updated_at timestamptz default now());
create function get_my_org_id() returns uuid language sql stable as $$ select organization_id from profiles where id = auth.uid() $$;
create function is_org_admin() returns boolean language sql stable as $$ select exists(select 1 from profiles where id = auth.uid() and role = 'admin') $$;
`;

// Only the daily function from the existing file (its cron/alter statements need Supabase extensions).
const existingReminder = (() => {
  const s = read('scripts/vihar_reminders_daily.sql');
  const start = s.indexOf('create or replace function public.send_inactivity_reminders');
  const end = s.indexOf('$function$;', start) + '$function$;'.length;
  return s.slice(start, end);
})();

const ORG_A = '00000000-0000-0000-0000-00000000000a'; // WhatsApp ON
const ORG_B = '00000000-0000-0000-0000-00000000000b'; // WhatsApp OFF
const U = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`;
let db;
const q = async (sql, params) => (await db.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];

before(async () => {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(existingReminder);
  await db.exec(read('scripts/whatsapp_reminders.sql'));

  // Today in India is inside the Vihar Year (these tests are only meaningful outside Chaturmas, 14 Jul – 13 Oct).
  const { inside } = await one(`select not (extract(month from (now() at time zone 'Asia/Kolkata')) between 8 and 9
     or ((now() at time zone 'Asia/Kolkata')::date between make_date(extract(year from now())::int, 7, 14) and make_date(extract(year from now())::int, 10, 13))) as inside`);
  if (!inside) throw new Error('Run these tests outside Chaturmas (the existing reminder sends nothing then)');

  await db.exec(`insert into organizations values ('${ORG_A}', 'Group A'), ('${ORG_B}', 'Group B');`);
  const d = (n) => `((now() at time zone 'Asia/Kolkata')::date - ${n})`;
  const ts = (n) => `(now() - interval '${n} days')`;
  // id, org, username, name, mobile, joined-days-ago
  const people = [
    [1, ORG_A, 'a.seven', 'Asha Seven', '98765 00001', 200],   // last approved Vihar 7 days ago  → tier 7
    [2, ORG_A, 'b.pending', 'Bina Pending', '9876500002', 200], // only a PENDING Vihar            → counts as no Vihar
    [3, ORG_A, 'c.rejected', 'Chirag Rejected', '9876500003', 200], // only a REJECTED Vihar        → counts as no Vihar
    [4, ORG_A, 'd.recent', 'Dev Recent', '9876500004', 200],    // approved Vihar 2 days ago       → not due
    [5, ORG_A, 'e.new', 'Esha New', '9876500005', 6],           // no Vihar, joined 6 days ago     → tier 5, days 6
    [6, ORG_A, 'f.optout', 'Farhan Optout', '9876500006', 200], // opted out
    [7, ORG_A, 'g.badphone', 'Gita Badphone', '12345', 200],    // invalid number
    [8, ORG_A, 'h.noconsent', 'Hari Noconsent', '9876500008', 200], // never opted in
    [9, ORG_B, 'i.otherorg', 'Isha Otherorg', '9876500009', 200],   // group with WhatsApp OFF
  ];
  for (const [n, org, user, name, mobile, joined] of people) {
    await db.query(`insert into profiles (id, organization_id, username, full_name, mobile, role, created_at) values ($1,$2,$3,$4,$5,'sevak', ${ts(joined)})`, [U(n), org, user, name, mobile]);
  }
  await db.exec(`
    insert into vihar_entries (organization_id, vihar_date, sevaks, status) values
      ('${ORG_A}', ${d(7)}, '{a.seven}', 'approved'),
      ('${ORG_A}', ${d(1)}, '{b.pending}', 'pending'),
      ('${ORG_A}', ${d(1)}, '{c.rejected}', 'rejected'),
      ('${ORG_A}', ${d(2)}, '{d.recent}', 'approved'),
      ('${ORG_B}', ${d(7)}, '{i.otherorg}', 'approved');
    insert into whatsapp_org_settings (organization_id, enabled, daily_limit, min_days_between, send_time) values ('${ORG_A}', true, 100, 3, '00:00');
    insert into whatsapp_preferences (user_id, organization_id, opted_in, consent_at, consent_source) values
      ('${U(1)}', '${ORG_A}', true, now(), 'sevak_app'), ('${U(2)}', '${ORG_A}', true, now(), 'sevak_app'),
      ('${U(3)}', '${ORG_A}', true, now(), 'sevak_app'), ('${U(4)}', '${ORG_A}', true, now(), 'sevak_app'),
      ('${U(5)}', '${ORG_A}', true, now(), 'sevak_app'), ('${U(7)}', '${ORG_A}', true, now(), 'sevak_app'),
      ('${U(9)}', '${ORG_B}', true, now(), 'sevak_app');
    insert into whatsapp_preferences (user_id, organization_id, opted_in, opted_out_at) values ('${U(6)}', '${ORG_A}', false, now());
  `);
  // the existing daily reminder run (unchanged), exactly as pg_cron calls it
  await q('select public.send_inactivity_reminders()');
});

test('existing reminder run: pending and rejected Vihars do not count; recent Vihar is not due', async () => {
  const rows = await q(`select p.username, (n.payload->>'days_since')::int as days, (n.payload->>'tier')::int as tier
    from notifications n join profiles p on p.id = n.user_id where n.type = 'inactivity' order by p.username`);
  const by = Object.fromEntries(rows.map((r) => [r.username, r]));
  assert.equal(by['a.seven'].days, 7);
  assert.equal(by['a.seven'].tier, 7);
  assert.equal(by['e.new'].days, 6);
  assert.equal(by['e.new'].tier, 5);
  assert.ok(by['b.pending'], 'pending-only Sevak is reminded (pending is not a completed Vihar)');
  assert.ok(by['c.rejected'], 'rejected-only Sevak is reminded');
  assert.equal(by['d.recent'], undefined, 'Vihar 2 days ago is not due');
});

test('enqueue: only the switched-on group, consenting Sevaks with valid numbers', async () => {
  const n = (await one('select public.whatsapp_enqueue_due() as n')).n;
  const users = (await q(`select p.username from whatsapp_messages m join profiles p on p.id = m.user_id order by 1`)).map((r) => r.username);
  assert.deepEqual(users, ['a.seven', 'b.pending', 'c.rejected', 'e.new']);
  assert.equal(n, 4);
  assert.ok(!users.includes('f.optout'), 'opted out');
  assert.ok(!users.includes('g.badphone'), 'invalid phone');
  assert.ok(!users.includes('h.noconsent'), 'no consent');
  assert.ok(!users.includes('i.otherorg'), 'group with WhatsApp off');
  assert.equal((await one(`select phone_status from whatsapp_preferences where user_id = '${U(7)}'`)).phone_status, 'invalid');
});

test('enqueue: {{2}} days equals the push notification\'s days_since for every job; {{1}} is the name', async () => {
  const rows = await q(`select m.template_params, n.payload->>'days_since' as days, p.full_name, m.phone_e164, m.template_name, m.template_language
    from whatsapp_messages m join notifications n on n.id::text = m.notification_id join profiles p on p.id = m.user_id`);
  for (const r of rows) {
    assert.equal(r.template_params[1], r.days);
    assert.equal(r.template_params[0], r.full_name);
    assert.match(r.phone_e164, /^91[6-9]\d{9}$/);
    assert.equal(r.template_name, 'vihar_reminder');
    assert.equal(r.template_language, 'hi');
  }
});

test('enqueue: running again creates no duplicate jobs', async () => {
  assert.equal((await one('select public.whatsapp_enqueue_due() as n')).n, 0);
  assert.equal((await one('select count(*)::int as c from whatsapp_messages')).c, 4);
});

test('claim: a job is handed to one worker only; a second claim gets nothing', async () => {
  const first = await q('select id, status from public.whatsapp_claim_batch(2)');
  const second = await q('select id from public.whatsapp_claim_batch(2)');
  const third = await q('select id from public.whatsapp_claim_batch(10)');
  assert.equal(first.length, 2);
  assert.ok(first.every((r) => r.status === 'sending'));
  const ids = new Set([...first, ...second, ...third].map((r) => Number(r.id)));
  assert.equal(ids.size, first.length + second.length + third.length, 'no job claimed twice');
  assert.equal((await q('select id from public.whatsapp_claim_batch(10)')).length, 0);
});

test('recheck: a newly approved Vihar, an opt-out or the group switched off cancels the send', async () => {
  const job = (u) => one(`select id from whatsapp_messages where user_id = '${U(u)}'`);
  assert.equal((await one(`select public.whatsapp_recheck(${(await job(5)).id}) as r`)).r, null);

  await db.exec(`insert into vihar_entries (organization_id, vihar_date, sevaks, status) values ('${ORG_A}', (now() at time zone 'Asia/Kolkata')::date, '{a.seven}', 'approved')`);
  assert.equal((await one(`select public.whatsapp_recheck(${(await job(1)).id}) as r`)).r, 'new approved Vihar');

  await db.exec(`insert into vihar_entries (organization_id, vihar_date, sevaks, status) values ('${ORG_A}', (now() at time zone 'Asia/Kolkata')::date, '{b.pending}', 'pending')`);
  assert.equal((await one(`select public.whatsapp_recheck(${(await job(2)).id}) as r`)).r, null, 'a pending Vihar does not cancel');

  await db.exec(`select set_config('test.uid', '${U(3)}', false)`);
  await q('select public.set_my_whatsapp_opt_in(false)');
  await db.exec(`select set_config('test.uid', '', false)`);
  assert.equal((await one(`select public.whatsapp_recheck(${(await job(3)).id}) as r`)).r, 'no WhatsApp consent');

  await db.exec(`update whatsapp_org_settings set enabled = false where organization_id = '${ORG_A}'`);
  assert.equal((await one(`select public.whatsapp_recheck(${(await job(5)).id}) as r`)).r, 'organisation switched off');
  await db.exec(`update whatsapp_org_settings set enabled = true where organization_id = '${ORG_A}'`);
});

test('opt-in: a Sevak cannot opt in while their group is switched off', async () => {
  await db.exec(`select set_config('test.uid', '${U(9)}', false)`);
  await assert.rejects(() => q('select public.set_my_whatsapp_opt_in(true)'), /not available for your group/);
  await db.exec(`select set_config('test.uid', '${U(5)}', false)`);
  assert.deepEqual(await one('select org_enabled, opted_in from public.get_my_whatsapp_status()'), { org_enabled: true, opted_in: true });
  await db.exec(`select set_config('test.uid', '', false)`);
});

test('webhook events: forward-only status, duplicates ignored, failures recorded, unknown ids safe', async () => {
  const id = (await one(`select id from whatsapp_messages where user_id = '${U(5)}'`)).id;
  await db.exec(`update whatsapp_messages set status = 'accepted', meta_message_id = 'wamid.E' where id = ${id}`);
  const ev = async (s, t, code = null) => (await one(`select public.whatsapp_record_event('wamid.E', $1, to_timestamp($2), $3, null, null) as r`, [s, t, code])).r;
  assert.equal(await ev('sent', 100), 'recorded');
  assert.equal(await ev('sent', 100), 'duplicate');
  assert.equal(await ev('read', 300), 'recorded');
  assert.equal(await ev('delivered', 200), 'recorded'); // arrives late
  const m = await one(`select status, sent_at is not null as s, read_at is not null as r from whatsapp_messages where id = ${id}`);
  assert.deepEqual(m, { status: 'read', s: true, r: true }, 'a late "delivered" does not move read back');
  assert.equal((await one(`select count(*)::int as c from whatsapp_events where meta_message_id = 'wamid.E'`)).c, 3);
  assert.equal((await one(`select public.whatsapp_record_event('wamid.unknown', 'delivered', now()) as r`)).r, 'unknown message');
  assert.equal((await one(`select public.whatsapp_record_event('wamid.E', 'deleted', now()) as r`)).r, 'ignored status');

  const id2 = (await one(`select id from whatsapp_messages where user_id = '${U(2)}'`)).id;
  await db.exec(`update whatsapp_messages set status = 'accepted', meta_message_id = 'wamid.F' where id = ${id2}`);
  await q(`select public.whatsapp_record_event('wamid.F', 'failed', now(), '131026', 'Message undeliverable')`);
  assert.deepEqual(await one(`select status, last_error_code, retryable from whatsapp_messages where id = ${id2}`), { status: 'failed', last_error_code: '131026', retryable: false });
  assert.equal((await one('select controlled_delivery_at from whatsapp_config')).controlled_delivery_at, null, 'only a TEST delivery counts as the controlled delivery');
});

test('controlled delivery: a delivered TEST message marks the readiness check', async () => {
  await db.exec(`insert into whatsapp_messages (organization_id, phone_e164, template_name, template_language, template_params, is_test, status, meta_message_id, expires_at)
    values ('${ORG_A}', '919876500001', 'vihar_reminder', 'hi', '["Test","7"]', true, 'accepted', 'wamid.T', now() + interval '1 day')`);
  await q(`select public.whatsapp_record_event('wamid.T', 'delivered', now())`);
  assert.notEqual((await one('select controlled_delivery_at from whatsapp_config')).controlled_delivery_at, null);
});

test('limits: per-group daily cap and the WhatsApp repeat gap are respected; expired jobs never send', async () => {
  // fresh day's notifications for a capped group
  await db.exec(`
    delete from whatsapp_messages where not is_test;
    update whatsapp_org_settings set daily_limit = 1 where organization_id = '${ORG_A}';
    update whatsapp_preferences set opted_in = true, opted_out_at = null where user_id = '${U(3)}';
    update whatsapp_preferences set last_reminder_at = now() - interval '1 day' where user_id = '${U(2)}';`);
  const n = (await one('select public.whatsapp_enqueue_due() as n')).n;
  assert.equal(n, 1, 'daily_limit = 1');
  const queued = (await q(`select user_id from whatsapp_messages where not is_test`)).map((r) => r.user_id);
  assert.ok(!queued.includes(U(2)), 'reminded yesterday, gap is 3 days');

  await db.exec(`update whatsapp_messages set expires_at = now() - interval '1 minute', status = 'queued' where not is_test`);
  assert.equal((await q('select id from public.whatsapp_claim_batch(10)')).length, 0);
  assert.equal((await one(`select count(*)::int as c from whatsapp_messages where status = 'expired'`)).c, 1);
});

test('isolation: nothing is ever queued for a group the super-admin has not switched on', async () => {
  assert.equal((await one(`select count(*)::int as c from whatsapp_messages where organization_id = '${ORG_B}'`)).c, 0);
  assert.ok((await one(`select count(*)::int as c from notifications where organization_id = '${ORG_B}' and type = 'inactivity'`)).c > 0,
    'the group still gets its normal push reminder; WhatsApp is simply not added');
});

test('group consent: every Sevak counts as agreed (no opt-in needed) except those who opted out', async () => {
  await db.exec(`
    delete from whatsapp_messages where not is_test;
    update whatsapp_org_settings set daily_limit = 100, min_days_between = 0 where organization_id = '${ORG_A}';
    update whatsapp_preferences set last_reminder_at = null;`);
  // switched on but not yet confirmed: still opt-in only, so the Sevak who never opted in is skipped
  await q('select public.whatsapp_enqueue_due()');
  let users = (await q(`select p.username from whatsapp_messages m join profiles p on p.id = m.user_id where not m.is_test`)).map((r) => r.username);
  assert.ok(!users.includes('h.noconsent'));

  await db.exec(`delete from whatsapp_messages where not is_test;
    update whatsapp_org_settings set consent_mode = 'group', group_consent_at = now(), group_consent_by = 'owner' where organization_id = '${ORG_A}';`);
  await q('select public.whatsapp_enqueue_due()');
  users = (await q(`select p.username from whatsapp_messages m join profiles p on p.id = m.user_id where not m.is_test`)).map((r) => r.username);
  assert.ok(users.includes('h.noconsent'), 'never opted in, covered by group consent');
  assert.ok(!users.includes('f.optout'), 'opted out stays out');
  assert.ok(!users.includes('g.badphone'), 'invalid number stays out');

  const hJob = (await one(`select id from whatsapp_messages where user_id = '${U(8)}'`)).id;
  assert.equal((await one(`select public.whatsapp_recheck(${hJob}) as r`)).r, null);
  await db.exec(`select set_config('test.uid', '${U(8)}', false)`);
  assert.equal((await one('select opted_in from public.get_my_whatsapp_status()')).opted_in, true, 'the Profile card shows it switched on');
  await q('select public.set_my_whatsapp_opt_in(false)');
  await db.exec(`select set_config('test.uid', '', false)`);
  assert.equal((await one(`select status from whatsapp_messages where id = ${hJob}`)).status, 'cancelled', 'turning it off cancels the waiting message');

  await db.exec(`update whatsapp_org_settings set consent_mode = 'opt_in', group_consent_at = null where organization_id = '${ORG_A}'`);
  const eJob = (await one(`select id from whatsapp_messages where user_id = '${U(5)}'`)).id;
  assert.equal((await one(`select public.whatsapp_recheck(${eJob}) as r`)).r, null, 'own opt-in still counts after group consent is removed');
});
