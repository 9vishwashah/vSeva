import React, { useState, useEffect } from 'react';
import { UserProfile, IncidentReport } from '../types';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { Calendar, Clock, MapPin, Users, FileText, ExternalLink, Loader2, Footprints, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from 'lucide-react';

interface ViewReportsProps {
    currentUser: UserProfile;
}

const ViewReports: React.FC<ViewReportsProps> = ({ currentUser }) => {
    const { showToast } = useToast();
    const [reports, setReports] = useState<IncidentReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedReport, setExpandedReport] = useState<string | null>(null);

    useEffect(() => {
        loadReports();
    }, [currentUser]);

    const loadReports = async () => {
        try {
            setLoading(true);
            const data = await dataService.getIncidentReports(currentUser.organization_id);
            setReports(data);
        } catch (error: any) {
            console.error("Error loading reports:", error);
            showToast("Failed to load incident reports", "error");
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
                <Loader2 className="animate-spin text-saffron-600 mb-4" size={40} />
                <p className="text-gray-500 font-medium">Loading reports...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-saffron-500 via-orange-500 to-amber-400 p-6 text-white shadow-lg">
                {/* Decorative circles */}
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />
                
                <div className="relative">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Footprints size={22} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Incident Reports</h1>
                    </div>
                    <p className="text-white/80 text-sm mt-1">View and manage reports submitted by sevaks</p>
                    <div className="flex items-center gap-2 mt-4">
                        <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
                            <AlertCircle size={14} className="text-orange-100" />
                            {reports.filter(r => r.status === 'pending').length} Pending Review
                        </span>
                        <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/10">
                            Admin Dashboard
                        </span>
                    </div>
                </div>
            </div>

            {reports.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200 shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                        <Footprints size={32} />
                    </div>
                    <p className="text-xl font-bold text-gray-700">No reports found</p>
                    <p className="text-gray-400 max-w-xs mx-auto mt-2">When sevaks submit incident reports during vihars, they will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {reports.map((report) => (
                        <div 
                            key={report.id} 
                            className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden ${
                                expandedReport === report.id ? 'border-saffron-200 ring-4 ring-saffron-50' : 'border-gray-100 hover:border-saffron-100'
                            }`}
                        >
                            {/* Summary Header */}
                            <div 
                                className="p-5 md:p-6 cursor-pointer flex items-center justify-between"
                                onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id || null)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                        report.status === 'pending' ? 'bg-orange-50 text-orange-600' : 
                                        report.status === 'reviewed' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                                    }`}>
                                        <AlertCircle size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-800">{report.vihar_from} to {report.vihar_to}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                report.status === 'pending' ? 'bg-orange-100 text-orange-700' : 
                                                report.status === 'reviewed' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                                {report.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(report.report_date).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1"><Clock size={12} /> {report.report_time}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-gray-400">
                                    {expandedReport === report.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedReport === report.id && (
                                <div className="px-6 pb-6 border-t border-gray-50 pt-6 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Incident Details</h4>
                                                <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 leading-relaxed border border-gray-100">
                                                    {report.description}
                                                </div>
                                            </div>

                                            {report.proof_media_url && (
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Proof Media</h4>
                                                    {/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(report.proof_media_url) ? (
                                                        <div className="mb-3 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 max-w-sm shadow-sm hover:shadow-md transition-shadow">
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
                                                        <div className="mb-3 rounded-xl overflow-hidden border border-gray-100 bg-black max-w-sm shadow-sm hover:shadow-md transition-shadow">
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
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-saffron-600 hover:bg-saffron-50 transition-colors shadow-sm"
                                                    >
                                                        <ExternalLink size={14} />
                                                        <span>View Media Proof</span>
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Sadhu Bhagwan</h4>
                                                    <p className="text-2xl font-bold text-gray-800">{report.sadhu_count}</p>
                                                </div>
                                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Sadhviji Bhagwan</h4>
                                                    <p className="text-2xl font-bold text-gray-800">{report.sadhvi_count}</p>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Involved Sevaks</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {report.involved_sevaks && report.involved_sevaks.length > 0 ? (
                                                        report.involved_sevaks.map((username, idx) => (
                                                            <span key={idx} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 shadow-sm">
                                                                {username.split('@')[0]}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">No other sevaks mentioned</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-gray-50">
                                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Manage Status</h4>
                                                <div className="flex gap-2">
                                                    {report.status !== 'reviewed' && (
                                                        <button 
                                                            onClick={() => handleStatusUpdate(report.id!, 'reviewed')}
                                                            className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-100"
                                                        >
                                                            Mark Reviewed
                                                        </button>
                                                    )}
                                                    {report.status !== 'resolved' && (
                                                        <button 
                                                            onClick={() => handleStatusUpdate(report.id!, 'resolved')}
                                                            className="flex-1 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors border border-green-100 flex items-center justify-center gap-1"
                                                        >
                                                            <CheckCircle size={14} />
                                                            Mark Resolved
                                                        </button>
                                                    )}
                                                    {report.status !== 'pending' && (
                                                        <button 
                                                            onClick={() => handleStatusUpdate(report.id!, 'pending')}
                                                            className="px-4 py-2 text-gray-400 hover:text-orange-500 transition-colors text-xs font-bold"
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
