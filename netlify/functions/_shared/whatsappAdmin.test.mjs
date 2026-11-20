// Tests for the Super Admin WhatsApp actions (who may do what). Uses a tiny fake Supabase client; no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whatsappAdmin } from './whatsappAdmin.js';

// Every query on `table` resolves to tables[table] ({ data, error }); writes are recorded.
function fakeSb(tables = {}, writes = []) {
    const builder = (table) => {
        const result = () => tables[table] ?? { data: null, error: null };
        const b = {
            select: () => b, eq: () => b, gte: () => b, lte: () => b, order: () => b, limit: () => b,
            maybeSingle: async () => result(), single: async () => result(),
            update: (v) => { writes.push({ table, op: 'update', v }); return b; },
            upsert: async (v) => { writes.push({ table, op: 'upsert', v }); return { error: null }; },
            insert: async (v) => { writes.push({ table, op: 'insert', v }); return { error: null }; },
            then: (res, rej) => Promise.resolve(result()).then(res, rej),
        };
        return b;
    };
    return { from: builder };
}
const owner = { email: 'owner@example.com' };

test('only the platform owner can use WhatsApp actions (brand-scoped admins are refused)', async () => {
    await assert.rejects(() => whatsappAdmin(fakeSb(), owner, { all: false, brands: ['ssg'] }, { action: 'wa_overview' }), /Only the platform owner/);
});

test('before the migration is applied, the screen gets { migrated: false } instead of an error', async () => {
    const sb = fakeSb({ whatsapp_config: { data: null, error: { message: 'relation "public.whatsapp_config" does not exist' } } });
    assert.deepEqual(await whatsappAdmin(sb, owner, { all: true }, { action: 'wa_overview' }), { migrated: false });
});

test('production mode cannot be switched on while the Meta sender is still in review', async () => {
    const sb = fakeSb({ whatsapp_config: { data: { sender_name_status: 'PENDING_REVIEW', template_status: 'APPROVED', webhook_verified_at: null, controlled_delivery_at: null }, error: null } });
    await assert.rejects(() => whatsappAdmin(sb, owner, { all: true }, { action: 'wa_set_global', productionMode: true }), /Production mode stays off/);
});

test('a permanent Meta failure cannot be retried', async () => {
    const sb = fakeSb({ whatsapp_messages: { data: { id: 5, status: 'failed', retryable: false, expires_at: new Date(Date.now() + 3600e3).toISOString() }, error: null } });
    await assert.rejects(() => whatsappAdmin(sb, owner, { all: true }, { action: 'wa_retry', messageId: 5 }), /permanent/);
});

test('switching a group off cancels its queued messages and is audited', async () => {
    const writes = [];
    const sb = fakeSb({ organizations: { data: { id: 'o1', name: 'G', brand: 'vseva' }, error: null } }, writes);
    await whatsappAdmin(sb, owner, { all: true }, { action: 'wa_set_org', orgId: 'o1', enabled: false });
    assert.ok(writes.some((w) => w.table === 'whatsapp_org_settings' && w.op === 'upsert' && w.v.enabled === false));
    assert.ok(writes.some((w) => w.table === 'whatsapp_messages' && w.op === 'update' && w.v.status === 'cancelled'));
    assert.ok(writes.some((w) => w.table === 'whatsapp_audit_log' && w.v.action === 'org_disabled' && w.v.actor === owner.email));
});

test('consent can only be set for a Sevak of that organisation', async () => {
    const sb = fakeSb({ profiles: { data: { id: 'u1', organization_id: 'other-org' }, error: null } });
    await assert.rejects(() => whatsappAdmin(sb, owner, { all: true }, { action: 'wa_set_consent', orgId: 'o1', userId: 'u1', optIn: true }), /not in that organisation/);
});
