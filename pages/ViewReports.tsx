import React, { useState, useEffect } from 'react';
import { UserProfile, IncidentReport } from '../types';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { Calendar, Clock, ExternalLink, Loader2, Footprints, AlertCircle, CheckCircle, ChevronRight, Trash2, X as XIcon, Eye, RotateCcw } from 'lucide-react';
import StatusScreen from '../components/StatusScreen';
import Modal from '../components/Modal';

interface ViewReportsProps {
    currentUser: UserProfile;
}

type Status = IncidentReport['status'];

const STATUS_PILL: Record<Status, string> = {
    pending: 'bg-brand-100 text-brand-700',
    reviewed: 'bg-info-soft text-info',
    resolved: 'bg-ok-soft text-ok',
};
const STATUS_TILE: Record<Status, string> = {
    pending: 'bg-brand-50 text-brand-700',
    reviewed: 'bg-info-soft text-info',
    resolved: 'bg-ok-soft text-ok',
};
const STATUS_LABEL: Record<Status, string> = { pending: 'Pending', reviewed: 'Reviewed', resolved: 'Resolved' };

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
const isImage = (u: string) => /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(u);
const isVideo = (u: string) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(u);

// Same look as every other pop-up: display title, icon tile, round close (docs/design-core.md)
const HEAD = 'p-5 flex justify-between items-start gap-3 shrink-0 border-b border-line';
const CLOSE = 'inline-flex h-10 w-10 items-center justify-center rounded-full bg-sunken text-ink hover:bg-line transition-colors shrink-0';
const LABEL = 'text-[12px] font-semibold text-ink-3 mb-2';

