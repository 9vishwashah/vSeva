import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { dataService } from '../services/dataService';
import { Check, X, MessageCircle, RefreshCw, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface RegistrationRequest {
    id: string;
    vihar_group_name: string;
    sangh_name: string;
    captain_name: string;
    vice_captain_name?: string;
    full_address: string;
    city: string;
    pin_code: string;
    state: string;
    mobile: string;
    email: string;
    password?: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

interface OrgStat {
    org_id: string;
    org_name: string;
    city: string;
    created_at: string;
    total_sevaks: number;
    total_entries: number;
    last_updated: string | null;
}

const SuperAdminDashboard = () => {
    const [requests, setRequests] = useState<RegistrationRequest[]>([]);
    const [orgStats, setOrgStats] = useState<OrgStat[]>([]);
    const [loading, setLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
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

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const data = await dataService.getOrgActivityStats();
            setOrgStats(data);
        } catch (err) {
            console.error(err);
        } finally {
            setStatsLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchRequests();
        fetchStats();
    };

    useEffect(() => {
        handleRefresh();
    }, []);

    const toggleRow = (id: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleApprove = async (req: RegistrationRequest) => {
        try {
            if (!window.confirm(`Approve ${req.vihar_group_name}? This will create the admin account immediately.`)) return;

            showToast("Creating organization and admin...", "info");

            // Call Data Service to handle full flow
            await dataService.approveOrgAdmin({
                id: req.id,
                org_name: req.vihar_group_name,
                city: req.city,
                full_name: req.captain_name,
                email: req.email,
                mobile: req.mobile,
                password: req.password
            });

            showToast("Organization Approved & Created!", "success");

            // Prepare WhatsApp Message
            const message = `प्रेरणादाता: प. पु. महाबोधि सुरीश्वरजी महाराजा ${req.captain_name}!\n\nYour vSeva Captain account request for *${req.vihar_group_name}* has been approved.\n\nYou can now login with your email and password.\n\nWelcome to vSeva!`;

            const waLink = `https://wa.me/91${req.mobile}?text=${encodeURIComponent(message)}`;

            // Open WhatsApp
            window.open(waLink, '_blank');

            // Refresh Local State (Remove from list)
            setRequests(prev => prev.filter(r => r.id !== req.id));
            
            // Refresh Stats as an organization got added
            fetchStats();

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
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-gray-800">Super Admin Dashboard</h1>
                        <p className="text-gray-500">Manage organization registration requests and monitor global activity</p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                    >
                        <RefreshCw size={20} className={(loading || statsLoading) ? "animate-spin" : ""} />
                    </button>
                </div>

                {/* Registration Requests Table */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800">Pending Requests</h2>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                                    <tr>
                                        <th className="p-4 w-10"></th>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Vihar Group Name</th>
                                        <th className="p-4">Captain</th>
                                        <th className="p-4">Mobile</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {requests.length > 0 ? requests.map(req => (
                                        <React.Fragment key={req.id}>
                                            <tr className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-4">
                                                    <button onClick={() => toggleRow(req.id)} className="text-gray-400 hover:text-gray-600">
                                                        {expandedRows.has(req.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                    </button>
                                                </td>
                                                <td className="p-4 text-sm text-gray-500">
                                                    {new Date(req.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 font-medium text-gray-900">
                                                    {req.vihar_group_name}
                                                </td>
                                                <td className="p-4 text-sm text-gray-800 font-medium">
                                                    {req.captain_name}
                                                </td>
                                                <td className="p-4 text-sm text-gray-600">
                                                    {req.mobile}
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
                                            {expandedRows.has(req.id) && (
                                                <tr className="bg-gray-50/80">
                                                    <td colSpan={6} className="p-6">
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                                            <div>
                                                                <span className="block text-gray-400 font-medium text-xs uppercase mb-1">Sangh Name</span>
                                                                <span className="text-gray-800 font-medium">{req.sangh_name}</span>
                                                            </div>
                                                            <div>
                                                                <span className="block text-gray-400 font-medium text-xs uppercase mb-1">Vice Captain</span>
                                                                <span className="text-gray-800 font-medium">{req.vice_captain_name || '-'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="block text-gray-400 font-medium text-xs uppercase mb-1">Email</span>
                                                                <span className="text-gray-800 font-medium">{req.email}</span>
                                                            </div>
                                                            <div>
                                                                <span className="block text-gray-400 font-medium text-xs uppercase mb-1">Full Address</span>
                                                                <span className="text-gray-800 font-medium">{req.full_address}</span>
                                                            </div>
                                                            <div>
                                                                <span className="block text-gray-400 font-medium text-xs uppercase mb-1">City</span>
                                                                <span className="text-gray-800 font-medium">{req.city}</span>
                                                            </div>
                                                            <div>
                                                                <span className="block text-gray-400 font-medium text-xs uppercase mb-1">State</span>
                                                                <span className="text-gray-800 font-medium">{req.state}</span>
                                                            </div>
                                                            <div>
                                                                <span className="block text-gray-400 font-medium text-xs uppercase mb-1">Pin Code</span>
                                                                <span className="text-gray-800 font-medium">{req.pin_code}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-gray-400">
                                                {loading ? <Loader2 className="animate-spin mx-auto pb-2" /> : "No pending requests found"}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Current Groups / Activity Status Table */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800">Current Groups & Activity Status</h2>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                                    <tr>
                                        <th className="p-4">Date Joined</th>
                                        <th className="p-4">Group Name</th>
                                        <th className="p-4">City</th>
                                        <th className="p-4 text-center">Total Sevaks</th>
                                        <th className="p-4 text-center">Total Entries</th>
                                        <th className="p-4 text-right">Last Updated</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {orgStats.length > 0 ? orgStats.map(stat => (
                                        <tr key={stat.org_id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 text-sm text-gray-500">
                                                {new Date(stat.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 font-medium text-gray-900">
                                                {stat.org_name}
                                            </td>
                                            <td className="p-4 text-sm text-gray-600">
                                                {stat.city}
                                            </td>
                                            <td className="p-4 text-center text-sm font-medium text-saffron-600">
                                                {stat.total_sevaks}
                                            </td>
                                            <td className="p-4 text-center text-sm font-medium text-blue-600">
                                                {stat.total_entries}
                                            </td>
                                            <td className="p-4 text-right text-sm text-gray-500">
                                                {stat.last_updated ? new Date(stat.last_updated).toLocaleDateString() : 'No entries'}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-gray-400">
                                                {statsLoading ? <Loader2 className="animate-spin mx-auto pb-2" /> : "No active groups found"}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SuperAdminDashboard;

