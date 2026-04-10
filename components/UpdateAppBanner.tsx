import React, { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

// Key used to suppress the banner immediately after a successful SW-triggered reload
const SW_JUST_UPDATED_KEY = 'sw_just_updated';

export const UpdateAppBanner: React.FC = () => {
  const reloadingRef = useRef(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Poll for updates every hour (background check)
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('[SW] Registration error', error);
    },
  });

  // Suppress banner if we just came back from a SW-triggered reload
  const justUpdated = sessionStorage.getItem(SW_JUST_UPDATED_KEY) === 'true';

  useEffect(() => {
    if (justUpdated) {
      // Clear the flag and hide the banner — update is already applied
      sessionStorage.removeItem(SW_JUST_UPDATED_KEY);
      setNeedRefresh(false);
    }
  }, [justUpdated, setNeedRefresh]);

  const handleUpdate = () => {
    if (reloadingRef.current) return; // prevent double-click
    reloadingRef.current = true;

    // Mark that the next page load is a post-update reload
    sessionStorage.setItem(SW_JUST_UPDATED_KEY, 'true');

    // Listen for the new SW to take control, then reload exactly once
    const onControllerChange = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      window.location.reload();
    };

    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    }

    // Tell the waiting SW to skip waiting and become active
    // updateServiceWorker(true) sends SKIP_WAITING to the waiting SW
    updateServiceWorker(true);

    // Safety fallback: if controllerchange never fires within 3s, reload anyway
    setTimeout(() => {
      if (reloadingRef.current) {
        navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
        window.location.reload();
      }
    }, 3000);
  };

  // Don't show if: no update pending, or we just came from an update reload
  if (!needRefresh || justUpdated) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:bottom-8 md:left-auto md:right-8 z-[200] max-w-sm bg-white border border-gray-100 shadow-2xl rounded-2xl p-5 flex flex-col gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <RefreshCw size={20} className="text-orange-600" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">App Update Available</h4>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">
              A new version of vSeva is available! Update now to get the latest features.
            </p>
          </div>
        </div>
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-1 -mt-1"
          aria-label="Dismiss update notification"
        >
          <X size={18} />
        </button>
      </div>

      <button
        onClick={handleUpdate}
        className="w-full mt-2 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-95"
      >
        Update App Now
      </button>
    </div>
  );
};

export default UpdateAppBanner;
