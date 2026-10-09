import React, { useEffect, useRef } from 'react';
import Portal from './Portal';

interface Props {
  /** Change this value to fire another burst. */
  trigger?: number;
}

// Warm, on-brand colours (saffron, gold, cream) with a little white so it reads on the light sheet.
const COLORS = ['#DE6B38', '#FF9947', '#F5B83D', '#FFD27A', '#B5542A', '#FFFFFF', '#F28C6B'];

interface Piece {
  x: number; y: number; vx: number; vy: number;
  w: number; h: number; rot: number; vr: number;
  tilt: number; vt: number; color: string; round: boolean;
}

// Celebration confetti: two cannons at the left and right edges fire up and inwards, the pieces meet over the
// middle of the screen and flutter down. A canvas over everything (never blocks taps), ~3.5 s, no library.
// Skipped entirely when the user has asked for reduced motion.
const ConfettiBurst: React.FC<Props> = ({ trigger = 0 }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const unit = Math.max(0.85, Math.min(W, H) / 400); // scale speeds to the screen
    const pieces: Piece[] = [];
    const fire = (side: 'left' | 'right', count: number) => {
      for (let i = 0; i < count; i++) {
        const dir = side === 'left' ? 1 : -1;
        // aim up and towards the centre: 42-66 degrees above the horizontal, strong enough to cross half the screen
        const angle = (42 + Math.random() * 24) * (Math.PI / 180);
        const speed = (17 + Math.random() * 10) * unit;
        pieces.push({
          x: side === 'left' ? -8 : W + 8,
          y: H * (0.72 + Math.random() * 0.12),
          vx: Math.cos(angle) * speed * dir * (0.75 + Math.random() * 0.4),
          vy: -Math.sin(angle) * speed,
          w: 6 + Math.random() * 6,
          h: 4 + Math.random() * 5,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          tilt: Math.random() * Math.PI,
          vt: 0.08 + Math.random() * 0.12,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          round: Math.random() < 0.25,
        });
      }
    };

    const per = W < 500 ? 55 : 80;
    fire('left', per);
    fire('right', per);
    const second = window.setTimeout(() => { fire('left', Math.round(per * 0.5)); fire('right', Math.round(per * 0.5)); }, 260);

    const start = performance.now();
    const DURATION = 3600;
    let raf = 0;
    const frame = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, W, H);
      const fade = t > DURATION - 700 ? Math.max(0, (DURATION - t) / 700) : 1;
      for (const p of pieces) {
        p.vy += 0.32 * unit;          // gravity
        p.vx *= 0.985; p.vy *= 0.985; // air drag, so they float near the middle before falling
        p.vx += Math.sin(p.tilt) * 0.06;
        p.x += p.vx; p.y += p.vy;
        p.rot += p.vr; p.tilt += p.vt;
        if (p.y > H + 20) continue;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.color === '#FFFFFF') { ctx.strokeStyle = 'rgba(222,107,56,0.35)'; ctx.lineWidth = 1; }
        if (p.round) {
          ctx.beginPath(); ctx.arc(0, 0, p.h * 0.6, 0, Math.PI * 2); ctx.fill();
        } else {
          const h = p.h * Math.abs(Math.cos(p.tilt)); // flip as it tumbles
          ctx.fillRect(-p.w / 2, -h / 2, p.w, h);
          if (p.color === '#FFFFFF') ctx.strokeRect(-p.w / 2, -h / 2, p.w, h);
        }
        ctx.restore();
      }
      if (t < DURATION) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(second); ctx.clearRect(0, 0, W, H); };
  }, [trigger]);

  return (
    <Portal>
      <canvas ref={ref} aria-hidden="true" className="fixed inset-0 w-screen h-[100dvh] pointer-events-none z-[120]" />
    </Portal>
  );
};

export default ConfettiBurst;
