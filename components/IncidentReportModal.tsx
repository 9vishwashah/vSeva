import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, FileText, Upload, Loader2, Footprints, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../services/supabase';
import { UserProfile, IncidentReport } from '../types';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';

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
        report_date: new Date().toISOString().split('T')[0],
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-saffron-50 to-orange-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-saffron-100 rounded-xl text-saffron-600">
                            <Footprints size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Report Vihar Incident</h2>
                            <p className="text-xs text-gray-500 font-medium">Please provide accurate details of the event</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600 shadow-sm border border-transparent hover:border-gray-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 max-h-[calc(90vh-80px)]">
                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
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
                                <Clock size={14} className="text-saffron-500" /> Time
                            </label>
                            <input
                                type="time"
                                required
                                value={formData.report_time}
                                onChange={e => setFormData({ ...formData, report_time: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:border-transparent outline-none transition-all font-medium text-gray-700"
                            />
                        </div>
                    </div>

                    {/* From & To */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                                <MapPin size={14} className="text-saffron-500" /> From
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="From location"
                                value={formData.vihar_from}
                                onChange={e => setFormData({ ...formData, vihar_from: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:border-transparent outline-none transition-all font-medium text-gray-700"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                                <MapPin size={14} className="text-saffron-500" /> To
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="To location"
                                value={formData.vihar_to}
                                onChange={e => setFormData({ ...formData, vihar_to: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:border-transparent outline-none transition-all font-medium text-gray-700"
                            />
                        </div>
                    </div>

                    {/* Counts */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                                <Users size={14} className="text-saffron-500" /> Sadhu Count
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.sadhu_count}
                                onChange={e => setFormData({ ...formData, sadhu_count: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:border-transparent outline-none transition-all font-medium text-gray-700"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                                <Users size={14} className="text-saffron-500" /> Sadhvi Count
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.sadhvi_count}
                                onChange={e => setFormData({ ...formData, sadhvi_count: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:border-transparent outline-none transition-all font-medium text-gray-700"
                            />
                        </div>
                    </div>

                    {/* Involved Sevaks */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                            <Users size={14} className="text-saffron-500" /> Other Sevaks with you
                        </label>
                        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[50px]">
                            {orgSevaks.length > 0 ? (
                                orgSevaks.map(sevak => (
                                    <button
                                        key={sevak.id}
                                        type="button"
                                        onClick={() => toggleSevak(sevak.username)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                            formData.involved_sevaks.includes(sevak.username)
                                                ? 'bg-saffron-500 text-white shadow-md'
                                                : 'bg-white text-gray-600 border border-gray-200 hover:border-saffron-300'
                                        }`}
                                    >
                                        {sevak.full_name}
                                    </button>
                                ))
                            ) : (
                                <p className="text-xs text-gray-400 italic py-2 px-1">No other sevaks found in your organization</p>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                            <FileText size={14} className="text-saffron-500" /> Detailed Description
                        </label>
                        <textarea
                            required
                            rows={4}
                            placeholder="Describe what happened in detail..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:border-transparent outline-none transition-all font-medium text-gray-700 resize-none"
                        ></textarea>
                    </div>

                    {/* Media Proof (Optional) */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                            <Upload size={14} className="text-saffron-500" /> Proof Photo (Optional)
                        </label>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-4">
                                <label className="flex-1 cursor-pointer">
                                    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-gray-200 rounded-xl hover:border-saffron-300 transition-all text-gray-500 hover:text-saffron-600 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
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
                                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 bg-gray-50 relative group">
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
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">OR</span>
                                <div className="h-px flex-1 bg-gray-100"></div>
                            </div>
                            <input
                                type="text"
                                placeholder="Paste media link instead"
                                value={formData.proof_media_url}
                                onChange={e => setFormData({ ...formData, proof_media_url: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:border-transparent outline-none transition-all font-medium text-gray-700"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-4 border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-colors active:scale-[0.98]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] px-4 py-4 bg-gradient-to-r from-saffron-500 to-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-saffron-200 hover:shadow-saffron-300 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
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
    );
};

export default IncidentReportModal;
