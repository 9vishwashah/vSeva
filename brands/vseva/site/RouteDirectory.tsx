import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, ArrowRight, ArrowUpRight, ChevronDown, Map as MapIcon, MapPin, Phone, RefreshCw, Route, Search, SearchX, Users } from 'lucide-react';
import WhatsAppIcon from '../../../components/WhatsAppIcon';
import { getSiteData } from './siteData';

// Public Vihar route finder (landing page section + /vihar-routes). Reads the one public file published by the
// Super Admin "Refresh route directory" button (netlify/functions/route-directory.js), so it changes only then.

export interface Group { n: string; c: string; cap: string; m: string }
export type RouteRow = [string, string, number, number[], string | null, string | null]; // from, to, km, groups, via, maps
export interface Directory { v: number; generatedAt: string; stats: { routes: number; groups: number; cities: number }; groups: Group[]; routes: RouteRow[] }

const PUBLIC_SRC = `${import.meta.env.VITE_SUPABASE_URL || ''}/storage/v1/object/public/public-data/route-directory.json`;
// Local development only: point the page at a preview file (localStorage "routeDirectorySrc"), never in production.
const sourceUrl = () => {
  if (import.meta.env.DEV) {
    try { const dev = localStorage.getItem('routeDirectorySrc'); if (dev) return dev; } catch { /* ignore */ }
  }
  return PUBLIC_SRC;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// Every word typed must appear in the place name: "matunga" finds "Sumatinathji Jinalay, Matunga Central"
const matches = (name: string, q: string) => {
  const words = norm(q).split(' ').filter(Boolean);
  if (!words.length) return true;
  const n = norm(name);
  return words.every(w => n.includes(w));
};
// Groups spell the same stop differently ("Sanghani Estate Ghatkopar" / "Ghatkopar Sanghani"): two stops count as one
// when the meaningful words of the shorter name all appear in the longer one. Used to join routes (A -> X -> B).
const GENERIC = new Set(['derasar', 'jinalay', 'jain', 'mandir', 'temple', 'east', 'west', 'road', 'station', 'nagar', 'building',
  'bldg', 'apartment', 'apt', 'tower', 'society', 'shree', 'shri', 'sri', 'swamiji', 'bhagwan', 'upashray', 'sangh', 'the', 'near', 'opp', 'chs']);
const keyWords = (s: string) => norm(s).split(' ').filter(w => w.length >= 3 && !GENERIC.has(w));
const sameStop = (a: string, b: string) => {
  if (norm(a) === norm(b)) return true;
  const A = keyWords(a), B = keyWords(b);
  if (!A.length || !B.length) return false;
  const [short, long] = A.length <= B.length ? [A, B] : [B, A];
  return short.every(w => long.includes(w));
};
const decodeMobile = (m: string) => {
  try { return m ? atob(m).split('').reverse().join('') : ''; } catch { return ''; }
};
const mapsLink = (from: string, to: string, city: string, own: string | null) =>
  own || `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${encodeURIComponent(`${from}, ${city}`)}&destination=${encodeURIComponent(`${to}, ${city}`)}`;
const fmtUpdated = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; }
};

interface Shown { from: string; to: string; km: number; groups: number[]; via: string | null; maps: string | null; reverse: boolean }

// The copy the build wrote into the page (siteData.ts), if any, so the routes are in the HTML and show at once
const embeddedDirectory = (): Directory | null => getSiteData().routes || null;
let dirPromise: Promise<Directory> | null = null;
const loadDirectory = () => (dirPromise ??= fetch(sourceUrl()).then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))));

export function useDirectory() {
  const [dir, setDir] = useState<Directory | null>(embeddedDirectory);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>(() => (embeddedDirectory() ? 'ready' : 'loading'));
  useEffect(() => {
    let alive = true;
    // Also when the page carries a copy: the directory may have been refreshed since this page was built
    loadDirectory()
      .then(d => { if (alive && (!dir || d.generatedAt !== dir.generatedAt)) { setDir(d); setState('ready'); } })
      .catch(() => { dirPromise = null; if (alive && !dir) setState('missing'); });
    return () => { alive = false; };
  }, []);
  return { dir, state };
}

/* ───────────── One route ───────────── */

