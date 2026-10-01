import React, { useEffect, useState, useCallback } from 'react';
import { UserProfile, UserRole, SosAlert } from '../types';
import { sosService } from '../services/sosService';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';
import { useToast } from '../context/ToastContext';
import { ChevronLeft, AlertTriangle, CheckCircle, Phone, MapPin, Clock, Building2, Loader2, ShieldCheck } from 'lucide-react';

interface SosDetailProps {
  currentUser: UserProfile;
  sosId: string;
  onBack: () => void;
}

interface TriggeredByInfo {
  full_name: string;
  mobile: string;
}

const STATUS_META: Record<SosAlert['status'], { label: string; badge: string }> = {
  active: { label: '🚨 SOS ACTIVE', badge: 'bg-red-100 text-red-700' },
  acknowledged: { label: 'SOS ACKNOWLEDGED', badge: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'SOS RESOLVED', badge: 'bg-green-100 text-green-700' },
  cancelled: { label: 'SOS CANCELLED', badge: 'bg-gray-100 text-gray-500' },
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const SosDetail: React.FC<SosDetailProps> = ({ currentUser, sosId, onBack }) => {
  const { showToast } = useToast();
  const [alert, setAlert] = useState<SosAlert | null | undefined>(undefined); // undefined = loading
  const [triggeredByInfo, setTriggeredByInfo] = useState<TriggeredByInfo | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const row = await sosService.getSosAlert(sosId);
      setAlert(row);
      if (row) {
        const [profileRes, org] = await Promise.all([
          supabase.from('profiles').select('full_name, mobile').eq('id', row.triggered_by).maybeSingle(),
          dataService.getOrganization(row.org_id).catch(() => null),
        ]);
        if (profileRes.data) setTriggeredByInfo(profileRes.data as TriggeredByInfo);
        setOrgName(org?.name || null);
      }
    } catch (e: any) {
      console.error('Failed to load SOS alert', e);
      setAlert(null);
    }
  }, [sosId]);

  useEffect(() => { load(); }, [load]);

  // Live status updates while this screen is open — not the delivery path
  // (that's the OneSignal push sent at creation time).
  useEffect(() => {
    const unsubscribe = sosService.subscribeToSosAlert(sosId, (updated) => setAlert(updated));
    return unsubscribe;
  }, [sosId]);

  const isAdmin = currentUser.role === UserRole.ORG_ADMIN;
  const isOwner = alert?.triggered_by === currentUser.id;

  const handleAcknowledge = async () => {
    if (!alert || busy) return;
    setBusy(true);
    try {
      const updated = await sosService.acknowledgeSosAlert(alert.id);
      setAlert(updated);
      showToast(`Captain acknowledged at ${formatTime(updated.acknowledged_at!)}`, 'success');
    } catch (e: any) {
      showToast(e?.message || 'Could not acknowledge SOS', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleResolve = async () => {
    if (!alert || busy) return;
    setBusy(true);
    try {
      const updated = await sosService.resolveSosAlert(alert.id);
      setAlert(updated);
      showToast(`SOS resolved at ${formatTime(updated.resolved_at!)}`, 'success');
    } catch (e: any) {
      showToast(e?.message || 'Could not resolve SOS', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!alert || busy) return;
    if (!window.confirm('Cancel this SOS?')) return;
    setBusy(true);
    try {
      const updated = await sosService.cancelSosAlert(alert.id);
      setAlert(updated);
      showToast('SOS cancelled', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Could not cancel SOS', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (alert === undefined) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-red-600" size={24} /></div>;
  }

  if (!alert) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="text-sm text-[#8A6A57]">This SOS alert doesn't exist, or you're not authorized to view it.</p>
        <button onClick={onBack} className="mt-3 text-sm font-bold text-saffron-600">Back</button>
      </div>
    );
  }

  const meta = STATUS_META[alert.status];
  const mapsUrl = alert.latitude != null && alert.longitude != null
    ? `https://maps.google.com/?q=${alert.latitude},${alert.longitude}`
    : null;

  return (
    <div className="max-w-md mx-auto space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center shrink-0">
          <ChevronLeft size={16} className="text-[#241C17]" />
        </button>
        <h1 className="text-lg font-extrabold text-[#241C17]">SOS Alert</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 space-y-4">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-extrabold ${meta.badge}`}>
          {alert.status === 'active' && <AlertTriangle size={16} />}
          {(alert.status === 'acknowledged' || alert.status === 'resolved') && <CheckCircle size={16} />}
          {meta.label}
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-[#8A6A57] shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A6A57]">Triggered by</p>
              <p className="font-bold text-[#241C17]">{triggeredByInfo?.full_name || 'Sevak'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Building2 size={16} className="text-[#8A6A57] shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A6A57]">Organization</p>
              <p className="font-bold text-[#241C17]">{orgName || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Clock size={16} className="text-[#8A6A57] shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A6A57]">Time</p>
              <p className="font-bold text-[#241C17]">{formatTime(alert.created_at)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin size={16} className="text-[#8A6A57] shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A6A57]">Location</p>
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-saffron-600 hover:text-saffron-700">
                  Open Location
                </a>
              ) : (
                <p className="font-bold text-[#8A6A57]">Location unavailable</p>
              )}
            </div>
          </div>
          {alert.note && (
            <div className="pt-2 border-t border-gray-50">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A6A57] mb-1">Note</p>
              <p className="text-[#241C17] whitespace-pre-wrap break-words">{alert.note}</p>
            </div>
          )}
        </div>

        {alert.status === 'acknowledged' && alert.acknowledged_at && (
          <p className="text-xs font-semibold text-blue-700 bg-blue-50 rounded-xl px-3 py-2 flex items-center gap-1.5">
            <ShieldCheck size={14} /> Captain acknowledged at {formatTime(alert.acknowledged_at)}
          </p>
        )}
        {alert.status === 'resolved' && alert.resolved_at && (
          <p className="text-xs font-semibold text-green-700 bg-green-50 rounded-xl px-3 py-2 flex items-center gap-1.5">
            <CheckCircle size={14} /> SOS resolved at {formatTime(alert.resolved_at)}
          </p>
        )}
        {alert.status === 'cancelled' && alert.cancelled_at && (
          <p className="text-xs font-semibold text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
            Cancelled at {formatTime(alert.cancelled_at)}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {isAdmin && alert.status === 'active' && (
            <button
              onClick={handleAcknowledge}
              disabled={busy}
              className="flex-1 min-w-[45%] py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-60"
            >
              Acknowledge
            </button>
          )}
          {isAdmin && (alert.status === 'active' || alert.status === 'acknowledged') && (
            <button
              onClick={handleResolve}
              disabled={busy}
              className="flex-1 min-w-[45%] py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-60"
            >
              Resolve
            </button>
          )}
          {isAdmin && triggeredByInfo?.mobile && (
            <a
              href={`tel:+91${triggeredByInfo.mobile}`}
              className="flex-1 min-w-[45%] py-2.5 rounded-xl bg-white border border-gray-200 text-[#241C17] text-sm font-bold flex items-center justify-center gap-1.5"
            >
              <Phone size={15} /> Call Sevak
            </a>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-[45%] py-2.5 rounded-xl bg-white border border-gray-200 text-[#241C17] text-sm font-bold flex items-center justify-center gap-1.5"
            >
              <MapPin size={15} /> Open Location
            </a>
          )}
          {isOwner && alert.status === 'active' && (
            <button
              onClick={handleCancel}
              disabled={busy}
              className="flex-1 min-w-[45%] py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold disabled:opacity-60"
            >
              Cancel SOS
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SosDetail;
