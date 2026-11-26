import { withCors } from './_shared/cors.js';
import { requireAdmin, errorResponse, HttpError } from './_shared/adminAuth.js';
// The verified-tick titles the app shows on profiles (Team vSeva, Developer), so the leaderboard shows them too
import accountBadges from '../../brands/vseva/accountBadges.json' with { type: 'json' };

// Public Vihar route directory (vSeva website: landing page section + /vihar-routes).
//
// POST { action: 'refresh' } (Super Admin only): reads every vSeva group's routes (Manage Routes) and its Captain,
// tidies and merges them, and publishes ONE public file to Supabase Storage:
//   <SUPABASE_URL>/storage/v1/object/public/public-data/route-directory.json
// The website only reads that file, so visitors cost no database or Netlify function requests, and the
// "Last updated" date changes only when a Super Admin refreshes. (Owner's decisions, 23 Nov 2026: every vSeva
// group's routes, Captain name and number always shown, vSeva only, manual refresh.)
//
// The Captain's number is stored lightly encoded (digits reversed, base64), decoded by the page for its Call and
// WhatsApp buttons. That only keeps it from being copied as plain text by simple scrapers; it is still public.

const BUCKET = 'public-data';
const FILE = 'route-directory.json';

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
// "KURLA WEST" -> "Kurla West", "sumatinathji jinalay, matunga central" -> "Sumatinathji Jinalay, Matunga Central"
const titleCase = (s) => clean(s).toLowerCase()
  .replace(/(^|[\s,(/.-])([a-z])/g, (_, p, c) => p + c.toUpperCase())
  .replace(/\(([a-z]{1,3})\)/gi, (_, x) => `(${x.toUpperCase()})`); // "Raigarh(MH)", not "(Mh)"
const key = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const last10 = (m) => String(m || '').replace(/\D/g, '').slice(-10);
const encodeMobile = (m) => (m ? Buffer.from(m.split('').reverse().join('')).toString('base64') : '');
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

// PostgREST returns at most 1000 rows per request: read in pages.
async function readAll(build) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) return out;
  }
}

async function buildDirectory(sb) {
  const orgs = await readAll(() => sb.from('organizations').select('id, name, city, town').is('brand', null).order('id'));
  const orgIds = orgs.map((o) => o.id);
  if (orgIds.length === 0) return { routes: [], groups: [] };

  const routes = await readAll(() =>
    sb.from('area_routes')
      .select('id, organization_id, from_name, to_name, distance_km, via, maps_url')
      .in('organization_id', orgIds)
      .order('id'));
  const captains = await readAll(() =>
    sb.from('profiles')
      .select('organization_id, full_name, mobile, created_at')
      .in('organization_id', orgIds)
      .eq('role', 'admin')
      .order('created_at'));

  // Groups that actually shared routes, each with its first Captain
  const captainOf = new Map();
  for (const c of captains) if (!captainOf.has(c.organization_id)) captainOf.set(c.organization_id, c);
  const groupIndex = new Map();
  const groups = [];
  const orgById = new Map(orgs.map((o) => [o.id, o]));
  const groupFor = (orgId) => {
    if (groupIndex.has(orgId)) return groupIndex.get(orgId);
    const o = orgById.get(orgId);
    const cap = captainOf.get(orgId);
    groups.push({
      n: clean(o?.name) || 'Vihar Seva Group',
      c: titleCase(o?.city || o?.town || ''),
      cap: titleCase(cap?.full_name || ''),
      m: encodeMobile(last10(cap?.mobile)),
    });
    groupIndex.set(orgId, groups.length - 1);
    return groups.length - 1;
  };

  // The same two places in either direction are one route: kept in the direction first shared, distance = the
  // middle of what the groups entered, and every group that walks it is listed.
  const merged = new Map();
  for (const r of routes) {
    const from = titleCase(r.from_name);
    const to = titleCase(r.to_name);
    const km = Number(r.distance_km);
    if (!from || !to || !(km > 0)) continue;
    const via = titleCase(r.via || '');
    const k = [key(from), key(to)].sort().join('|') + (via ? `|via ${key(via)}` : '');
    const g = groupFor(r.organization_id);
    const m = merged.get(k);
    if (!m) {
      merged.set(k, { from, to, kms: [km], groups: new Set([g]), via, maps: clean(r.maps_url) });
    } else {
      m.kms.push(km);
      m.groups.add(g);
      if (!m.maps && r.maps_url) m.maps = clean(r.maps_url);
    }
  }

  const out = [...merged.values()]
    .map((m) => [m.from, m.to, Math.round(median(m.kms) * 10) / 10, [...m.groups], m.via || null, m.maps || null])
    .sort((a, b) => b[3].length - a[3].length || a[0].localeCompare(b[0]));
  return { routes: out, groups };
}

