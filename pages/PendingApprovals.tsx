import React, { useState, useEffect } from 'react';
import { UserProfile, ViharEntry } from '../types';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabase';
import { Calendar, MapPin, Users, User, Loader2, ClipboardCheck, ChevronDown, ChevronUp, Check, X as XIcon, Pencil, Clock } from 'lucide-react';
import StatusScreen from '../components/StatusScreen';

interface PendingApprovalsProps {
    currentUser: UserProfile;
    onEdit: (entry: ViharEntry) => void;
}

const PendingApprovals: React.FC<PendingApprovalsProps> = ({ currentUser, onEdit }) => {
    const { showToast } = useToast();
    const [entries, setEntries] = useState<ViharEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<'offline' | 'error' | null>(null);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [nameMap, setNameMap] = useState<Record<string, string>>({});
    const [busyId, setBusyId] = useState<number | null>(null);

    useEffect(() => {
        load();
        // Depend on the org id (a stable primitive), not the whole currentUser
        // object — that reference gets replaced elsewhere in the app (e.g. after
        // an avatar fetch resolves), which was re-triggering this full-page
        // "Loading pending approvals..." spinner even when nothing here changed.
    }, [currentUser.organization_id]);

    const load = async () => {
        try {
            setLoading(true);
            setLoadError(null);
            const data = await dataService.getPendingViharEntries(currentUser.organization_id);
            setEntries(data);

            // One targeted query to resolve both submitter names (by id) and
            // participant names (by username) for every pending entry at once.
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username, full_name')
                .eq('organization_id', currentUser.organization_id);

            const map: Record<string, string> = {};
            (profiles || []).forEach((p: any) => {
                map[p.username] = p.full_name;
                map[p.id] = p.full_name;
            });
            setNameMap(map);
        } catch (err: any) {
            console.error(err);
            showToast('Failed to load pending approvals', 'error');
            setLoadError(navigator.onLine ? 'error' : 'offline');
        } finally {
            setLoading(false);
        }
    };

    const getName = (key?: string) => (key && nameMap[key]) || (key ? key.split('@')[0] : 'Unknown');

    const handleApprove = async (entry: ViharEntry) => {
        if (!entry.id) return;
        setBusyId(entry.id);
        try {
            await dataService.approveViharEntry(entry.id);
            showToast('✓ Vihar recorded', 'success');
            setEntries(prev => prev.filter(e => e.id !== entry.id));
            setExpanded(null);
        } catch (err: any) {
            console.error(err);
            showToast(err.message || 'Failed to approve entry', 'error');
        } finally {
            setBusyId(null);
        }
    };

    const handleReject = async (entry: ViharEntry) => {
        if (!entry.id) return;
        if (!window.confirm('Reject this Vihar submission? It will not be recorded as an official Vihar.')) return;
        setBusyId(entry.id);
        try {
            await dataService.rejectViharEntry(entry.id);
            showToast('Rejected', 'info');
            setEntries(prev => prev.filter(e => e.id !== entry.id));
            setExpanded(null);
        } catch (err: any) {
            console.error(err);
            showToast(err.message || 'Failed to reject entry', 'error');
        } finally {
            setBusyId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-saffron-600 mb-4" size={40} />
                <p className="text-gray-500 font-medium">Loading pending approvals...</p>
            </div>
        );
    }

    if (loadError) {
        return <StatusScreen variant={loadError} onRetry={load} />;
    }

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-lg sm:text-xl font-extrabold text-[#241C17] flex items-center gap-2">
                        <ClipboardCheck size={20} className="text-saffron-600" />
                        Pending Approvals
                    </h1>
                    <p className="text-xs text-[#8A6A57]">Review Vihar entries submitted by Sevaks before they become official</p>
                </div>
                <span className="shrink-0 flex items-center gap-1.5 text-xs font-bold bg-saffron-100 text-saffron-700 px-3 py-1 rounded-full">
                    <Clock size={13} />
                    {entries.length} Pending Review
                </span>
            </div>

            {entries.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200 shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                        <ClipboardCheck size={32} />
                    </div>
                    <p className="text-xl font-bold text-gray-700">All caught up</p>
                    <p className="text-gray-400 max-w-xs mx-auto mt-2">Vihar entries submitted by Sevaks for approval will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {entries.map(entry => {
                        const isOpen = expanded === entry.id;
                        const isBusy = busyId === entry.id;
                        return (
                            <div
                                key={entry.id}
                                className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden ${isOpen ? 'border-saffron-200 ring-4 ring-saffron-50' : 'border-gray-100 hover:border-saffron-100'
                                    }`}
                            >
                                {/* Summary Header */}
                                <div
                                    className="p-5 md:p-6 cursor-pointer flex items-center justify-between gap-4"
                                    onClick={() => setExpanded(isOpen ? null : entry.id || null)}
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-50 text-orange-600 shrink-0">
                                            <Calendar size={22} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-gray-800 truncate">{entry.vihar_from} → {entry.vihar_to}</h3>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 font-medium flex-wrap">
                                                <span className="flex items-center gap-1"><Calendar size={12} /> {entry.vihar_date ? new Date(entry.vihar_date).toLocaleDateString('en-GB') : '-'}</span>
                                                <span className="flex items-center gap-1"><User size={12} /> {getName(entry.created_by)}</span>
                                                <span className="flex items-center gap-1"><Users size={12} /> {(entry.sevaks || []).length} Sevaks</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-gray-400 shrink-0">
                                        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {/* Expanded Review Details */}
                                {isOpen && (
                                    <div className="px-6 pb-6 border-t border-gray-50 pt-6 animate-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Vihar Date</h4>
                                                        <p className="text-sm font-bold text-gray-800">{entry.vihar_date ? new Date(entry.vihar_date).toLocaleDateString('en-GB') : '-'}</p>
                                                    </div>
                                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Distance</h4>
                                                        <p className="text-sm font-bold text-gray-800">{entry.distance_km ?? '-'} km</p>
                                                    </div>
                                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Sadhu Bhagwan</h4>
                                                        <p className="text-sm font-bold text-gray-800">{entry.no_sadhubhagwan || 0}</p>
                                                    </div>
                                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Sadhviji Bhagwan</h4>
                                                        <p className="text-sm font-bold text-gray-800">{entry.no_sadhvijibhagwan || 0}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                    <MapPin size={14} className="text-saffron-500 shrink-0" />
                                                    <span className="font-medium">{entry.vihar_from} → {entry.vihar_to}</span>
                                                </div>

                                                {/* Wheelchair Seva / Car Seva — yes/no plus who did it */}
                                                {([
                                                    { label: 'Wheelchair Seva', on: !!entry.wheelchair, names: entry.wheelchair_sevaks || [], tone: 'bg-blue-50 border-blue-100 text-blue-700' },
                                                    { label: 'Car Seva', on: !!entry.car_seva, names: entry.car_seva_sevaks || [], tone: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
                                                ]).map(row => (
                                                    <div key={row.label}>
                                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{row.label}</h4>
                                                        {row.on ? (
                                                            <div className="flex flex-wrap gap-2 items-center">
                                                                <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-white text-xs font-bold">Yes</span>
                                                                {row.names.length > 0 ? row.names.map((u, i) => (
                                                                    <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-lg text-xs font-semibold shadow-sm ${row.tone}`}>{getName(u)}</span>
                                                                )) : <span className="text-xs text-gray-400 italic">No names selected</span>}
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm font-semibold text-gray-500">No</span>
                                                        )}
                                                    </div>
                                                ))}

                                                {entry.photo_url && (
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Vihar Photo</h4>
                                                        <a href={entry.photo_url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                                                            <img src={entry.photo_url} alt="Vihar photo" loading="lazy" className="w-full max-h-64 object-cover" />
                                                        </a>
                                                    </div>
                                                )}

                                                {entry.notes && (
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Notes</h4>
                                                        <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 leading-relaxed border border-gray-100">
                                                            {entry.notes}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-6">
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Vihar Sevaks</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(entry.sevaks || []).length > 0 ? (
                                                            (entry.sevaks || []).map((u, idx) => (
                                                                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-100 rounded-lg text-xs font-semibold text-green-700 shadow-sm">
                                                                    <Check size={12} /> {getName(u)}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">No Sevaks selected</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Submitted By</h4>
                                                    <p className="text-sm font-bold text-gray-800">{getName(entry.created_by)}</p>
                                                    <p className="text-xs text-gray-400">{entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</p>
                                                </div>

                                                <div className="pt-4 border-t border-gray-50 space-y-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => onEdit(entry)}
                                                        disabled={isBusy}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors border border-gray-200 disabled:opacity-50"
                                                    >
                                                        <Pencil size={16} /> Edit Entry
                                                    </button>
                                                    <div className="flex gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReject(entry)}
                                                            disabled={isBusy}
                                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors border border-red-100 disabled:opacity-50"
                                                        >
                                                            <XIcon size={16} /> Reject
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApprove(entry)}
                                                            disabled={isBusy}
                                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-saffron-500 to-orange-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-saffron-100 hover:shadow-saffron-200 transition-all active:scale-[0.98] disabled:opacity-60"
                                                        >
                                                            {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                                            {isBusy ? 'Approving...' : 'Approve'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PendingApprovals;
