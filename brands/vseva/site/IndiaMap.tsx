import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MapPin, Minimize2, ZoomIn, X } from 'lucide-react';
import { MAP_GROUPS, type MapGroup } from './content';
import { INDIA_STATES } from './indiaStates';

// "Where vSeva walks": India with the states that have vSeva groups filled in and a pin per group.
// Pins that sit too close together at the current zoom merge into one numbered pin; tapping it zooms in
// (or lists the groups when they are in the same neighbourhood). Loaded lazily from the landing page.

type View = { x: number; y: number; w: number; h: number };
const FULL: View = { x: 0, y: 0, w: 764, h: 792 };
const MIN_W = 60; // the closest zoom (Mumbai and around); the outlines get coarse beyond this

// Same projection as the path data (see indiaStates.ts)
const project = (g: MapGroup) => ({ x: (g.lon - 68.18) * 26.14, y: (37.1 - g.lat) * 26.1 });

// The state each group is in = the last part of its region ("Mumbai, Maharashtra" → Maharashtra)
const stateOf = (g: MapGroup) => g.region.split(',').pop()!.trim();

type Point = { g: MapGroup; i: number; x: number; y: number };
type Cluster = { key: string; x: number; y: number; members: Point[] };

function clusterPoints(points: Point[], radius: number): Cluster[] {
  const out: Cluster[] = [];
  for (const p of points) {
    const near = out.find(c => Math.hypot(c.x - p.x, c.y - p.y) < radius);
    if (near) {
      near.members.push(p);
      near.x = near.members.reduce((s, m) => s + m.x, 0) / near.members.length;
      near.y = near.members.reduce((s, m) => s + m.y, 0) / near.members.length;
    } else out.push({ key: '', x: p.x, y: p.y, members: [p] });
  }
  out.forEach(c => { c.key = c.members.map(m => m.i).join('-'); });
  return out;
}