const ContactCaptain: React.FC<{ group: Group; from: string; to: string }> = ({ group, from, to }) => {
  const mobile = decodeMobile(group.m);
  const text = `Jai Jinendra ${group.cap.split(' ')[0] || ''}, I found your Vihar route ${from} to ${to} on vSeva (vseva.vjas.in/vihar-routes). `;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[color:var(--paper)] px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[0.95rem] font-semibold text-[color:var(--ink)]">{group.cap || 'Captain'}</p>
        <p className="text-[0.8rem] text-[color:var(--muted)]">{group.n}{group.c ? `, ${group.c}` : ''}</p>
      </div>
      {mobile && (
        <div className="flex shrink-0 gap-2">
          <a href={`tel:+91${mobile}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[color:var(--line-strong)] bg-white px-3 text-[0.85rem] font-semibold text-[color:var(--ink)] no-underline hover:border-[color:var(--ink)]" aria-label={`Call ${group.cap}`}>
            <Phone size={14} aria-hidden /> Call
          </a>
          <a href={`https://wa.me/91${mobile}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#13843f] px-3 text-[0.85rem] font-semibold text-white no-underline hover:bg-[#0f6f34]" aria-label={`WhatsApp ${group.cap}`}>
            <WhatsAppIcon size={14} /> WhatsApp
          </a>
        </div>
      )}
    </div>
  );
};

