import React, { useEffect, useRef, useState } from 'react';
import { UserProfile } from '../types';
import { sosService, getBestEffortLocation } from '../services/sosService';
import { useToast } from '../context/ToastContext';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Modal from './Modal';

interface SosButtonProps {
  currentUser: UserProfile;
  onOpenDetail: (sosId: string) => void;
}

const COUNTDOWN_SECONDS = 3;

// Lives in Profile & Settings' top-right corner (see ProfileSection.tsx) —
// not a global floating control, so it can't cover other screens' content
// or get in the way of anything else in the app.
const SosButton: React.FC<SosButtonProps> = ({ currentUser, onOpenDetail }) => {
  const { showToast } = useToast();
  const [activeSosId, setActiveSosId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const locationRef = useRef<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);
  const sentRef = useRef(false);

  // Reflect an already-active SOS (e.g. app was reopened) instead of
  // offering to create a second one — one active alert per user, enforced
  // server-side too (see the one_active_sos_per_user index).
  useEffect(() => {
    sosService.getMyActiveSosAlert().then(alert => {
      if (alert) setActiveSosId(alert.id);
    }).catch(err => console.error('Failed to check for an active SOS', err));
  }, [currentUser.id]);

  const startConfirm = () => {
    if (activeSosId) {
      onOpenDetail(activeSosId);
      return;
    }
    sentRef.current = false;
    locationRef.current = null;
    setCountdown(COUNTDOWN_SECONDS);
    setConfirming(true);
    // Best-effort — fetched in parallel with the countdown, never blocks it.
    getBestEffortLocation().then(loc => { locationRef.current = loc; });
  };

  const cancelConfirm = () => {
    setConfirming(false);
  };

  const send = async () => {
    if (sentRef.current || sending) return;
    sentRef.current = true;
    setSending(true);
    try {
      const alert = await sosService.createSosAlert({ location: locationRef.current });
      setActiveSosId(alert.id);
      setConfirming(false);
      showToast('SOS sent to Captain', 'success');
      onOpenDetail(alert.id);
    } catch (err: any) {
      console.error('Failed to send SOS', err);
      showToast(err?.message || 'Could not send SOS — please try again', 'error');
      sentRef.current = false;
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!confirming) return;
    if (countdown <= 0) {
      send();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirming, countdown]);

  return (
    <>
      <button
        type="button"
        onClick={startConfirm}
        title={activeSosId ? 'SOS active — tap to view' : 'Send SOS to your Captain'}
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:scale-95 transition-transform ${
          activeSosId ? 'animate-pulse bg-red-600' : 'bg-red-500 hover:bg-red-600'
        }`}
      >
        <AlertTriangle size={17} className="text-white" strokeWidth={2.5} />
      </button>

      <Modal open={confirming} onClose={cancelConfirm} maxWidth="max-w-xs" closeOnBackdrop={!sending}>
        <div className="p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-3">
            <AlertTriangle size={30} className="text-red-600" strokeWidth={2.5} />
          </div>
          <h3 className="text-lg font-extrabold text-[#241C17]">Send SOS?</h3>
          <p className="text-sm text-[#8A6A57] mt-1">
            Your Captain will be alerted immediately{sending ? '' : ` in ${countdown}s`}.
          </p>

          <div className="flex gap-3 w-full mt-5">
            <button
              onClick={cancelConfirm}
              disabled={sending}
              className="flex-1 py-3 rounded-xl bg-gray-100 text-sm font-bold text-[#241C17] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={send}
              disabled={sending}
              className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-bold text-white disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {sending && <Loader2 size={16} className="animate-spin" />}
              {sending ? 'Sending...' : 'Send SOS'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SosButton;
