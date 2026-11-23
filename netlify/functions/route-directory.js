import { withCors } from './_shared/cors.js';
import { requireAdmin, errorResponse, HttpError } from './_shared/adminAuth.js';

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

async function publish(sb, body) {
  const upload = () => sb.storage.from(BUCKET).upload(FILE, body, {
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
    return { statusCode: 200, body: JSON.stringify({ generatedAt, stats: doc.stats }) };
  } catch (err) {
    return errorResponse(err);
  }
}

export const handler = withCors(rawHandler);
export { buildDirectory }; // also used by scripts to preview the file without publishing
