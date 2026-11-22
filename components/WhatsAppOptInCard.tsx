import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';

// Sevak → Profile: opt in to WhatsApp Vihar reminders. Shown only when the super-admin has switched WhatsApp on
// for this Sevak's group (and the WhatsApp database step is applied); otherwise it renders nothing.
const WhatsAppOptInCard: React.FC = () => {
  const { showToast } = useToast();
  const [status, setStatus] = useState<{ org_enabled: boolean; opted_in: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    dataService.getMyWhatsAppStatus().then(s => { if (alive) setStatus(s); });
    return () => { alive = false; };
  }, []);

  if (!status?.org_enabled) return null;

  const toggle = async () => {
    const next = !status.opted_in;
    setBusy(true);
    try {
      await dataService.setMyWhatsAppOptIn(next);
      setStatus({ ...status, opted_in: next });
      showToast(next ? 'WhatsApp reminders turned on' : 'WhatsApp reminders turned off', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Could not save', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm p-4 flex items-start gap-3">
      <span className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center shrink-0"><MessageCircle size={20} className="text-[#1DA851]" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink text-sm">WhatsApp Vihar reminders</p>
        <p className="text-xs text-ink-2 mt-0.5 leading-relaxed">
          Get a reminder on WhatsApp from vSeva when you have not done a Vihar for a while. You can turn it off any time.
        </p>
      </div>
      <button type="button" role="switch" aria-checked={status.opted_in} aria-label="WhatsApp Vihar reminders" disabled={busy} onClick={toggle}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${status.opted_in ? 'bg-green-500' : 'bg-gray-300'}`}>
        <span className={`inline-block h-5 w-5 rounded-full bg-surface shadow transition-transform ${status.opted_in ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
};

export default WhatsAppOptInCard;
