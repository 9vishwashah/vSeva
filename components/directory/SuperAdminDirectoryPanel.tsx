import React, { useEffect, useState } from 'react';
import { MapPin, Clock, User, Phone, Check, X, ClipboardList, Pencil } from 'lucide-react';
import { directoryService } from '../../services/directoryService';
import { DirectorySubmission, DirectoryChangeRequest, DirectoryCardFields } from '../../types';
import { useToast } from '../../context/ToastContext';
import Modal from '../Modal';
import DirectoryMap from './DirectoryMap';
import { getListingTags } from './listingTags';

interface SuperAdminDirectoryPanelProps {
  currentUser?: { id: string; full_name: string } | null;
}

const REJECTION_REASONS = ['Incorrect information', 'Duplicate listing', 'Invalid location', 'Insufficient details', 'Other'];

const timeAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const EDITABLE_FIELDS: { key: keyof DirectoryCardFields; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'city', label: 'City' },
  { key: 'area', label: 'Area / Locality' },
  { key: 'state', label: 'State' },
  { key: 'pincode', label: 'Pincode' },
];

const SuperAdminDirectoryPanel: React.FC<SuperAdminDirectoryPanelProps> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'listings' | 'edits'>('listings');
  const [submissions, setSubmissions] = useState<DirectorySubmission[]>([]);
  const [changeRequests, setChangeRequests] = useState<DirectoryChangeRequest[]>([]);
  const [counts, setCounts] = useState({ pending_listings: 0, pending_edits: 0, approved_listings: 0, rejected_listings: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reviewSubmission, setReviewSubmission] = useState<DirectorySubmission | null>(null);
  const [reviewChangeRequest, setReviewChangeRequest] = useState<DirectoryChangeRequest | null>(null);
  const [overrides, setOverrides] = useState<Partial<DirectoryCardFields>>({});
  const [busy, setBusy] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0]);
  const [rejectNote, setRejectNote] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [subs, edits, c] = await Promise.all([
        directoryService.getPendingSubmissions(),
        directoryService.getPendingChangeRequests(),
        directoryService.getCounts(),
      ]);
      setSubmissions(subs);
      setChangeRequests(edits);
      setCounts(c);
    } catch (err) {
      console.error('Failed to load directory review queue', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const adminId = currentUser?.id;
  const adminName = currentUser?.full_name || 'Super Admin';

  const openReview = (sub: DirectorySubmission) => {
    setReviewSubmission(sub);
    setOverrides({});
  };

  const handleApproveSubmission = async () => {
    if (!reviewSubmission || !adminId) return;
    setBusy(true);
    try {
      await directoryService.approveSubmission(reviewSubmission.id, adminId, adminName, overrides);
      showToast('Listing approved and published', 'success');
      setReviewSubmission(null);
      setSubmissions((prev) => prev.filter((s) => s.id !== reviewSubmission.id));
      setCounts((c) => ({ ...c, pending_listings: c.pending_listings - 1, approved_listings: c.approved_listings + 1 }));
    } catch (err: any) {
      showToast(err.message || 'Failed to approve listing', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRejectSubmission = async (id: string) => {
    if (!adminId) return;
    setBusy(true);
    try {
      await directoryService.rejectSubmission(id, adminId, adminName, `${rejectReason}${rejectNote ? `: ${rejectNote}` : ''}`);
      showToast('Submission rejected', 'info');
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      setCounts((c) => ({ ...c, pending_listings: c.pending_listings - 1, rejected_listings: c.rejected_listings + 1 }));
      setReviewSubmission(null);
      setRejectingId(null);
      setRejectNote('');
    } catch (err: any) {
      showToast(err.message || 'Failed to reject submission', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleApproveChangeRequest = async (req: DirectoryChangeRequest) => {
    if (!adminId) return;
    setBusy(true);
    try {
      await directoryService.approveChangeRequest(req.id, adminId, adminName);
      showToast('Edit approved — public listing updated', 'success');
      setChangeRequests((prev) => prev.filter((r) => r.id !== req.id));
      setCounts((c) => ({ ...c, pending_edits: c.pending_edits - 1 }));
      setReviewChangeRequest(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to approve edit', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRejectChangeRequest = async (id: string) => {
    if (!adminId) return;
    setBusy(true);
    try {
      await directoryService.rejectChangeRequest(id, adminId, adminName, `${rejectReason}${rejectNote ? `: ${rejectNote}` : ''}`);
      showToast('Edit request rejected', 'info');
      setChangeRequests((prev) => prev.filter((r) => r.id !== id));
      setCounts((c) => ({ ...c, pending_edits: c.pending_edits - 1 }));
      setReviewChangeRequest(null);
      setRejectingId(null);
      setRejectNote('');
    } catch (err: any) {
      showToast(err.message || 'Failed to reject edit', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <ClipboardList size={18} className="text-saffron-600" />
          Community Directory
        </h2>
        <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
          <span>{counts.approved_listings} Approved</span>
          <span className="text-gray-300">·</span>
          <span>{counts.rejected_listings} Rejected</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('listings')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'listings' ? 'bg-saffron-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
          Pending Listings {counts.pending_listings > 0 && <span className="ml-1 opacity-80">({counts.pending_listings})</span>}
        </button>
        <button onClick={() => setTab('edits')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'edits' ? 'bg-saffron-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
          Pending Edits {counts.pending_edits > 0 && <span className="ml-1 opacity-80">({counts.pending_edits})</span>}
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : loadError ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Couldn't load the review queue.{' '}
            <button onClick={load} className="text-saffron-600 font-bold underline">Retry</button>
          </div>
        ) : tab === 'listings' ? (
          submissions.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">All clear — no pending listings.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {submissions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{s.name}</p>
                    <p className="text-xs text-gray-400">Submitted by {s.contributor_name} · {timeAgo(s.created_at)}</p>
                  </div>
                  <button onClick={() => openReview(s)} className="px-4 py-2 bg-saffron-50 text-saffron-700 rounded-xl font-bold text-xs hover:bg-saffron-100">Review</button>
                </div>
              ))}
            </div>
          )
        ) : changeRequests.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">All clear — no pending edits.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {changeRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-bold text-gray-800 text-sm">Edit request</p>
                  <p className="text-xs text-gray-400">Submitted by {r.contributor_name} · {timeAgo(r.created_at)}</p>
                </div>
                <button onClick={() => setReviewChangeRequest(r)} className="px-4 py-2 bg-saffron-50 text-saffron-700 rounded-xl font-bold text-xs hover:bg-saffron-100">Review</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submission review */}
      <Modal open={!!reviewSubmission} onClose={() => setReviewSubmission(null)} maxWidth="max-w-2xl">
        {reviewSubmission && (
          <div className="p-5 overflow-y-auto max-h-[85vh]">
            <h3 className="text-lg font-bold text-gray-800 mb-1">{reviewSubmission.name}</h3>
            <p className="text-xs text-gray-400 mb-4 flex items-center gap-3">
              <span className="flex items-center gap-1"><User size={12} /> {reviewSubmission.contributor_name}</span>
              {reviewSubmission.contributor_mobile && <span className="flex items-center gap-1"><Phone size={12} /> {reviewSubmission.contributor_mobile}</span>}
              <span className="flex items-center gap-1"><Clock size={12} /> {timeAgo(reviewSubmission.created_at)}</span>
            </p>

            {reviewSubmission.latitude != null && reviewSubmission.longitude != null && (
              <div className="rounded-xl overflow-hidden border border-gray-100 mb-4">
                <DirectoryMap listings={[{ ...reviewSubmission, id: 'preview', slug: 'preview', status: 'approved', updated_at: reviewSubmission.created_at } as any]} height={160} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mb-4">
              {EDITABLE_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1">{f.label}</label>
                  <input
                    className="w-full py-2 px-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm"
                    defaultValue={(reviewSubmission as any)[f.key] || ''}
                    onChange={(e) => setOverrides((o) => ({ ...o, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="text-sm text-gray-600 space-y-1.5 mb-4 bg-gray-50 rounded-xl p-3">
              <p><span className="text-gray-400">Tags:</span> {getListingTags(reviewSubmission).map((t) => t.label).join(', ') || 'None yet'}</p>
              {reviewSubmission.mulnayak && <p><span className="text-gray-400">Mulnayak:</span> {reviewSubmission.mulnayak}</p>}
              {reviewSubmission.vihar_group_name && <p><span className="text-gray-400">Vihar Group:</span> {reviewSubmission.vihar_group_name}</p>}
              {reviewSubmission.captain_name && <p><span className="text-gray-400">Captain:</span> {reviewSubmission.captain_name} {reviewSubmission.captain_mobile}</p>}
              {reviewSubmission.trustees.length > 0 && <p><span className="text-gray-400">Trustees:</span> {reviewSubmission.trustees.map(t => t.name).join(', ')}</p>}
              {reviewSubmission.routes.length > 0 && <p><span className="text-gray-400">Routes:</span> {reviewSubmission.routes.map(r => `${r.from}→${r.to}`).join(', ')}</p>}
              {[reviewSubmission.upashray && 'Upashray', reviewSubmission.bhojanshala && 'Bhojanshala', reviewSubmission.library && 'Library'].filter(Boolean).length > 0 && (
                <p><span className="text-gray-400">Facilities:</span> {[reviewSubmission.upashray && 'Upashray', reviewSubmission.bhojanshala && 'Bhojanshala', reviewSubmission.library && 'Library'].filter(Boolean).join(', ')}</p>
              )}
            </div>

            {rejectingId === reviewSubmission.id ? (
              <div className="bg-red-50 rounded-xl p-3 mb-3 space-y-2">
                <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full py-2 px-2 rounded-lg border border-red-200 text-sm">
                  {REJECTION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Note (optional)" className="w-full py-2 px-2 rounded-lg border border-red-200 text-sm" rows={2} />
                <div className="flex gap-2">
                  <button onClick={() => setRejectingId(null)} className="flex-1 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold">Cancel</button>
                  <button onClick={() => handleRejectSubmission(reviewSubmission.id)} disabled={busy} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">Confirm Reject</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setRejectingId(reviewSubmission.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm"><X size={15} /> Reject</button>
                <button onClick={handleApproveSubmission} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm"><Check size={15} /> Approve</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Change request review — field / current / proposed diff */}
      <Modal open={!!reviewChangeRequest} onClose={() => setReviewChangeRequest(null)} maxWidth="max-w-xl">
        {reviewChangeRequest && (
          <div className="p-5 overflow-y-auto max-h-[85vh]">
            <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2"><Pencil size={16} className="text-saffron-600" /> Edit Request</h3>
            <p className="text-xs text-gray-400 mb-4">Submitted by {reviewChangeRequest.contributor_name} · {timeAgo(reviewChangeRequest.created_at)}</p>

            <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
              <div className="grid grid-cols-3 bg-gray-50 text-[11px] font-bold text-gray-400 px-3 py-2">
                <span>Field</span><span>Current</span><span>Proposed</span>
              </div>
              {Object.keys(reviewChangeRequest.proposed_fields).map((key) => (
                <div key={key} className="grid grid-cols-3 px-3 py-2 text-xs border-t border-gray-100">
                  <span className="font-semibold text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-gray-400">{JSON.stringify((reviewChangeRequest.current_snapshot as any)?.[key] ?? '—')}</span>
                  <span className="text-saffron-700 font-semibold">{JSON.stringify((reviewChangeRequest.proposed_fields as any)[key])}</span>
                </div>
              ))}
            </div>

            {rejectingId === reviewChangeRequest.id ? (
              <div className="bg-red-50 rounded-xl p-3 mb-3 space-y-2">
                <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full py-2 px-2 rounded-lg border border-red-200 text-sm">
                  {REJECTION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => setRejectingId(null)} className="flex-1 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold">Cancel</button>
                  <button onClick={() => handleRejectChangeRequest(reviewChangeRequest.id)} disabled={busy} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">Confirm Reject</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setRejectingId(reviewChangeRequest.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm"><X size={15} /> Reject</button>
                <button onClick={() => handleApproveChangeRequest(reviewChangeRequest)} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm"><Check size={15} /> Approve Changes</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SuperAdminDirectoryPanel;
