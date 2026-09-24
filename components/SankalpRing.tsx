import React, { useEffect, useState } from 'react';

interface SankalpRingProps {
  count: number;
  goal: number;
}

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Dashboard hero card: gradient "Yearly Sankalp" progress ring.
// Ring fills from empty to the real count/goal ratio once on mount.
const SankalpRing: React.FC<SankalpRingProps> = ({ count, goal }) => {
  const safeGoal = goal > 0 ? goal : 25;
  const percent = Math.max(0, Math.min(1, count / safeGoal));
  const remaining = Math.max(0, safeGoal - count);

  const [dashoffset, setDashoffset] = useState(CIRCUMFERENCE);

  useEffect(() => {
    setDashoffset(CIRCUMFERENCE);
    const id = requestAnimationFrame(() => {
      setDashoffset(CIRCUMFERENCE * (1 - percent));
    });
    return () => cancelAnimationFrame(id);
  }, [percent]);

  return (
    <div
      style={{ background: 'linear-gradient(150deg,#FF9947 0%,#DE6B38 100%)' }}
      className="rounded-[22px] p-5 flex items-center gap-4 shadow-[0_8px_20px_-10px_rgba(222,107,56,0.55)]"
    >
      <div className="shrink-0 relative" style={{ width: 104, height: 104 }}>
        <svg width="104" height="104" viewBox="0 0 104 104" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="52" cy="52" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="10" />
          <circle
            cx="52"
            cy="52"
            r={RADIUS}
            fill="none"
            stroke="#fff"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-white leading-none">{count}</span>
          <span className="text-[11px] font-semibold text-white/85">/ {safeGoal}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="m-0 mb-0.5 text-xs font-bold uppercase tracking-wider text-white/85">Yearly Sankalp</p>
        <p className="m-0 mb-2 text-[15px] font-bold text-white">{Math.round(percent * 100)}% complete</p>
        <p className="m-0 text-[13px] text-white/85">
          {remaining > 0 ? `${remaining} Vihar${remaining === 1 ? '' : 's'} remaining this year` : 'Goal reached — Jai Jinendra!'}
        </p>
      </div>
    </div>
  );
};

export default SankalpRing;
