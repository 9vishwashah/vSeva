import React, { useEffect, useState } from 'react';

interface SankalpRingProps {
  count: number;
  /** The target; null = not set for this Vihar Year, undefined = still loading. */
  goal: number | null | undefined;
  /** Card title, e.g. "My Sankalp" or "Group Sankalp". */
  title?: string;
  /** Colour: saffron for a Sevak's own Sankalp, a flat light purple (same shade as the dashboard KPI tiles) for the Group Sankalp. */
  tone?: 'saffron' | 'purple' | 'light';
  /** Smaller ring and padding (Dashboard). */
  compact?: boolean;
  /** e.g. "VY 2026-27" — the Vihar Year this count is scoped to. */
  periodLabel?: string;
}

// saffron: the bold gradient hero. purple: flat light tile, no shadow, matching the KPI cards.
const THEMES = {
  saffron: { bg: 'linear-gradient(150deg,#FF9947 0%,#DE6B38 100%)', shadow: '0 8px 20px -10px rgba(222,107,56,0.55)', track: 'rgba(255,255,255,0.3)', ring: '#fff', big: 'text-white', soft: 'text-white/85', title: 'text-white/85', main: 'text-white', pill: 'bg-white/25' },
  // light: white card with a saffron ring, so it does not compete with the orange Add Vihar button
  light: { bg: '#FFFFFF', shadow: '0 1px 3px rgba(0,0,0,0.06)', track: '#FCE3D3', ring: '#DE6B38', big: 'text-[#241C17]', soft: 'text-[#8A6A57]', title: 'text-[#B5602C]', main: 'text-[#241C17]', pill: 'bg-saffron-50 text-saffron-700' },
  purple: { bg: '#F1EAFB', shadow: 'none', track: 'rgba(107,79,174,0.16)', ring: '#6B4FAE', big: 'text-[#241C17]', soft: 'text-[#6B4FAE]/80', title: 'text-[#6B4FAE]', main: 'text-[#241C17]', pill: 'bg-[#6B4FAE]/[0.12]' },
} as const;



// Dashboard hero card: gradient "Yearly Sankalp" progress ring.
// Ring fills from empty to the real count/goal ratio once on mount.
const SankalpRing: React.FC<SankalpRingProps> = ({ count, goal, title = 'Yearly Sankalp', tone = 'saffron', periodLabel, compact }) => {
  const SIZE = compact ? 56 : 76;
  const RADIUS = compact ? 23 : 32;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const hasGoal = typeof goal === 'number' && goal > 0;
  const safeGoal = hasGoal ? (goal as number) : 0;
  const percent = hasGoal ? Math.max(0, Math.min(1, count / safeGoal)) : 0;
  const remaining = Math.max(0, safeGoal - count);

  const [dashoffset, setDashoffset] = useState(CIRCUMFERENCE);

  useEffect(() => {
    setDashoffset(CIRCUMFERENCE);
    const id = requestAnimationFrame(() => {
      setDashoffset(CIRCUMFERENCE * (1 - percent));
    });
    return () => cancelAnimationFrame(id);
  }, [percent, CIRCUMFERENCE]);

  // count up from 0 to the real number alongside the ring fill
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(count); return; }
    let raf = 0; const start = performance.now();
    const step = (now: number) => { const p = Math.min(1, (now - start) / 800); setShown(Math.round(count * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  const center = SIZE / 2;
  const th = THEMES[tone];

  return (
    <div
      style={{ background: th.bg, boxShadow: th.shadow }}
      className={`relative overflow-hidden rounded-[18px] flex items-center ${compact ? 'px-4 py-2.5 gap-3' : 'px-5 py-3.5 gap-3.5'}`}
    >
      <div className="shrink-0 relative" style={{ width: SIZE, height: SIZE }}>
        <span aria-hidden="true" className="sankalp-breathe absolute inset-0 rounded-full" style={{ border: `3px solid ${th.ring}` }} />
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={center} cy={center} r={RADIUS} fill="none" stroke={th.track} strokeWidth={compact ? 6 : 7} />
          <circle
            cx={center}
            cy={center}
            r={RADIUS}
            fill="none"
            stroke={th.ring}
            strokeWidth={compact ? 6 : 7}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center"><p className="m-0 flex items-baseline">
          <span className={`text-lg font-extrabold leading-none ${th.big}`}>{shown}</span>
          <span className={`text-[10px] font-semibold ${th.soft}`}>{hasGoal ? `/${safeGoal}` : '/—'}</span>
        </p></div>
      </div>
      <div className="min-w-0">
        <p className={`m-0 text-[11px] font-bold uppercase tracking-wider ${th.title} flex items-center gap-1.5 flex-wrap`}>
          {title}
        </p>
        <p className={`m-0 text-[14px] font-bold ${th.main}`}>{hasGoal ? `${Math.round(percent * 100)}% complete` : (goal === undefined ? '\u00A0' : 'Sankalp not set yet')}</p>
        <p className={`m-0 text-[12px] ${th.soft} truncate`}>
          {!hasGoal
            ? (goal === undefined ? '' : 'Set it in Profile & Settings')
            : remaining > 0 ? `${remaining} Vihar${remaining === 1 ? '' : 's'} remaining this Vihar Year` : 'Goal reached — Jai Jinendra!'}
        </p>
      </div>
    </div>
  );
};

export default SankalpRing;
