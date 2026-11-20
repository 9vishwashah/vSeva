import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { clearAll as clearRequestCache } from '../services/requestCache';

// Shown while a Super Admin is inside a Captain's account through "Open as Captain"
// (dataService.openAsCaptain sets the sessionStorage flag in this tab only). "Exit" signs out of the
// Captain's account and returns to /super-admin, where the Super Admin signs in again.
const OpenedAsBanner: React.FC = () => {
  const [info] = useState<{ name: string; orgName: string } | null>(() => {
    try {
      const raw = sessionStorage.getItem('openedAs');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  if (!info) return null;

  const exit = async () => {
    try { sessionStorage.removeItem('openedAs'); } catch { /* optional */ }
    await supabase.auth.signOut();
    clearRequestCache();
    window.location.href = '/super-admin';
  };

  return (
    <div
      role="status"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      className="fixed top-0 inset-x-0 z-[9999] bg-gray-900 text-white text-xs md:text-sm"
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 px-4 py-2">
        <span className="min-w-0 truncate">
          Super Admin viewing as <b>{info.name}</b> · {info.orgName}
        </span>
        <button onClick={exit} className="shrink-0 px-3 py-1 rounded-lg bg-white text-gray-900 font-bold hover:bg-gray-100">
          Exit
        </button>
      </div>
    </div>
  );
};

export default OpenedAsBanner;