const RouteCard: React.FC<{ r: Shown; groups: Group[]; step?: number }> = ({ r, groups, step }) => {
  const [open, setOpen] = useState(false);
  const gs = r.groups.map(i => groups[i]).filter(Boolean);
  const city = gs[0]?.c || '';
  return (
    <li className="rounded-2xl border border-[color:var(--line)] bg-white p-3.5 sm:p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[color:var(--saffron-tint)] text-[color:var(--saffron-deep)]">
          {step ? <span className="text-[0.65rem] font-semibold uppercase tracking-wide">Day {step}</span> : null}
          <span className="font-[family-name:var(--display)] text-[1.15rem] font-extrabold leading-none">{r.km % 1 ? r.km.toFixed(1) : r.km}</span>
          <span className="text-[0.7rem]">km</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[1rem] font-semibold leading-snug text-[color:var(--ink)] [overflow-wrap:anywhere]">
            {r.from} <ArrowRight size={15} className="mx-0.5 inline -translate-y-px text-[color:var(--saffron)]" aria-label="to" /> {r.to}
          </p>
          {r.via && <p className="mt-0.5 text-[0.85rem] text-[color:var(--ink-2)]">via {r.via}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5 text-[0.75rem]">
            {city && <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[color:var(--paper)] px-2.5 text-[color:var(--ink-2)]"><MapPin size={12} aria-hidden />{city}</span>}
            {gs.length > 1 && <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[#e3f1ec] px-2.5 text-[#1f6b5f]"><Users size={12} aria-hidden />{gs.length} groups walk this</span>}
            {r.reverse && <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[#e2eff3] px-2.5 text-[#1e5a66]"><ArrowLeftRight size={12} aria-hidden />Shared the other way</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={mapsLink(r.from, r.to, city, r.maps)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[color:var(--saffron-tint)] px-3.5 text-[0.85rem] font-semibold text-[color:var(--saffron-deep)] no-underline hover:brightness-95">
          <MapIcon size={14} aria-hidden /> {r.maps ? 'Map' : 'Directions'}
        </a>
        {gs.length > 0 && (
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[color:var(--line-strong)] bg-white px-3.5 text-[0.85rem] font-semibold text-[color:var(--ink)] hover:border-[color:var(--ink)]">
            <Phone size={14} aria-hidden /> Contact Captain{gs.length > 1 ? ` (${gs.length})` : ''}
            <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          {gs.map((g, i) => <ContactCaptain key={i} group={g} from={r.from} to={r.to} />)}
        </div>
      )}
    </li>
  );
};

/* ───────────── Finder ───────────── */

export const RouteFinder: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { dir, state } = useDirectory();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [city, setCity] = useState('All');
  const [maxKm, setMaxKm] = useState(0); // 0 = no limit (set from the data)
  const [limit, setLimit] = useState(compact ? 5 : 25);

  // /vihar-routes?from=…&to=… (the landing section's "See all" carries the search over)
  useEffect(() => {
    if (compact) return;
    const q = new URLSearchParams(window.location.search);
    setFrom(q.get('from') || '');
    setTo(q.get('to') || '');
  }, [compact]);

  const groups = dir?.groups || [];
  const topKm = useMemo(() => Math.ceil(Math.max(5, ...(dir?.routes || []).map(r => r[2]))), [dir]);
  const limitKm = maxKm || topKm;

  const cities = useMemo(() => {
    const count = new Map<string, number>();
    (dir?.routes || []).forEach(r => { const c = groups[r[3][0]]?.c; if (c) count.set(c, (count.get(c) || 0) + 1); });
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [dir, groups]);

  const places = useMemo(() => [...new Set((dir?.routes || []).flatMap(r => [r[0], r[1]]))].sort(), [dir]);

  const { results, chain } = useMemo(() => {
    const pool = (dir?.routes || []).filter(r => r[2] <= limitKm && (city === 'All' || r[3].some(g => groups[g]?.c === city)));
    const out: Shown[] = [];
    pool.forEach(([f, t, km, gs, via, maps]) => {
      if (matches(f, from) && matches(t, to)) out.push({ from: f, to: t, km, groups: gs, via, maps, reverse: false });
      else if ((from || to) && matches(t, from) && matches(f, to)) out.push({ from: t, to: f, km, groups: gs, via, maps, reverse: true });
    });
    out.sort((a, b) => (from || to ? a.km - b.km : b.groups.length - a.groups.length || a.from.localeCompare(b.from)));
    // No direct route: join two routes other groups walk, through a shared stop (A → X → B)
    let best: Shown[] | null = null;
    if (from.trim() && to.trim() && out.length === 0) {
      const legs = pool.flatMap(([f, t, km, gs, via, maps]) => [
        { from: f, to: t, km, groups: gs, via, maps, reverse: false },
        { from: t, to: f, km, groups: gs, via, maps, reverse: true },
      ]);
      let bestKm = Infinity;
      legs.filter(a => matches(a.from, from)).forEach(a => {
        legs.filter(b => sameStop(b.from, a.to) && matches(b.to, to) && !sameStop(b.to, a.from)).forEach(b => {
          if (a.km + b.km < bestKm) { bestKm = a.km + b.km; best = [a, b]; }
        });
      });
    }
    return { results: out, chain: best as Shown[] | null };
  }, [dir, groups, from, to, city, limitKm]);

  const searching = !!(from.trim() || to.trim());
  const seeAllHref = `/vihar-routes${searching ? `?${new URLSearchParams({ from, to }).toString()}` : ''}`;
  const field = 'h-12 w-full rounded-xl border border-[color:var(--line-strong)] bg-white pl-10 pr-3 text-[1rem] text-[color:var(--ink)] outline-none transition-colors placeholder:text-[#a8988b] focus:border-[color:var(--saffron)]';

  return (
    <div>
      {/* Search */}
      <div className="rounded-[24px] border border-[color:var(--line)] bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <label className="relative block">
            <span className="sr-only">From</span>
            <span className="absolute left-3.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[color:var(--saffron)]" aria-hidden />
            <input value={from} onChange={e => { setFrom(e.target.value); setLimit(compact ? 5 : 25); }} list="vs-route-places" placeholder="From: Matunga, Vashi…" autoComplete="off" className={field} />
          </label>
          <button type="button" onClick={() => { setFrom(to); setTo(from); }} aria-label="Swap from and to" className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line-strong)] bg-white text-[color:var(--ink)] hover:border-[color:var(--ink)]">
            <ArrowLeftRight size={16} aria-hidden className="rotate-90 sm:rotate-0" />
          </button>
          <label className="relative block">
            <span className="sr-only">To</span>
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#245e55]" aria-hidden />
            <input value={to} onChange={e => { setTo(e.target.value); setLimit(compact ? 5 : 25); }} list="vs-route-places" placeholder="To: Ghatkopar, Mahape…" autoComplete="off" className={field} />
          </label>
        </div>
        <datalist id="vs-route-places">{places.map(p => <option key={p} value={p} />)}</datalist>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="group" aria-label="City">
            {['All', ...cities].map(c => (
              <button key={c} type="button" onClick={() => setCity(c)} aria-pressed={city === c}
                className={`h-9 shrink-0 rounded-full px-3.5 text-[0.85rem] font-semibold transition-colors ${city === c ? 'bg-[color:var(--saffron-deep)] text-white' : 'bg-[color:var(--paper)] text-[color:var(--ink-2)] hover:text-[color:var(--ink)]'}`}>
                {c}
              </button>
            ))}
          </div>
          <label className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[0.85rem] text-[color:var(--ink-2)]">
            Up to <b className="text-[color:var(--ink)]">{limitKm} km</b>
            <input type="range" min={2} max={topKm} step={1} value={limitKm} onChange={e => setMaxKm(Number(e.target.value))} className="w-28 accent-[color:var(--saffron-deep)]" aria-label="Maximum distance in km" />
          </label>
        </div>
      </div>

      {/* Status line */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[0.85rem] text-[color:var(--muted)]">
        <span className="font-semibold text-[color:var(--ink)]">
          {state !== 'ready' ? '' : !searching ? `${dir?.stats.routes} routes from ${dir?.stats.groups} groups` : results.length ? `${results.length} route${results.length === 1 ? '' : 's'} found` : chain ? 'No direct route · 1 suggestion' : 'No routes found'}
        </span>
        {dir && <span className="inline-flex items-center gap-1.5"><RefreshCw size={13} aria-hidden /> Last updated {fmtUpdated(dir.generatedAt)}</span>}
      </div>

      {/* Results */}
      {state === 'loading' && (
        <ul className="mt-3 space-y-2.5" aria-hidden>
          {[0, 1, 2].map(i => <li key={i} className="h-[104px] animate-pulse rounded-2xl bg-white/70" />)}
        </ul>
      )}
      {state === 'missing' && (
        <div className="mt-3 rounded-2xl border border-dashed border-[color:var(--line-strong)] bg-white p-8 text-center">
          <Route size={26} className="mx-auto text-[color:var(--muted)]" aria-hidden />
          <p className="mt-2 font-semibold text-[color:var(--ink)]">The route directory is being prepared</p>
          <p className="mt-1 text-[0.9rem] text-[color:var(--muted)]">Routes shared by Vihar Seva groups will appear here soon.</p>
        </div>
      )}
      {state === 'ready' && (
        <>
          {chain && (
            <div className="mt-3 rounded-2xl bg-[color:var(--saffron-tint)] p-4">
              <p className="flex items-center gap-2 font-semibold text-[color:var(--ink)]"><Route size={17} className="text-[color:var(--saffron-deep)]" aria-hidden />
                No direct route yet. Suggested in 2 Vihars · {(chain[0].km + chain[1].km).toFixed(1).replace(/\.0$/, '')} km
              </p>
              <p className="mt-1 text-[0.85rem] text-[color:var(--ink-2)]">Joined from routes groups walk, with a stop at {chain[0].to}.</p>
              <ul className="mt-3 space-y-2.5">{chain.map((r, i) => <RouteCard key={i} r={r} groups={groups} step={i + 1} />)}</ul>
            </div>
          )}
          {!chain && searching && results.length === 0 && (
            <div className="mt-3 rounded-2xl border border-[color:var(--line)] bg-white p-8 text-center">
              <SearchX size={26} className="mx-auto text-[color:var(--muted)]" aria-hidden />
              <p className="mt-2 font-semibold text-[color:var(--ink)]">No route found between these places</p>
              <p className="mt-1 text-[0.9rem] text-[color:var(--muted)]">Try part of the name, another city, or a longer distance.</p>
            </div>
          )}
          {results.length > 0 && (
            <ul className="mt-3 space-y-2.5">
              {results.slice(0, limit).map((r, i) => <RouteCard key={`${r.from}|${r.to}|${i}`} r={r} groups={groups} />)}
            </ul>
          )}
          {compact ? (
            <a href={seeAllHref} className="vs-btn vs-btn-saffron mt-5 w-full justify-center sm:w-auto">
              <Search size={16} aria-hidden /> {searching ? 'See all results' : `See all ${dir?.stats.routes} routes`} <ArrowUpRight size={16} aria-hidden />
            </a>
          ) : results.length > limit ? (
            <button type="button" onClick={() => setLimit(l => l + 25)} className="vs-btn vs-btn-ghost mt-5 w-full justify-center">
              Show more ({results.length - limit} more)
            </button>
          ) : null}
        </>
      )}
    </div>
  );
};

export default RouteFinder;
