import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, Upload, Loader2, Footprints, Plus, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { UserProfile, IncidentReport } from '../types';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabase';
import { toLocalDateKey } from '../services/dateUtils';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import StatusScreen from '../components/StatusScreen';

interface SubmitReportProps {
    currentUser: UserProfile;
}

const emptyForm = () => ({
    report_date: toLocalDateKey(new Date()),
    description: '',
});

const SubmitReport: React.FC<SubmitReportProps> = ({ currentUser }) => {
    const { showToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [formData, setFormData] = useState(emptyForm());

    const [reports, setReports] = useState<IncidentReport[]>([]);
    const [reportsLoading, setReportsLoading] = useState(true);
    const [loadError, setLoadError] = useState<'offline' | 'error' | null>(null);

    const loadReports = async () => {
        try {
            setReportsLoading(true);
            setLoadError(null);
            const data = await dataService.getIncidentReports(currentUser.organization_id);
            setReports(data);
        } catch (error: any) {
            console.error("Error loading reports:", error);
            setLoadError(navigator.onLine ? 'error' : 'offline');
        } finally {
            setReportsLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, [currentUser.organization_id]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const uploadFile = async (file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${currentUser.id}/${Date.now()}_${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('incident-reports')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('incident-reports')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const closeModal = () => {
        setShowModal(false);
        setFormData(emptyForm());
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let proof_media_url: string | undefined;

            if (selectedFile) {
                setUploading(true);
                proof_media_url = await uploadFile(selectedFile);
            }

            const report: any = {
                organization_id: currentUser.organization_id,
                created_by: currentUser.id,
                report_date: formData.report_date,
                // Not asked in this simplified form — kept as safe defaults
                // to satisfy the existing (unchanged) incident_reports schema.
                report_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                vihar_from: '',
                vihar_to: '',
                sadhu_count: 0,
                sadhvi_count: 0,
                involved_sevaks: [],
                description: formData.description,
                proof_media_url,
                status: 'pending'
            };

            const saved = await dataService.createIncidentReport(report);
            showToast("Incident report submitted successfully", "success");
            setReports(prev => [saved, ...prev]);
            closeModal();
        } catch (error: any) {
            console.error("Error submitting report:", error);
            showToast(error.message || "Failed to submit report", "error");
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-extrabold text-[#241C17] flex items-center gap-2">
                        <Footprints size={20} className="text-saffron-600" />
                        Incident Reports
                    </h1>
                    <p className="text-xs text-[#8A6A57]">Report anything that happened during Vihar</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-saffron-600 hover:bg-saffron-700 text-white rounded-full text-sm font-bold transition-colors shadow-sm"
                >
                    <Plus size={16} /> New Report
                </button>
            </div>

            <div className="space-y-2.5">
                <h2 className="text-xs font-extrabold uppercase tracking-wide text-[#8A6A57] px-1">Submitted Incidents</h2>
                {reportsLoading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                    </div>
                ) : loadError ? (
                    <StatusScreen variant={loadError} onRetry={loadReports} compact />
                ) : reports.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
                        <p className="text-sm text-gray-400">No incidents reported yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {reports.map(report => (
                            <div key={report.id} className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#8A6A57]">
                                        <Calendar size={13} className="text-saffron-500" />
                                        {new Date(`${report.report_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                        report.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                        report.status === 'reviewed' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                        {report.status === 'resolved' ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                                        {report.status}
                                    </span>
                                </div>
                                <p className="text-sm text-[#241C17] mt-2 whitespace-pre-wrap break-words">{report.description}</p>
                                {report.proof_media_url && (
                                    <a
                                        href={report.proof_media_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-bold text-saffron-600 hover:text-saffron-700"
                                    >
                                        <ExternalLink size={12} /> View Attachment
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal open={showModal} onClose={closeModal} maxWidth="max-w-md">
                <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-white shrink-0">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <Footprints size={18} className="text-saffron-600" />
                        New Incident Report
                    </h3>
                    <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                            <Calendar size={14} className="text-saffron-500" /> Date
                        </label>
                        <input
                            type="date"
                            required
                            value={formData.report_date}
                            onChange={e => setFormData({ ...formData, report_date: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:border-transparent outline-none transition-all font-medium text-gray-700"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                            <FileText size={14} className="text-saffron-500" /> Detailed Description
                        </label>
                        <textarea
                            required
                            rows={5}
                            placeholder="Describe what happened in detail..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:border-transparent outline-none transition-all font-medium text-gray-700 resize-none"
                        ></textarea>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                            <Upload size={14} className="text-saffron-500" /> Attachment (Photo/Video)
                        </label>
                        <div className="flex items-center gap-4">
                            <label className="flex-1 cursor-pointer">
                                <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl hover:bg-white hover:border-saffron-300 transition-all text-gray-400 hover:text-saffron-600 font-medium">
                                    <Upload size={22} />
                                    <p className="text-xs font-bold text-gray-700 text-center">{selectedFile ? selectedFile.name : 'Click to Upload'}</p>
                                </div>
                                <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                            </label>
                            {previewUrl && (
                                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white flex-shrink-0 bg-gray-50 relative group shadow-lg">
                                    {selectedFile?.type.startsWith('video') ? (
                                        <video src={previewUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-saffron-600 hover:bg-saffron-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>{uploading ? 'Uploading...' : 'Submitting...'}</span>
                            </>
                        ) : (
                            <span>Submit Report</span>
                        )}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default SubmitReport;
