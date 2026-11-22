import { supabase } from './supabase';
import { expireWhere, setFreshnessGate, CACHE_REFRESHED_EVENT, type FreshnessCheck } from './requestCache';

// Keeps the data saved on the device until it really changes (docs/performance-plan.md, Phase 2).
//
// The server keeps one tiny row per group: when its members, Vihar entries, routes, contacts, settings,
// upcoming Vihar alerts and incidents last changed (public.org_data_versions, kept up to date by triggers;
// scripts/perf_read_rpcs_and_versions.sql). This asks for that row (about 200 bytes) when the app opens, when
// it comes back to the screen, every 2 minutes while it is on screen, and when you move between pages (at most
// every 20 s). Only the kinds of data that changed since last time are refreshed; everything else is used
// straight from the device with no request at all, even after the app is closed and reopened.
//
// If the check can't run (offline, older database, a Super Admin without a group), nothing breaks: the
// cache falls back to its normal timers.

export type DataKind = 'members' | 'entries' | 'routes' | 'contacts' | 'settings' | 'alerts' | 'incidents';
type Versions = Record<DataKind, number>;

// Which cache keys (services/dataService.ts and the other services) hold each kind of data.
const KIND_PREFIXES: Record<DataKind, string[]> = {
  members: [
    'profile:', 'orgSevaks:', 'allOrgUsers:', 'sevakNameMap:', 'sevakAvatarMap:', 'orgRoster:', 'orgRosterForStats:',
    'totalOrgSevaks:', 'orgSevakContacts:', 'dashboardStats:', 'topSevaks:', 'sevakRank:', 'avatarUrl:',
    'yearlyGoal:', 'myCaptainName',
  ],
  entries: [
    'entries:', 'entriesForRanking:', 'sevakEntries:', 'myViharEntries:', 'pendingViharEntries:', 'sevakRank:',
    'dashboardStats:', 'topSevaks:',
  ],
  routes: ['routes:', 'placeAliases:', 'distance:'],
  contacts: ['contactNumbers:'],
  settings: ['org:', 'sankalp:org:', 'reminders:'],
  alerts: ['upcomingVihars:'],
  incidents: ['incidentReports:'],
};
const KINDS = Object.keys(KIND_PREFIXES) as DataKind[];
const ALL_PREFIXES = KINDS.flatMap(k => KIND_PREFIXES[k]);

const MIN_GAP_MS = 20_000;
const POLL_MS = 2 * 60_000;

let userId: string | null = null;
let orgId: string | null = null;
let lastRun = 0;
let lastOk = false;
let inflight: Promise<boolean> | null = null;
let poll: number | undefined;

const storeKey = () => `vseva:dataVersions:${userId}:${orgId}`;

function readStored(): Versions | null {
  try {
    const raw = localStorage.getItem(storeKey());
    return raw ? (JSON.parse(raw) as Versions) : null;
  } catch { return null; }
}

function writeStored(v: Versions): void {
  try { localStorage.setItem(storeKey(), JSON.stringify(v)); } catch { /* optional */ }
}

const matchesKinds = (kinds: DataKind[]) => {
  const prefixes = kinds.flatMap(k => KIND_PREFIXES[k]);
  return (key: string) => prefixes.some(p => key.startsWith(p));
};

// Marks these kinds of data out of date on this device and tells open screens to re-read
// (they keep showing the old copy until the fresh one arrives).
export function expireKinds(kinds: DataKind[]): void {
  if (!kinds.length) return;
  expireWhere(matchesKinds(kinds));
  window.dispatchEvent(new CustomEvent(CACHE_REFRESHED_EVENT, { detail: { kinds } }));
}

// A saved copy may be used without a request when the last check succeeded and the key is one this
// check covers (changed kinds were already marked out of date, which this cache then refuses).
const freshness: FreshnessCheck = key => lastOk && ALL_PREFIXES.some(p => key.startsWith(p));

async function runCheck(force: boolean): Promise<boolean> {
  if (!orgId) return false;
  if (inflight) return inflight;
  if (!force && Date.now() - lastRun < MIN_GAP_MS) return lastOk;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { lastOk = false; return false; }
  lastRun = Date.now();
  const forOrg = orgId;
  inflight = (async () => {
    try {
      const { data, error } = await supabase.rpc('get_org_versions', { p_org: forOrg });
      if (error || !data || forOrg !== orgId) { lastOk = false; return false; }
      const next = data as Versions;
      const prev = readStored();
      const changed = KINDS.filter(k => !prev || prev[k] !== next[k]);
      writeStored(next);
      lastOk = true;
      expireKinds(changed);
      return true;
    } catch {
      lastOk = false;
      return false;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

const onVisible = () => { if (document.visibilityState === 'visible') void runCheck(false); };
const onOnline = () => { void runCheck(true); };

// Start once the signed-in user and their group are known, before screens load their data.
export function startDataSync(nextUserId: string, nextOrgId: string | null | undefined): void {
  if (!nextOrgId) { stopDataSync(); return; }
  if (userId === nextUserId && orgId === nextOrgId && poll !== undefined) return;
  stopDataSync();
  userId = nextUserId;
  orgId = nextOrgId;
  lastRun = 0;
  lastOk = false;
  const first = runCheck(true);
  setFreshnessGate(first.then(() => freshness, () => null));
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);
  poll = window.setInterval(() => { if (document.visibilityState === 'visible') void runCheck(false); }, POLL_MS);
}

export function stopDataSync(): void {
  if (poll !== undefined) window.clearInterval(poll);
  poll = undefined;
  document.removeEventListener('visibilitychange', onVisible);
  window.removeEventListener('online', onOnline);
  setFreshnessGate(null);
  userId = null;
  orgId = null;
  lastOk = false;
}

// Moving to another page: a cheap check (at most every 20 s) so the page opens on current data.
export function touchDataSync(): void {
  void runCheck(false);
}
