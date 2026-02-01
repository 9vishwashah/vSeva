import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { dataService } from '../services/dataService';
import { Check, X, MessageCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface RegistrationRequest {
    id: string;
    org_name: string;
    city: string;
    full_name: string;
    mobile: string;
    email: string;
    password?: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

const SuperAdminDashboard = () => {
    const [requests, setRequests] = useState<RegistrationRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('registration_requests')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (err: any) {
            console.error(err);
            showToast("Failed to fetch requests", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleApprove = async (req: RegistrationRequest) => {
        try {
            if (!window.confirm(`Approve ${req.org_name}? This will create the admin account immediately.`)) return;

            showToast("Creating organization and admin...", "info");

            // Call Data Service to handle full flow
            await dataService.approveOrgAdmin(req);

            showToast("Organization Approved & Created!", "success");

            // Prepare WhatsApp Message
            const message = `Jai Jinendra ${req.full_name}!\n\nYour vSeva organization request for *${req.org_name}* has been approved.\n\nYou can now login with your email and password.\n\nWelcome to vSeva!`;

            const waLink = `https://wa.me/91${req.mobile}?text=${encodeURIComponent(message)}`;

            // Open WhatsApp
            window.open(waLink, '_blank');

            // Refresh Local State (Remove from list)
            setRequests(prev => prev.filter(r => r.id !== req.id));

        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Failed to approve organization", "error");
        }
    };

    const handleReject = async (id: string) => {
        if (!window.confirm("Are you sure you want to reject this request?")) return;
        updateStatus(id, 'rejected');
    };

    const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
        try {
            const { error } = await supabase
                .from('registration_requests')
                .update({ status })
                .eq('id', id);

            if (error) throw error;

            showToast(`Request marked as ${status}`, "success");
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            showToast("Failed to update status", "error");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-gray-800">Super Admin Dashboard</h1>
                        <p className="text-gray-500">Manage organization registration requests</p>
                    </div>
                    <button
                        onClick={fetchRequests}
                        className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Organization</th>
                                    <th className="p-4">Applicant</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {requests.length > 0 ? requests.map(req => (
                                    <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 text-sm text-gray-500">
                                            {new Date(req.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{req.org_name}</div>
                                            <div className="text-xs text-gray-500">{req.city}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-800 font-medium">
                                            {req.full_name}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            <div>{req.mobile}</div>
                                            <div className="text-xs text-gray-400">{req.email}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${req.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleApprove(req)}
                                                    className="flex items-center gap-1 bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-transform active:scale-95"
                                                    title="Approve & Send WhatsApp"
                                                >
                                                    <MessageCircle size={14} /> Approve
                                                </button>
                                                <button
                                                    onClick={() => handleReject(req.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Reject"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-gray-400">
                                            {loading ? <Loader2 className="animate-spin mx-auto pb-2" /> : "No requests found"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
