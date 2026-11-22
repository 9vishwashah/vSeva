import React, { useState, useEffect } from 'react';
import { UserProfile, IncidentReport } from '../types';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { Calendar, Clock, MapPin, Users, FileText, ExternalLink, Loader2, Footprints, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from 'lucide-react';
import StatusScreen from '../components/StatusScreen';

interface ViewReportsProps {
    currentUser: UserProfile;
}

const ViewReports: React.FC<ViewReportsProps> = ({ currentUser }) => {
    const { showToast } = useToast();
    const [reports, setReports] = useState<IncidentReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<'offline' | 'error' | null>(null);
    const [expandedReport, setExpandedReport] = useState<string | null>(null);

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

    const handleStatusUpdate = async (reportId: string, status: IncidentReport['status']) => {
        try {
            await dataService.updateIncidentReportStatus(reportId, status);
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
            showToast(`Report marked as ${status}`, "success");
        } catch (error: any) {
            console.error("Error updating report status:", error);
            showToast("Failed to update status", "error");
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="display text-[1.7rem] sm:text-[2.3rem] font-extrabold text-ink flex items-center gap-2">
                        <Footprints size={20} className="text-brand-700" />
                        Incident Reports
                    </h1>
                    <p className="text-xs text-ink-2">View and manage reports submitted by sevaks</p>
                </div>
                <span className="shrink-0 flex items-center gap-1.5 text-xs font-bold bg-brand-100 text-brand-700 px-3 py-1 rounded-full">
                    <AlertCircle size={13} />
                    {reports.filter(r => r.status === 'pending').length} Pending Review
                </span>
            </div>

            {reports.length === 0 ? (
                <div className="bg-surface rounded-2xl p-12 text-center border border-dashed border-line shadow-sm">
                    <div className="w-16 h-16 bg-sunken/60 rounded-full flex items-center justify-center mx-auto mb-4 text-ink-3">
                        <Footprints size={32} />
                    </div>
                    <p className="text-xl font-bold text-ink">No reports found</p>
                    <p className="text-ink-3 max-w-xs mx-auto mt-2">When sevaks submit incident reports during vihars, they will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {reports.map((report) => (
                        <div 
                            key={report.id} 
                            className={`bg-surface rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden ${
                                expandedReport === report.id ? 'border-brand-200 ring-4 ring-saffron-50' : 'border-line hover:border-brand-100'
                            }`}
                        >
                            {/* Summary Header */}
                            <div 
                                className="p-5 md:p-6 cursor-pointer flex items-center justify-between"
                                onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id || null)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                        report.status === 'pending' ? 'bg-brand-50 text-brand-700' : 
                                        report.status === 'reviewed' ? 'bg-info-soft text-info' : 'bg-ok-soft text-ok'
                                    }`}>
                                        <AlertCircle size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-ink">{report.vihar_from} to {report.vihar_to}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                                report.status === 'pending' ? 'bg-brand-100 text-brand-700' : 
                                                report.status === 'reviewed' ? 'bg-info-soft text-info' : 'bg-ok-soft text-ok'
                                            }`}>
                                                {report.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-ink-2 font-medium">
                                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(report.report_date).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1"><Clock size={12} /> {report.report_time}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-ink-3">
                                    {expandedReport === report.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedReport === report.id && (
                                <div className="px-6 pb-6 border-t border-line pt-6 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="text-[11px] font-bold text-ink-3 uppercase tracking-widest mb-3">Incident Details</h4>
                                                <div className="bg-sunken/60 p-4 rounded-xl text-sm text-ink leading-relaxed border border-line">
                                                    {report.description}
                                                </div>
                                            </div>

                                            {report.proof_media_url && (
                                                <div>
                                                    <h4 className="text-[11px] font-bold text-ink-3 uppercase tracking-widest mb-3">Proof Media</h4>
                                                    {/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(report.proof_media_url) ? (
                                                        <div className="mb-3 rounded-xl overflow-hidden border border-line bg-sunken/60 max-w-sm shadow-sm hover:shadow-md transition-shadow">
                                                            <img 
                                                                src={report.proof_media_url} 
                                                                alt="Proof" 
                                                                className="w-full h-64 object-cover"
                                                                onError={(e) => {
                                                                    (e.target as any).style.display = 'none';
                                                                }}
                                                            />
                                                        </div>
                                                    ) : /\.(mp4|webm|ogg|mov)$/i.test(report.proof_media_url) ? (
                                                        <div className="mb-3 rounded-xl overflow-hidden border border-line bg-black max-w-sm shadow-sm hover:shadow-md transition-shadow">
                                                            <video 
                                                                src={report.proof_media_url} 
                                                                controls
                                                                className="w-full h-64 object-contain"
                                                            />
                                                        </div>
                                                    ) : null}
                                                    <a 
                                                        href={report.proof_media_url.startsWith('http') ? report.proof_media_url : '#'} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-line rounded-xl text-sm font-medium text-brand-700 hover:bg-brand-50 transition-colors shadow-sm"
                                                    >
                                                        <ExternalLink size={14} />
                                                        <span>View Media Proof</span>
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-sunken/60 p-4 rounded-xl border border-line">
                                                    <h4 className="text-[11px] font-bold text-ink-3 uppercase tracking-widest mb-1">Sadhu Bhagwan</h4>
                                                    <p className="text-2xl font-bold text-ink">{report.sadhu_count}</p>
                                                </div>
                                                <div className="bg-sunken/60 p-4 rounded-xl border border-line">
                                                    <h4 className="text-[11px] font-bold text-ink-3 uppercase tracking-widest mb-1">Sadhviji Bhagwan</h4>
                                                    <p className="text-2xl font-bold text-ink">{report.sadhvi_count}</p>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-[11px] font-bold text-ink-3 uppercase tracking-widest mb-3">Involved Sevaks</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {report.involved_sevaks && report.involved_sevaks.length > 0 ? (
                                                        report.involved_sevaks.map((username, idx) => (
                                                            <span key={idx} className="px-3 py-1 bg-surface border border-line rounded-lg text-xs font-semibold text-ink-2 shadow-sm">
                                                                {username.split('@')[0]}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-ink-3 italic">No other sevaks mentioned</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-line">
                                                <h4 className="text-[11px] font-bold text-ink-3 uppercase tracking-widest mb-3">Manage Status</h4>
                                                <div className="flex gap-2">
                                                    {report.status !== 'reviewed' && (
                                                        <button 
                                                            onClick={() => handleStatusUpdate(report.id!, 'reviewed')}
                                                            className="flex-1 px-4 py-2 bg-info-soft text-info rounded-xl text-xs font-bold hover:bg-info-soft transition-colors border border-info-soft"
                                                        >
                                                            Mark Reviewed
                                                        </button>
                                                    )}
                                                    {report.status !== 'resolved' && (
                                                        <button 
                                                            onClick={() => handleStatusUpdate(report.id!, 'resolved')}
                                                            className="flex-1 px-4 py-2 bg-ok-soft text-ok rounded-xl text-xs font-bold hover:bg-ok-soft transition-colors border border-ok-soft flex items-center justify-center gap-1"
                                                        >
                                                            <CheckCircle size={14} />
                                                            Mark Resolved
                                                        </button>
                                                    )}
                                                    {report.status !== 'pending' && (
                                                        <button 
                                                            onClick={() => handleStatusUpdate(report.id!, 'pending')}
                                                            className="px-4 py-2 text-ink-3 hover:text-brand-700 transition-colors text-xs font-bold"
                                                        >
                                                            Reset
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ViewReports;
