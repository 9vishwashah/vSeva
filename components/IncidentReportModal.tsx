import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, FileText, Upload, Loader2, Footprints, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../services/supabase';
import { UserProfile, IncidentReport } from '../types';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { toLocalDateKey } from '../services/dateUtils';
import Portal from './Portal';

interface IncidentReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: UserProfile;
}

const IncidentReportModal: React.FC<IncidentReportModalProps> = ({ isOpen, onClose, currentUser }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [orgSevaks, setOrgSevaks] = useState<UserProfile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
    // Form state
    const [formData, setFormData] = useState({
        report_date: toLocalDateKey(new Date()),
        report_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        vihar_from: '',
        vihar_to: '',
        sadhu_count: 0,
        sadhvi_count: 0,
        involved_sevaks: [] as string[],
        description: '',
        proof_media_url: ''
    });

    useEffect(() => {
        if (isOpen) {
            loadOrgSevaks();
        }
    }, [isOpen]);

    const loadOrgSevaks = async () => {
        try {
            const sevaks = await dataService.getOrgSevaks(currentUser.organization_id);
            setOrgSevaks(sevaks.filter(s => s.id !== currentUser.id));
        } catch (error) {
            console.error("Error loading sevaks:", error);
        }
    };

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let proof_media_url = formData.proof_media_url;

            if (selectedFile) {
                setUploading(true);
                proof_media_url = await uploadFile(selectedFile);
            }

            const report: IncidentReport = {
                organization_id: currentUser.organization_id,
                created_by: currentUser.id,
                ...formData,
                proof_media_url,
                status: 'pending'
            };

            await dataService.createIncidentReport(report);
            showToast("Incident report submitted successfully", "success");
            onClose();
        } catch (error: any) {
            console.error("Error submitting report:", error);
            showToast(error.message || "Failed to submit report", "error");
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    const toggleSevak = (username: string) => {
        setFormData(prev => ({
            ...prev,
            involved_sevaks: prev.involved_sevaks.includes(username)
                ? prev.involved_sevaks.filter(u => u !== username)
                : [...prev.involved_sevaks, username]
        }));
    };

    if (!isOpen) return null;

    return (
        <Portal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/45 app-modal-backdrop">
            <div className="bg-surface rounded-[28px] ring-1 ring-inset ring-line/70 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-[0_24px_64px_rgb(29_29_27/0.2)] app-modal-card">
                {/* Header */}
                <div className="px-5 py-4 border-b border-line flex justify-between items-center gap-3 bg-surface shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 shrink-0">
                            <Footprints size={18} />
                        </div>
                        <div>
                            <h2 className="display text-[1.4rem] font-bold text-ink">Report Vihar Incident</h2>
                            <p className="text-xs text-ink-2 font-medium">Please provide accurate details of the event</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        aria-label="Close" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sunken text-ink hover:bg-line transition-colors shrink-0 disabled:opacity-40"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 max-h-[calc(90vh-80px)]">
                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-ink-2 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                                <Calendar size={14} className="text-brand-700" /> Date
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.report_date}
                                onChange={e => setFormData({ ...formData, report_date: e.target.value })}
                                className="w-full px-4 py-3 bg-sunken/60 border border-line rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all font-medium text-ink"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-ink-2 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                                <Clock size={14} className="text-brand-700" /> Time
                            </label>
                            <input
                                type="time"
                                required
                                value={formData.report_time}
                                onChange={e => setFormData({ ...formData, report_time: e.target.value })}
                                className="w-full px-4 py-3 bg-sunken/60 border border-line rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all font-medium text-ink"
                            />
                        </div>
                    </div>

                    {/* From & To */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-ink-2 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                                <MapPin size={14} className="text-brand-700" /> From
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="From location"
                                value={formData.vihar_from}
                                onChange={e => setFormData({ ...formData, vihar_from: e.target.value })}
                                className="w-full px-4 py-3 bg-sunken/60 border border-line rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all font-medium text-ink"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-ink-2 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                                <MapPin size={14} className="text-brand-700" /> To
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="To location"
                                value={formData.vihar_to}
                                onChange={e => setFormData({ ...formData, vihar_to: e.target.value })}
                                className="w-full px-4 py-3 bg-sunken/60 border border-line rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all font-medium text-ink"
                            />
                        </div>
                    </div>

                    {/* Counts */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-ink-2 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                                <Users size={14} className="text-brand-700" /> Sadhu Count
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.sadhu_count}
                                onChange={e => setFormData({ ...formData, sadhu_count: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 bg-sunken/60 border border-line rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all font-medium text-ink"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-ink-2 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                                <Users size={14} className="text-brand-700" /> Sadhvi Count
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.sadhvi_count}
                                onChange={e => setFormData({ ...formData, sadhvi_count: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 bg-sunken/60 border border-line rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all font-medium text-ink"
                            />
                        </div>
                    </div>

                    {/* Involved Sevaks */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-ink-2 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                            <Users size={14} className="text-brand-700" /> Other Sevaks with you
                        </label>
                        <div className="flex flex-wrap gap-2 p-3 bg-sunken/60 border border-line rounded-xl min-h-[50px]">
                            {orgSevaks.length > 0 ? (
                                orgSevaks.map(sevak => (
                                    <button
                                        key={sevak.id}
                                        type="button"
                                        onClick={() => toggleSevak(sevak.username)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                            formData.involved_sevaks.includes(sevak.username)
                                                ? 'bg-brand text-ink shadow-md'
                                                : 'bg-surface text-ink-2 border border-line hover:border-brand-200'
                                        }`}
                                    >
                                        {sevak.full_name}
                                    </button>
                                ))
                            ) : (
                                <p className="text-xs text-ink-3 italic py-2 px-1">No other sevaks found in your organization</p>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-ink-2 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                            <FileText size={14} className="text-brand-700" /> Detailed Description
                        </label>
                        <textarea
                            required
                            rows={4}
                            placeholder="Describe what happened in detail..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-sunken/60 border border-line rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all font-medium text-ink resize-none"
                        ></textarea>
                    </div>

                    {/* Media Proof (Optional) */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-ink-2 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                            <Upload size={14} className="text-brand-700" /> Proof Photo (Optional)
                        </label>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-4">
                                <label className="flex-1 cursor-pointer">
                                    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-surface border-2 border-dashed border-line rounded-xl hover:border-brand-200 transition-all text-ink-2 hover:text-brand-700 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                                        <Upload size={18} />
                                        <span>{selectedFile ? selectedFile.name : 'Choose Photo'}</span>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </label>
                                {previewUrl && (
                                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-line flex-shrink-0 bg-sunken/60 relative group">
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <button 
                                            type="button"
                                            onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-ink-3 uppercase tracking-widest font-bold">OR</span>
                                <div className="h-px flex-1 bg-sunken"></div>
                            </div>
                            <input
                                type="text"
                                placeholder="Paste media link instead"
                                value={formData.proof_media_url}
                                onChange={e => setFormData({ ...formData, proof_media_url: e.target.value })}
                                className="w-full px-4 py-3 bg-sunken/60 border border-line rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all font-medium text-ink"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-4 border border-line text-ink-2 font-bold rounded-2xl hover:bg-sunken/60 transition-colors active:scale-[0.98]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] px-4 py-4 bg-brand text-ink font-bold rounded-2xl shadow-lg shadow-black/5 hover:shadow-saffron-300 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>{uploading ? 'Uploading Photo...' : 'Submitting...'}</span>
                                </>
                            ) : (
                                <span>Submit Report</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        </Portal>
    );
};

export default IncidentReportModal;
