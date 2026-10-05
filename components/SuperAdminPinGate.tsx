import React, { useState } from 'react';
import { Lock } from 'lucide-react';

// The PIN screen in front of the Super Admin pages. It is a convenience lock only — every read and write
// behind it is authorised server-side (netlify/functions/super-admin.js). Being verified is remembered for
// this browser tab so moving between the dashboard and an organisation page doesn't ask again.
const SUPER_ADMIN_PIN = '2424';
const STORAGE_KEY = 'sa_pin_ok';

export const isSuperAdminPinVerified = (): boolean => {
  try { return sessionStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
};
export const clearSuperAdminPin = () => {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
};

const SuperAdminPinGate: React.FC<{ onVerified: () => void }> = ({ onVerified }) => {
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinEntry === SUPER_ADMIN_PIN) {
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
      setPinError(false);
      onVerified();
    } else {
      setPinError(true);
      setPinEntry('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-black p-6">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl text-center">
        <div className="w-20 h-20 bg-saffron-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-saffron-500/30">
          <Lock className="text-saffron-500" size={40} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Super Admin Access</h1>
        <p className="text-gray-400 mb-8">Enter the secure PIN to access the global dashboard</p>

        <form onSubmit={submit} className="space-y-6">
          <div className="relative">
            <input
              type="password"
              maxLength={4}
              placeholder="• • • •"
              value={pinEntry}
              onChange={(e) => setPinEntry(e.target.value)}
              className={`w-full bg-white/5 border-2 text-center text-3xl tracking-[1.5em] font-mono py-4 rounded-2xl text-white focus:outline-none transition-all ${
                pinError ? 'border-red-500 animate-shake' : 'border-white/10 focus:border-saffron-500'
              }`}
              autoFocus
            />
            {pinError && <p className="text-red-500 text-sm mt-2 font-medium">Incorrect PIN. Please try again.</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-saffron-600 hover:bg-saffron-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-saffron-900/20 active:scale-[0.98] transition-all"
          >
            Authorize Access
          </button>
        </form>
        <p className="mt-8 text-xs text-gray-500 uppercase tracking-widest font-bold">Secure Environment</p>
      </div>
    </div>
  );
};

export default SuperAdminPinGate;