const ViewReports: React.FC<ViewReportsProps> = ({ currentUser }) => {
    const { showToast } = useToast();
    const [reports, setReports] = useState<IncidentReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<'offline' | 'error' | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<IncidentReport | null>(null);
    const [busy, setBusy] = useState<string | null>(null); // id of the report being changed

    useEffect(() => {
        loadReports();
    }, [currentUser]);

    const loadReports = async () => {
        try {
            setLoading(true);
            setLoadError(null);
            const data = await dataService.getIncidentReports(currentUser.organization_id);
            setReports(data);
        } catch (error: any) {
            console.error("Error loading reports:", error);
            showToast("Failed to load incident reports", "error");
            setLoadError(navigator.onLine ? 'error' : 'offline');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (reportId: string, status: Status) => {
        setBusy(reportId);
        try {
            await dataService.updateIncidentReportStatus(reportId, status);
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
            showToast(`Report marked as ${STATUS_LABEL[status].toLowerCase()}`, "success");
        } catch (error: any) {
            console.error("Error updating report status:", error);
            showToast("Failed to update status", "error");
        } finally {
            setBusy(null);
        }
    };

    const handleDelete = async (report: IncidentReport) => {
        if (!report.id) return;
        setBusy(report.id);
        try {
            await dataService.deleteIncidentReport(report.id, currentUser.organization_id);
            setReports(prev => prev.filter(r => r.id !== report.id));
            if (openId === report.id) setOpenId(null);
            setConfirmDelete(null);
            showToast('Report deleted', 'success');
        } catch (error: any) {
            console.error('Error deleting report:', error);
            showToast(error?.message || 'Failed to delete report', 'error');
        } finally {
            setBusy(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-brand-700 mb-4" size={40} />
                <p className="text-ink-2 font-medium">Loading reports...</p>
            </div>
        );
    }

    if (loadError) {
        return <StatusScreen variant={loadError} onRetry={loadReports} />;
    }

    const open = reports.find(r => r.id === openId) || null;
    const pendingCount = reports.filter(r => r.status === 'pending').length;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="display text-[1.7rem] sm:text-[2.3rem] font-extrabold text-ink flex items-center gap-2">
                        <Footprints size={20} className="text-brand-700" />
                        Incident Reports
                    </h1>
                    <p className="text-xs text-ink-2">View and manage reports submitted by sevaks</p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-semibold bg-brand-100 text-brand-700 rounded-full">
                    <AlertCircle size={14} />
                    {pendingCount} Pending Review
                </span>
            </div>

            {reports.length === 0 ? (
                <div className="bg-surface rounded-card p-12 text-center ring-1 ring-inset ring-line">
                    <div className="w-16 h-16 bg-sunken rounded-full flex items-center justify-center mx-auto mb-4 text-ink-3">
                        <Footprints size={30} />
                    </div>
                    <p className="text-xl font-bold text-ink">No reports found</p>
                    <p className="text-ink-3 max-w-xs mx-auto mt-2 text-sm">When sevaks submit incident reports during vihars, they will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {reports.map(report => (
                        <div key={report.id} className="bg-surface rounded-card ring-1 ring-inset ring-line flex items-center gap-3 p-3 sm:p-4">
                            <button
                                type="button"
                                onClick={() => setOpenId(report.id || null)}
                                className="flex flex-1 min-w-0 items-center gap-3 text-left"
                            >
                                <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${STATUS_TILE[report.status]}`}>
                                    <AlertCircle size={20} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[15px] font-semibold text-ink leading-snug line-clamp-2 break-words">
                                        {report.vihar_from} → {report.vihar_to}
                                    </span>
                                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
                                        <span className="inline-flex items-center gap-1"><Calendar size={13} /> {fmtDate(report.report_date)}</span>
                                        {report.report_time && <span className="inline-flex items-center gap-1"><Clock size={13} /> {report.report_time}</span>}
                                        <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[12px] font-semibold ${STATUS_PILL[report.status]}`}>
                                            {STATUS_LABEL[report.status]}
                                        </span>
                                    </span>
                                </span>
                                <ChevronRight size={18} className="text-ink-3 shrink-0" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(report)}
                                disabled={busy === report.id}
                                aria-label={`Delete report ${report.vihar_from} to ${report.vihar_to}`}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-3 hover:bg-err-soft hover:text-err transition-colors shrink-0 disabled:opacity-50"
                            >
                                {busy === report.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Report pop-up */}
            <Modal open={!!open} onClose={() => setOpenId(null)} maxWidth="max-w-2xl">
                {open && (
                    <>
                        <div className={HEAD}>
                            <div className="flex items-center gap-3 min-w-0">
                                <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${STATUS_TILE[open.status]}`}>
                                    <AlertCircle size={20} />
                                </span>
                                <div className="min-w-0">
                                    <h3 className="display text-[1.4rem] font-bold text-ink break-words">{open.vihar_from} → {open.vihar_to}</h3>
                                    <p className="text-[13px] text-ink-2 mt-0.5">
                                        {fmtDate(open.report_date)}{open.report_time ? ` · ${open.report_time}` : ''} · {STATUS_LABEL[open.status]}
                                    </p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setOpenId(null)} aria-label="Close" className={CLOSE}>
                                <XIcon size={18} />
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
                            <div>
                                <p className={LABEL}>Incident details</p>
                                <div className="bg-sunken/60 p-4 rounded-2xl text-[15px] text-ink leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                                    {open.description || '-'}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-sunken/60 p-4 rounded-2xl">
                                    <p className="text-[12px] font-semibold text-ink-3 mb-1">Sadhu Bhagwan</p>
                                    <p className="num text-2xl font-bold text-ink">{open.sadhu_count ?? 0}</p>
                                </div>
                                <div className="bg-sunken/60 p-4 rounded-2xl">
                                    <p className="text-[12px] font-semibold text-ink-3 mb-1">Sadhviji Bhagwan</p>
                                    <p className="num text-2xl font-bold text-ink">{open.sadhvi_count ?? 0}</p>
                                </div>
                            </div>

                            <div>
                                <p className={LABEL}>Involved Sevaks</p>
                                <div className="flex flex-wrap gap-2">
                                    {open.involved_sevaks && open.involved_sevaks.length > 0 ? (
                                        open.involved_sevaks.map((username, idx) => (
                                            <span key={idx} className="inline-flex items-center h-8 px-3 rounded-full bg-sunken text-[13px] font-semibold text-ink-2">
                                                {username.split('@')[0]}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-[13px] text-ink-3">No other sevaks mentioned</span>
                                    )}
                                </div>
                            </div>

                            {open.proof_media_url && (
                                <div>
                                    <p className={LABEL}>Proof media</p>
                                    {isImage(open.proof_media_url) ? (
                                        <div className="mb-3 rounded-2xl overflow-hidden bg-sunken/60 max-w-sm">
                                            <img
                                                src={open.proof_media_url}
                                                alt="Proof"
                                                className="w-full h-64 object-cover"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        </div>
                                    ) : isVideo(open.proof_media_url) ? (
                                        <div className="mb-3 rounded-2xl overflow-hidden bg-black max-w-sm">
                                            <video src={open.proof_media_url} controls className="w-full h-64 object-contain" />
                                        </div>
                                    ) : null}
                                    <a
                                        href={open.proof_media_url.startsWith('http') ? open.proof_media_url : '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 text-[14px] font-semibold hover:bg-brand-100 transition-colors"
                                    >
                                        <ExternalLink size={15} />
                                        View media proof
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t border-line shrink-0 flex flex-wrap gap-2">
                            {open.status !== 'reviewed' && (
                                <button
                                    type="button"
                                    onClick={() => handleStatusUpdate(open.id!, 'reviewed')}
                                    disabled={busy === open.id}
                                    className="flex-1 min-w-[8rem] inline-flex items-center justify-center gap-1.5 h-11 rounded-full bg-info-soft text-info text-[14px] font-semibold disabled:opacity-60"
                                >
                                    <Eye size={15} /> Mark reviewed
                                </button>
                            )}
                            {open.status !== 'resolved' && (
                                <button
                                    type="button"
                                    onClick={() => handleStatusUpdate(open.id!, 'resolved')}
                                    disabled={busy === open.id}
                                    className="flex-1 min-w-[8rem] inline-flex items-center justify-center gap-1.5 h-11 rounded-full bg-ok-soft text-ok text-[14px] font-semibold disabled:opacity-60"
                                >
                                    <CheckCircle size={15} /> Mark resolved
                                </button>
                            )}
                            {open.status !== 'pending' && (
                                <button
                                    type="button"
                                    onClick={() => handleStatusUpdate(open.id!, 'pending')}
                                    disabled={busy === open.id}
                                    className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full bg-surface ring-1 ring-inset ring-line text-ink text-[14px] font-semibold disabled:opacity-60"
                                >
                                    <RotateCcw size={15} /> Reset
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(open)}
                                disabled={busy === open.id}
                                className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full bg-err-soft text-err text-[14px] font-semibold disabled:opacity-60"
                            >
                                <Trash2 size={15} /> Delete
                            </button>
                        </div>
                    </>
                )}
            </Modal>

            {/* Delete confirmation */}
            <Modal open={!!confirmDelete} onClose={() => !busy && setConfirmDelete(null)} maxWidth="max-w-sm" closeOnBackdrop={!busy}>
                {confirmDelete && (
                    <div className="p-6 text-center">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-err-soft text-err">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="display text-[1.5rem] font-bold text-ink">Delete this report?</h3>
                        <p className="mt-1 text-sm text-ink-2 [overflow-wrap:anywhere]">
                            {confirmDelete.vihar_from} → {confirmDelete.vihar_to}, {fmtDate(confirmDelete.report_date)}. This can't be undone.
                        </p>
                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(null)}
                                disabled={!!busy}
                                className="flex-1 h-12 rounded-full text-[15px] font-semibold bg-surface ring-1 ring-inset ring-line text-ink disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDelete(confirmDelete)}
                                disabled={!!busy}
                                className="flex flex-1 items-center justify-center gap-2 h-12 rounded-full text-[15px] font-semibold bg-err-solid text-white disabled:opacity-60"
                            >
                                {busy === confirmDelete.id && <Loader2 size={16} className="animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ViewReports;