// A view around some points, padded and kept to the map's shape
function fit(points: { x: number; y: number }[]): View {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const w = Math.max(MIN_W, (Math.max(...xs) - Math.min(...xs)) * 2.2, (Math.max(...ys) - Math.min(...ys)) * 2.2 * (FULL.w / FULL.h));
  const h = w * (FULL.h / FULL.w);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

const IndiaMap: React.FC = () => {
  const reduce = useReducedMotion();
  const [view, setView] = useState<View>(FULL);
  const [selected, setSelected] = useState<string | null>(null); // a cluster key
  const [hovered, setHovered] = useState<number | null>(null); // a group index (from the list)
  // Pins keep a tappable size on phones, where the whole map is only ~340px wide
  const [s] = useState(() => (window.innerWidth < 640 ? 1.7 : 1));

  const points = useMemo<Point[]>(() => MAP_GROUPS.map((g, i) => ({ g, i, ...project(g) })), []);
  const activeStates = useMemo(() => new Set(MAP_GROUPS.map(stateOf)), []);
  const k = view.w / FULL.w; // 1 = whole of India; smaller = zoomed in
  const clusters = useMemo(() => clusterPoints(points, 26 * s * k), [points, s, k]);
  const current = clusters.find(c => c.key === selected) ?? null;
  const zoomed = view.w < FULL.w;

  const openCluster = (c: Cluster) => {
    setSelected(c.key);
    if (c.members.length > 1 && view.w > MIN_W + 1) {
      const next = fit(c.members);
      setView(next);
      // after zooming the members may split into separate pins: select the first so the card stays useful
      const after = clusterPoints(points, 26 * s * (next.w / FULL.w)).find(x => x.members.some(m => m.i === c.members[0].i));
      if (after) setSelected(after.key);
    }
  };

  const pickGroup = (i: number) => {
    const p = points[i];
    const next = fit([p]);
    setView(next);
    const after = clusterPoints(points, 26 * s * (next.w / FULL.w)).find(x => x.members.some(m => m.i === i));
    setSelected(after?.key ?? null);
  };

  const reset = () => { setView(FULL); setSelected(null); };
  const states = Object.entries(INDIA_STATES);
  const pinR = 10 * s * k;

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
      {/* Map */}
      <div className="relative overflow-hidden rounded-[28px] border border-[color:var(--line)] bg-white lg:col-span-8">
        <motion.svg
          viewBox={`${FULL.x} ${FULL.y} ${FULL.w} ${FULL.h}`}
          animate={{ viewBox: `${view.x} ${view.y} ${view.w} ${view.h}` }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 70, damping: 18 }}
          className="block h-auto w-full touch-manipulation"
          role="img"
          aria-label={`Map of India with ${MAP_GROUPS.length} Vihar Seva groups on vSeva in ${activeStates.size} states`}
          onClick={() => setSelected(null)}
        >
          <g>
            {states.map(([name, d]) => (
              <path key={name} d={d} className="vs-map-state" data-active={activeStates.has(name)} style={{ strokeWidth: 0.7 * k }}>
                <title>{name}</title>
              </path>
            ))}
          </g>
          {clusters.map(c => {
            const many = c.members.length > 1;
            const lit = selected === c.key || c.members.some(m => m.i === hovered);
            const r = pinR * (many ? 1.35 : 1) * (lit ? 1.2 : 1);
            return (
              <g
                key={c.key}
                className="cursor-pointer"
                onClick={e => { e.stopPropagation(); openCluster(c); }}
                aria-hidden
              >
                <circle cx={c.x} cy={c.y} r={r} fill="var(--saffron)" className="vs-map-pulse" />
                <circle cx={c.x} cy={c.y} r={r} fill={lit ? 'var(--ink)' : 'var(--saffron-deep)'} stroke="#fff" strokeWidth={2 * s * k} />
                {many && (
                  <text x={c.x} y={c.y} dy="0.35em" textAnchor="middle" fill="#fff" fontSize={13 * s * k} fontWeight={700} style={{ pointerEvents: 'none' }}>
                    {c.members.length}
                  </text>
                )}
              </g>
            );
          })}
        </motion.svg>

        {/* Legend (over the Arabian Sea, the emptiest corner) and zoom-out */}
        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-1 rounded-xl bg-white/90 px-2.5 py-2 text-[0.72rem] sm:bottom-4 sm:left-4 sm:text-[0.78rem] text-[color:var(--ink-2)] backdrop-blur">
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#f3b48c]" aria-hidden /> States with vSeva groups</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-white bg-[color:var(--saffron-deep)] shadow" aria-hidden /> A Vihar Seva group</span>
        </div>
        {zoomed && (
          <button type="button" onClick={reset} className="vs-btn vs-btn-sm vs-btn-light absolute right-4 top-4 shadow-[0_6px_20px_-8px_rgba(60,25,5,0.4)]">
            <Minimize2 size={15} aria-hidden /> All of India
          </button>
        )}

        {/* The selected pin's card */}
        <AnimatePresence>
          {current && (
            <motion.div
              key={current.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-x-3 bottom-3 rounded-2xl border border-[color:var(--line)] bg-white p-4 shadow-[0_18px_40px_-18px_rgba(60,25,5,0.45)] sm:inset-x-auto sm:left-4 sm:w-[340px]"
              role="dialog"
              aria-label={current.members.length > 1 ? `${current.members.length} groups` : current.members[0].g.name}
            >
              <button type="button" onClick={() => setSelected(null)} className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-[color:var(--paper)]" aria-label="Close">
                <X size={15} aria-hidden />
              </button>
              {current.members.length > 1 && <p className="vs-eyebrow mb-2">{current.members.length} groups here</p>}
              <ul className="space-y-3">
                {current.members.map(m => (
                  <li key={m.i} className="flex items-start gap-3 pr-6">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color:var(--saffron-tint)]">
                      <MapPin size={15} className="text-[color:var(--saffron-deep)]" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-[family-name:var(--display)] text-[1rem] font-bold leading-snug text-[color:var(--ink)]">{m.g.name}</span>
                      <span className="block text-[0.85rem] text-[color:var(--muted)]">{m.g.place} · {m.g.region}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {current.members.length > 1 && view.w > MIN_W + 1 && (
                <button type="button" onClick={() => openCluster(current)} className="vs-link mt-3 inline-flex items-center gap-1.5 text-[0.9rem]">
                  <ZoomIn size={15} aria-hidden /> Zoom in
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The list: the accessible way to every pin */}
      <div className="lg:col-span-4">
        <p className="vs-eyebrow !text-[color:var(--muted)]">{MAP_GROUPS.length} groups · {activeStates.size} states</p>
        <ul className="mt-3 divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
          {MAP_GROUPS.map((g, i) => {
            const on = current?.members.some(m => m.i === i);
            return (
              <li key={`${g.name}-${g.place}`}>
                <button
                  type="button"
                  onClick={() => pickGroup(i)}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  aria-pressed={!!on}
                  className={`flex w-full items-center gap-3 py-3 text-left transition-colors hover:text-[color:var(--saffron-deep)] ${on ? 'text-[color:var(--saffron-deep)]' : 'text-[color:var(--ink)]'}`}
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${on ? 'bg-[color:var(--ink)]' : 'bg-[color:var(--saffron-deep)]'}`} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-[0.95rem] font-semibold leading-snug">{g.place}</span>
                    <span className="block truncate text-[0.82rem] text-[color:var(--muted)]">{g.name} · {g.region}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default IndiaMap;
