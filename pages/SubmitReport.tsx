import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, FileText, Upload, Loader2, Footprints, Image as ImageIcon, Video, UserPlus } from 'lucide-react';
import { UserProfile, IncidentReport } from '../types';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabase';

interface SubmitReportProps {
    currentUser: UserProfile;
}

const SubmitReport: React.FC<SubmitReportProps> = ({ currentUser }) => {
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
        sadhu_count: '' as any,
        sadhvi_count: '' as any,
        involved_sevaks_text: '',
        description: '',
        proof_media_url: ''
    });

    useEffect(() => {
        loadOrgSevaks();
    }, []);

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

            const { involved_sevaks_text, ...restFormData } = formData;

            const report: any = {
                organization_id: currentUser.organization_id,
                created_by: currentUser.id,
                ...restFormData,
                sadhu_count: parseInt(formData.sadhu_count) || 0,
                sadhvi_count: parseInt(formData.sadhvi_count) || 0,
                involved_sevaks: formData.involved_sevaks_text.split(',').map(s => s.trim()).filter(s => s !== ''),
                proof_media_url,
                status: 'pending'
            };

            await dataService.createIncidentReport(report);
            showToast("Incident report submitted successfully", "success");
            
            // Reset form
                setFormData({
                    report_date: new Date().toISOString().split('T')[0],
                    report_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                    vihar_from: '',
                    vihar_to: '',
                    sadhu_count: '' as any,
                    sadhvi_count: '' as any,
                    involved_sevaks_text: '',
                    description: '',
                    proof_media_url: ''
                });
            setSelectedFile(null);
            setPreviewUrl(null);
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

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-20">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-saffron-500 via-orange-500 to-amber-400 p-6 text-white shadow-lg mb-6">
                {/* Decorative circles */}
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />
                
                <div className="relative">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Footprints size={22} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Incident Reporting</h1>
                    </div>
                    <p className="text-white/80 text-sm mt-1">Please provide accurate details about the incident during Vihar.</p>
                    <span className="mt-3 inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Reporting System
                    </span>
                </div>
            </div>

            <div className="px-4">
                <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] shadow-xl shadow-saffron-100/50 border border-gray-100 p-8 space-y-8">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-4 items-start">
                    <div className="flex flex-col space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                            <Users size={14} className="text-saffron-500" /> Sadhu Count
                        </label>
                        <input
                            type="number"
                            placeholder="0"
                            value={formData.sadhu_count}
                            onChange={e => setFormData({ ...formData, sadhu_count: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:border-transparent outline-none transition-all font-medium text-gray-700"
                        />
                    </div>
                    <div className="flex flex-col space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                            <Users size={14} className="text-saffron-500" /> Sadhvi Count
                        </label>
                        <input
                            type="number"
                            placeholder="0"
                            value={formData.sadhvi_count}
                            onChange={e => setFormData({ ...formData, sadhvi_count: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:border-transparent outline-none transition-all font-medium text-gray-700"
                        />
                    </div>
                </div>

                {/* Involved Sevaks */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                        <UserPlus size={14} className="text-saffron-500" /> Other sevaks with you
                    </label>
                    <input
                        type="text"
                        placeholder="Enter names separated by commas..."
                        value={formData.involved_sevaks_text}
                        onChange={e => setFormData({ ...formData, involved_sevaks_text: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:border-transparent outline-none transition-all font-medium text-gray-700"
                    />
                </div>

                {/* Description */}
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

                {/* Media Proof */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                        <Upload size={14} className="text-saffron-500" /> Attachment (Photo/Video)
                    </label>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-4">
                            <label className="flex-1 cursor-pointer">
                                <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl hover:bg-white hover:border-saffron-300 transition-all text-gray-400 hover:text-saffron-600 font-medium group">
                                    <div className="p-3 bg-white rounded-2xl group-hover:bg-saffron-50 transition-colors shadow-sm">
                                        <Upload size={24} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-gray-700">{selectedFile ? selectedFile.name : 'Click to Upload'}</p>
                                        <p className="text-[10px] uppercase tracking-wider">Supports Photo or Video</p>
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </label>
                            {previewUrl && (
                                <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-white flex-shrink-0 bg-gray-50 relative group shadow-lg">
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
                                        <X size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-saffron-500 to-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-saffron-100 hover:shadow-saffron-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 mt-4"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            <span>{uploading ? 'Uploading Photo...' : 'Submitting...'}</span>
                        </>
                    ) : (
                        <>
                            <Footprints size={20} />
                            <span>Submit Incident Report</span>
                        </>
                    )}
                </button>
            </form>
        </div>
    </div>
);
};

export default SubmitReport;
