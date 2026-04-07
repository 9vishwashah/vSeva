import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export const UpdateAppBanner: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000); // 1 hour check
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:bottom-8 md:left-auto md:right-8 z-[200] max-w-sm bg-white border border-gray-100 shadow-2xl rounded-2xl p-5 flex flex-col gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <RefreshCw size={20} className="text-orange-600" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">App Update Available</h4>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">A new version of vSeva is available! Update now to ensure you have the latest features.</p>
          </div>
        </div>
        <button 
          onClick={() => setNeedRefresh(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-1 -mt-1"
        >
          <X size={18} />
        </button>
      </div>
      
      <button 
        onClick={() => {
          setNeedRefresh(false);
          updateServiceWorker(true);
          // Fallback reload if SW update doesn't trigger it automatically
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }}
        className="w-full mt-2 py-2.5 bg-gradient-to-r from-orange-600 to-saffron-600 hover:from-orange-700 hover:to-saffron-700 text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-95"
      >
        Update App Now
      </button>
    </div>
  );
};

export default UpdateAppBanner;
