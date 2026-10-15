import React from 'react';
import { BRAND } from '@brand';

// Full-screen loading state: the brand's own logo (vSeva or Shraman Seva Group), gently breathing, with a soft
// glow behind it. Used while the session restores after login and while a screen's code loads, in place of the
// old spinning circle.
// vSeva's logo file has wide transparent padding, so it is drawn larger to look the same size as SSG's emblem
const BrandSplash: React.FC<{ inline?: boolean }> = ({ inline }) => {
  const size = (inline ? 64 : 96) * (BRAND.logoPadded ? 1.6 : 1);
  return (
  <div
    role="status"
    aria-label={`${BRAND.name} is loading`}
    className={inline ? 'flex items-center justify-center py-16' : 'fixed inset-0 z-[9999] flex items-center justify-center bg-white'}
  >
    <div className="relative flex items-center justify-center">
      <span aria-hidden="true" className="brand-splash-glow absolute rounded-full" style={{ width: inline ? 88 : 132, height: inline ? 88 : 132, background: BRAND.themeColor }} />
      <img
        src={BRAND.logo}
        alt=""
        className="brand-splash-logo relative object-contain rounded-[22%]"
        style={{ width: size, height: size }}
      />
    </div>
    <style>{`
      @keyframes brand-splash-in { from { opacity: 0; transform: scale(.88); } to { opacity: 1; transform: scale(1); } }
      @keyframes brand-splash-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
      @keyframes brand-splash-glow { 0%, 100% { transform: scale(.7); opacity: .10; } 50% { transform: scale(1); opacity: .22; } }
      .brand-splash-logo { animation: brand-splash-in 500ms cubic-bezier(.22,1,.36,1) both, brand-splash-breathe 1.8s ease-in-out 500ms infinite; }
      .brand-splash-glow { filter: blur(18px); animation: brand-splash-glow 1.8s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) { .brand-splash-logo, .brand-splash-glow { animation: none; } }
    `}</style>
  </div>
  );
};

export default BrandSplash;