async function publish(sb, body, file = FILE) {
  const upload = () => sb.storage.from(BUCKET).upload(file, body, {
    upsert: true,
    contentType: 'application/json',
    cacheControl: '300',
  });
  let { error } = await upload();
  if (error && /not found|does not exist|bucket/i.test(error.message || '')) {
    // First refresh ever: create the public bucket for website data files
    const { error: bucketError } = await sb.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ['application/json'],
      fileSizeLimit: '5MB',
    });
    if (bucketError && !/already exists/i.test(bucketError.message || '')) throw bucketError;
    ({ error } = await upload());
  }
  if (error) throw error;
}

// ---------------------------------------------------------------- public leaderboard (leaderboard.json)
// Top Vihar Sevaks and groups across every vSeva group, for the landing page. Counts approved Vihars only, for the
// current Vihar Year (14 Oct to 13 Jul; the Chaturmas months count towards the coming year, as in the app) and
// all time. A Sevak's Vihars = approved entries they are listed in; their km = the sum of those entries' distances.
// A group's Vihars = its approved entries; its km = the sum of their distances. Only names and groups are published.

// Vihar Year a date belongs to, by its start year (same rule as services/viharYear.ts)
const vyStartYear = (iso) => {
  const y = +iso.slice(0, 4), m = +iso.slice(5, 7), d = +iso.slice(8, 10);
  if (m > 10 || (m === 10 && d >= 14)) return y;
  if (m < 7 || (m === 7 && d <= 13)) return y - 1;
  return y;
};
const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const genderOf = (g) => {
  const s = String(g || '').trim().toLowerCase();
  if (s === 'female' || s === 'mahila' || g === 'સ્ત્રી') return 'F';
  if (s === 'male') return 'M';
  return '';
};
const round1 = (x) => Math.round(x * 10) / 10;
// Profile photo URL -> its path inside the public "avatars" bucket (keeps the file small); anything else is dropped
const avatarPath = (url) => {
  const m = /\/storage\/v1\/object\/public\/avatars\/([^?#]+)/.exec(String(url || ''));
  return m ? m[1] : '';
};

async function buildLeaderboard(sb) {
  const orgs = await readAll(() => sb.from('organizations').select('id, name, city, town').is('brand', null).order('id'));
  const orgIds = orgs.map((o) => o.id);
  if (!orgIds.length) return { vy: null, sevaks: [], groups: [] };
  const currentVY = vyStartYear(todayIST());

  const entries = await readAll(() =>
    sb.from('vihar_entries')
      .select('id, organization_id, vihar_date, distance_km, sevaks')
      .in('organization_id', orgIds)
      .eq('status', 'approved')
      .order('id'));
  const people = await readAll(() =>
    sb.from('profiles')
      .select('username, full_name, gender, organization_id, avatar_url')
      .in('organization_id', orgIds)
      .order('username'));

  const orgIndex = new Map(orgs.map((o, i) => [o.id, i]));
  const groups = orgs.map((o) => ({ n: clean(o.name) || 'Vihar Seva Group', c: titleCase(o.city || o.town || ''), vyV: 0, vyK: 0, allV: 0, allK: 0, vyS: new Set() }));
  const person = new Map(people.filter((p) => p.username).map((p) => [p.username, p]));
  const sevaks = new Map(); // username -> totals

  for (const e of entries) {
    const gi = orgIndex.get(e.organization_id);
    if (gi === undefined || !e.vihar_date) continue;
    const km = Number(e.distance_km) || 0;
    const inVY = vyStartYear(e.vihar_date) === currentVY;
    const g = groups[gi];
    g.allV += 1; g.allK += km;
    if (inVY) { g.vyV += 1; g.vyK += km; }
    for (const u of new Set(e.sevaks || [])) {
      const p = person.get(u);
      if (!p) continue; // only people who still have an account
      let s = sevaks.get(u);
      if (!s) { s = { n: titleCase(p.full_name || ''), g: genderOf(p.gender), o: orgIndex.get(p.organization_id) ?? gi, a: avatarPath(p.avatar_url), b: accountBadges[String(u).trim().toLowerCase()] || '', vyV: 0, vyK: 0, allV: 0, allK: 0 }; sevaks.set(u, s); }
      s.allV += 1; s.allK += km;
      if (inVY) { s.vyV += 1; s.vyK += km; g.vyS.add(u); }
    }
  }

  return {
    vy: { startYear: currentVY, label: `VY ${currentVY}-${String(currentVY + 1).slice(-2)}` },
    // [name, gender M|F|'', groupIndex, vyVihars, vyKm, allVihars, allKm, photo?, badge?]. photo is the profile photo's
    // path in the public "avatars" bucket (the page adds the bucket's address), '' when there is none; badge is the
    // verified-tick title (e.g. Team vSeva). Both are left off when a Sevak has neither.
    sevaks: [...sevaks.values()]
      .filter((s) => s.n && s.allV > 0)
      .sort((a, b) => b.allV - a.allV)
      .map((s) => [s.n, s.g, s.o, s.vyV, round1(s.vyK), s.allV, round1(s.allK), ...(s.a || s.b ? [s.a] : []), ...(s.b ? [s.b] : [])]),
    // [name, city, vyVihars, vyKm, allVihars, allKm, activeSevaksThisVY]. Every group is kept, in the same order as
    // the Sevak rows' group index refers to (the page hides groups with no Vihars).
    groups: groups.map((g) => [g.n, g.c, g.vyV, round1(g.vyK), g.allV, round1(g.allK), g.vyS.size]),
  };
}

async function rawHandler(event) {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    const { action } = JSON.parse(event.body || '{}');
    if (action !== 'refresh') throw new HttpError(400, 'Unknown action');
    const { sb } = await requireAdmin(event);

    const { routes, groups } = await buildDirectory(sb);
    const generatedAt = new Date().toISOString();
    const cities = new Set(groups.map((g) => g.c).filter(Boolean));
    const doc = {
      v: 1,
      generatedAt,
      stats: { routes: routes.length, groups: groups.length, cities: cities.size },
      groups,
      // [from, to, km, groupIndexes[], via, mapsUrl]
      routes,
    };
    await publish(sb, JSON.stringify(doc));

    // Top Vihar Sevaks / groups for the landing page, refreshed by the same button
    const board = await buildLeaderboard(sb);
    await publish(sb, JSON.stringify({ v: 1, generatedAt, ...board }), 'leaderboard.json');

    return { statusCode: 200, body: JSON.stringify({ generatedAt, stats: { ...doc.stats, sevaks: board.sevaks.length } }) };
  } catch (err) {
    return errorResponse(err);
  }
}

export const handler = withCors(rawHandler);
export { buildDirectory, buildLeaderboard }; // also used by scripts to preview the files without publishing
