import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { BRAND } from '@brand';
import { checkStoreUpdate, openStoreListing } from '../services/liveUpdate';

// Android app only: when a newer version is on the Play Store, ask once a day to update. The button opens the
// app's Play Store page. (Screen and feature changes reach the app on their own, see services/liveUpdate.ts;
// this is for releases that change the app itself.)
const SNOOZE_KEY = 'storeUpdateSnoozedAt';
const SNOOZE_MS = 24 * 60 * 60 * 1000;

const StoreUpdatePrompt: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    try {
      const at = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      if (Date.now() - at < SNOOZE_MS) return;
    } catch { /* storage unavailable: just ask */ }
    // a moment after start, so it never competes with sign-in or the splash
    const t = window.setTimeout(() => {
      checkStoreUpdate().then(available => { if (alive && available) setOpen(true); });
    }, 4000);
    return () => { alive = false; window.clearTimeout(t); };
  }, []);

  if (!open) return null;

  const later = () => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch { /* optional */ }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="store-update-title">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-saffron-50 text-saffron-600">
          <Download size={26} />
        </div>
        <h2 id="store-update-title" className="text-center text-lg font-extrabold text-[#241C17]">A new version of {BRAND.shortName} is available</h2>
        <p className="mt-2 text-center text-sm text-[#8A6A57]">Update from the Play Store to get the latest improvements.</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => { openStoreListing(); later(); }}
            className="w-full rounded-full bg-saffron-600 py-3 text-sm font-bold text-white active:scale-[0.98]"
          >
            Update now
          </button>
          <button onClick={later} className="w-full rounded-full py-3 text-sm font-semibold text-[#8A6A57]">Later</button>
        </div>
      </div>
    </div>
  );
};

export default StoreUpdatePrompt;
