import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { 
    Check, X, MessageCircle, RefreshCw, Loader2,
    ChevronDown, ChevronUp, Users, PieChart, 
    ShieldCheck, Building2, LayoutDashboard, Lock,
    Download, FileText
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { BRAND } from '@brand';
import StatusScreen from '../components/StatusScreen';
import SuperAdminDirectoryPanel from '../components/directory/SuperAdminDirectoryPanel';
import { deliverPdf } from '../services/pdfDelivery';

interface RegistrationRequest {
    id: string;
    vihar_group_name: string;
    sangh_name: string;
    captain_name: string;
    vice_captain_name?: string;
    full_address: string;
    city: string;
    town?: string;
    pin_code: string;
    state: string;
    mobile: string;
    email: string;
    password?: string;
    status: 'pending' | 'approved' | 'rejected';
    // Which platform the request came from (null/absent = the original vSeva)
    brand?: string | null;
    created_at: string;
}

interface OrgAdminDetails {
    full_name: string;
    mobile: string;
    town: string;
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

const SUPER_ADMIN_PIN = "2424";

// Platform a request / group belongs to, so the owner can tell SSG applicants from general vSeva ones.
const PLATFORM_LABELS: Record<string, string> = { vseva: 'vSeva', ssg: 'SSG · Shraman Seva Group' };
const platformOf = (brand?: string | null) => brand || 'vseva';
const platformLabel = (brand?: string | null) => PLATFORM_LABELS[platformOf(brand)] ?? platformOf(brand).toUpperCase();
const PlatformBadge: React.FC<{ brand?: string | null }> = ({ brand }) => {
    const isOther = platformOf(brand) !== 'vseva';
    return (
        <span className={`inline-block ml-2 align-middle px-2 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide border ${isOther ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
            {platformLabel(brand)}
        </span>
    );
};

interface SuperAdminDashboardProps {
    currentUser?: { id: string; full_name: string } | null;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ currentUser }) => {
    const [requests, setRequests] = useState<RegistrationRequest[]>([]);
    const [orgStats, setOrgStats] = useState<OrgStat[]>([]);
    const [loading, setLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);
    const [requestsError, setRequestsError] = useState<'offline' | 'error' | null>(null);
    const [statsError, setStatsError] = useState<'offline' | 'error' | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [orgAdmins, setOrgAdmins] = useState<Record<string, OrgAdminDetails>>({});
    const [pinEntry, setPinEntry] = useState('');
    const [isPinVerified, setIsPinVerified] = useState(false);
    const [pinError, setPinError] = useState(false);
    // What this signed-in account may see, decided by the server (never by the client).
    const [scope, setScope] = useState<{ email: string; all: boolean; brands: string[] } | null>(null);
    const [accessError, setAccessError] = useState<string | null>(null);
    const { showToast } = useToast();

    const fetchRequests = async () => {
        setLoading(true);
        setRequestsError(null);
        try {
            // Server-authorised and brand-scoped (netlify/functions/super-admin.js)
            const data = await dataService.getPendingRegistrationRequests();
            setRequests(data || []);
        } catch (err: any) {
            console.error(err);
            showToast("Failed to fetch requests", "error");
            setRequestsError(navigator.onLine ? 'error' : 'offline');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        setStatsLoading(true);
        setStatsError(null);
        try {
            const data = await dataService.getOrgActivityStats();
            setOrgStats(data);

            // Fetch Admin Details for these Orgs
            if (data.length > 0) {
                const orgIds = data.map(o => o.org_id);
                const admins = await dataService.getOrgAdmins(orgIds);
                setOrgAdmins(admins);
            }
        } catch (err) {
            console.error(err);
            setStatsError(navigator.onLine ? 'error' : 'offline');
        } finally {
            setStatsLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchRequests();
        fetchStats();
    };

    useEffect(() => {
        if (!isPinVerified) return;
        let cancelled = false;
        (async () => {
            try {
                const s = await dataService.getSuperAdminScope();
                if (cancelled) return;
                setScope(s);
                setAccessError(null);
                handleRefresh();
            } catch (err: any) {
                if (!cancelled) setAccessError(err?.message || 'Could not verify Super Admin access.');
            }
        })();
        return () => { cancelled = true; };
    }, [isPinVerified]);

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pinEntry === SUPER_ADMIN_PIN) {
            setIsPinVerified(true);
            setPinError(false);
        } else {
            setPinError(true);
            setPinEntry('');
            setTimeout(() => setPinError(false), 2000);
        }
    };

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

    // PDF Generation
    const downloadAllRequestsPDF = async () => {
        if (requests.length === 0) {
            showToast("No pending requests to download", "info");
            return;
        }

        // jsPDF + autoTable (~420KB) and the Devanagari font data (~290KB) are
        // only needed for this export action — load on demand instead of
        // bundling them into this page's chunk, which every Super Admin pays
        // for just to open the dashboard.
        const [
            { default: jsPDF },
            { default: autoTable },
            { NotoSansDevanagariBase64 },
        ] = await Promise.all([
            import('jspdf'),
            import('jspdf-autotable'),
            import('../assets/NotoSansDevanagari-Regular'),
        ]);

        const doc = new jsPDF();

        // Add Devanagari font support
        doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', NotoSansDevanagariBase64);
        doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'normal');
        
        const img = new Image();
        img.src = BRAND.logo;

        img.onload = async () => {
            requests.forEach((req, index) => {
                if (index > 0) doc.addPage();

                // Add Logo
                doc.addImage(img, 'PNG', 15, 10, 20, 20);

                // Header
                doc.setFont("helvetica", "bold");
                doc.setFontSize(22);
                doc.setTextColor(230, 110, 0); // Saffron
                doc.text(`${BRAND.name} Registration Request`, 40, 20);
                
                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.setFont("helvetica", "normal");
                doc.text(`Request ID: REQ-${req.id.slice(0, 8).toUpperCase()}`, 40, 26);
                doc.text(`Date: ${new Date(req.created_at).toLocaleString()}`, 40, 31);

                doc.setDrawColor(230, 110, 0);
                doc.line(15, 35, 195, 35);

                // Content
                const tableData = [
                    ["Platform", platformLabel(req.brand)],
                    ["Vihar Group Name", req.vihar_group_name],
                    ["Sangh Name", req.sangh_name],
                    ["Captain Name", req.captain_name],
                    ["Vice Captain", req.vice_captain_name || "N/A"],
                    ["Mobile Number", req.mobile],
                    ["Email Address", req.email],
                    ["Full Address", req.full_address],
                    ["City", req.city],
                    ["Town / Area", req.town || "N/A"],
                    ["State", req.state],
                    ["Pin Code", req.pin_code]
                ];

                autoTable(doc, {
                    startY: 45,
                    head: [['Field', 'Value']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [230, 110, 0], font: 'helvetica' },
                    styles: { 
                        fontSize: 11, 
                        cellPadding: 5,
                        font: 'helvetica' // Default to standard Helvetica for English/Numbers
                    },
                    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, font: 'helvetica' } },
                    didParseCell: (data) => {
                        // Detect Hindi (Devanagari) characters: [\u0900-\u097F]
                        const text = data.cell.text.join(' ');
                        if (/[\u0900-\u097F]/.test(text)) {
                            data.cell.styles.font = 'NotoSansDevanagari';
                        }
                    }
                });

                // Footer
                const finalY = (doc as any).lastAutoTable.finalY + 20;
                doc.setFontSize(10);
                doc.setFont("helvetica", "italic");
                doc.text(`Verified by ${BRAND.name} Central Control System`, 105, finalY, { align: "center" });
                
                // Add page info
                doc.setFontSize(8);
                doc.text(`Page ${index + 1} of ${requests.length}`, 195, 285, { align: "right" });
            });

            await deliverPdf(doc, `${BRAND.shortName}_Pending_Requests_${new Date().toLocaleDateString()}.pdf`);
            showToast("Combined PDF Downloaded", "success");
        };

        img.onerror = () => {
            console.error("Failed to load logo for PDF");
            showToast("Error generating PDF", "error");
        };
    };

    const handleApprove = async (req: RegistrationRequest) => {
        try {
            if (!window.confirm(`Approve ${req.vihar_group_name}${platformOf(req.brand) !== 'vseva' ? ` (${platformLabel(req.brand)})` : ''}? This will create the admin account immediately.`)) return;

            showToast("Creating organization and admin...", "info");

            await dataService.approveOrgAdmin(req.id);

            showToast("Organization Approved & Created!", "success");

            const message =
`Pranam ${req.captain_name} 🙏
Your ${BRAND.name} Captain account has been approved ✅

Install App ~ ${BRAND.siteUrl || window.location.origin}/

Username: ${req.email}
Password: ${req.mobile}

For Demo & Guide : ${BRAND.contact.demoContact}${BRAND.instagram ? `

Connect on Instagram ${BRAND.instagram.url}` : ''}`;
            const waLink = `https://wa.me/91${req.mobile}?text=${encodeURIComponent(message)}`;
            window.open(waLink, '_blank');


            setRequests(prev => prev.filter(r => r.id !== req.id));
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
            await dataService.rejectRegistrationRequest(id);

            showToast(`Request marked as ${status}`, "success");
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            showToast("Failed to update status", "error");
        }
    };

    // Calculate Global Totals
    const totalOrgs = orgStats.length;
    const totalSevaks = orgStats.reduce((acc, curr) => acc + curr.total_sevaks, 0);
    const totalEntries = orgStats.reduce((acc, curr) => acc + curr.total_entries, 0);
    const pendingRequests = requests.length;

    // Serial badges (VS1, VS2… / SSG1…) are numbered within each brand so adding a group
    // to one brand never renumbers another brand's groups.
    const ID_PREFIX: Record<string, string> = { vseva: 'VS', ssg: 'SSG' };
    const sortedStats = [...orgStats].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const serialById = new Map<string, string>();
    const serialCounters: Record<string, number> = {};
    sortedStats.forEach(s => {
        const b = s.brand || 'vseva';
        serialCounters[b] = (serialCounters[b] || 0) + 1;
        serialById.set(s.org_id, `${ID_PREFIX[b] ?? b.toUpperCase()}${serialCounters[b]}`);
    });

    if (!isPinVerified) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-black p-6">
                <div className="max-w-md w-full bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl text-center">
                    <div className="w-20 h-20 bg-saffron-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-saffron-500/30">
                        <Lock className="text-saffron-500" size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Super Admin Access</h1>
                    <p className="text-gray-400 mb-8">Enter the secure PIN to access the global dashboard</p>
                    
                    <form onSubmit={handlePinSubmit} className="space-y-6">
                        <div className="relative">
                            <input
                                type="password"
                                maxLength={4}
                                placeholder="• • • •"
                                value={pinEntry}
                                onChange={(e) => setPinEntry(e.target.value)}
                                className={`w-full bg-white/5 border-2 text-center text-3xl tracking-[1.5em] font-mono py-4 rounded-2xl text-white focus:outline-none transition-all ${
                                    pinError ? 'border-red-500 animate-shake' : 'border-white/10 focus:border-saffron-500'
                                }`}
                                autoFocus
                            />
                            {pinError && (
                                <p className="text-red-500 text-sm mt-2 font-medium">Incorrect PIN. Please try again.</p>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-saffron-600 hover:bg-saffron-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-saffron-900/20 active:scale-[0.98] transition-all"
                        >
                            Authorize Access
                        </button>
                    </form>
                    <p className="mt-8 text-xs text-gray-500 uppercase tracking-widest font-bold">Secure Environment</p>
                </div>
            </div>
        );
    }

    if (accessError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                    <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4"><Lock size={26} /></div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Access not available</h1>
                    <p className="text-sm text-gray-600 mb-6">{accessError}</p>
                    <a href="/" className="inline-block px-5 py-2.5 rounded-xl bg-saffron-600 text-white text-sm font-bold">Back to home</a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 lg:p-12">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-saffron-600 rounded-lg text-white shadow-lg shadow-saffron-200">
                                <ShieldCheck size={24} />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">{BRAND.name} Central Control</h1>
                        </div>
                        <p className="text-gray-500">
                            {scope && !scope.all ? 'Monitoring and onboarding for your groups' : 'Global monitoring and organization lifecycle management'}
                            {scope && <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-saffron-50 text-saffron-700 text-xs font-bold border border-saffron-100 align-middle">{scope.all ? 'All brands' : scope.brands.map(b => b.toUpperCase()).join(', ')}</span>}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={handleRefresh}
                            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 font-medium transition-colors shadow-sm"
                        >
                            <RefreshCw size={18} className={(loading || statsLoading) ? "animate-spin" : ""} />
                            Refresh Data
                        </button>
                        <button 
                            onClick={() => setIsPinVerified(false)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Lock Dashboard"
                        >
                            <Lock size={20} />
                        </button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <Building2 size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Active Groups</p>
                                <p className="text-2xl font-bold text-gray-900">{statsLoading ? '...' : statsError ? '—' : totalOrgs}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-saffron-50 text-saffron-600 rounded-xl">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Global Sevaks</p>
                                <p className="text-2xl font-bold text-gray-900">{statsLoading ? '...' : statsError ? '—' : totalSevaks}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                                <LayoutDashboard size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Total Vihars</p>
                                <p className="text-2xl font-bold text-gray-900">{statsLoading ? '...' : statsError ? '—' : totalEntries}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                                <PieChart size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Pending Approvals</p>
                                <p className="text-2xl font-bold text-orange-600">{loading ? '...' : requestsError ? '—' : pendingRequests}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Registration Requests Table */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <MessageCircle size={18} className="text-saffron-600" />
                                Pending Organization Requests
                            </h2>
                            {pendingRequests > 0 && (
                                <span className="px-2 py-0.5 bg-saffron-100 text-saffron-700 text-xs font-bold rounded-full">
                                    {pendingRequests} New
                                </span>
                            )}
                        </div>
                        {requests.length > 0 && (
                            <button
                                onClick={downloadAllRequestsPDF}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all font-bold text-xs shadow-sm"
                            >
                                <Download size={16} /> Download All (PDF)
                            </button>
                        )}
                    </div>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                                    <tr>
                                        <th className="p-5 w-10"></th>
                                        <th className="p-5">Date</th>
                                        <th className="p-5">Vihar Group Name</th>
                                        <th className="p-5">Captain</th>
                                        <th className="p-5">Mobile</th>
                                        <th className="p-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {requests.length > 0 ? requests.map(req => (
                                        <React.Fragment key={req.id}>
                                            <tr className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-5">
                                                    <button onClick={() => toggleRow(req.id)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                                        {expandedRows.has(req.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                    </button>
                                                </td>
                                                <td className="p-5 text-sm text-gray-500 font-medium">
                                                    {new Date(req.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-5 font-bold text-gray-900">
                                                    {req.vihar_group_name}
                                                    {scope?.all && <PlatformBadge brand={req.brand} />}
                                                </td>
                                                <td className="p-5 text-sm text-gray-800 font-medium">
                                                    {req.captain_name}
                                                </td>
                                                <td className="p-5 text-sm text-gray-600">
                                                    {req.mobile}
                                                </td>
                                                <td className="p-5 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button
                                                            onClick={() => handleApprove(req)}
                                                            className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm shadow-green-100 transition-all active:scale-95"
                                                        >
                                                            <Check size={14} /> Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(req.id)}
                                                            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                            title="Reject"
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedRows.has(req.id) && (
                                                <tr className="bg-gray-50/80">
                                                    <td colSpan={6} className="p-8">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-sm">
                                                            <div className="space-y-1">
                                                                <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider">Sangh Name</span>
                                                                <span className="text-gray-800 font-bold">{req.sangh_name}</span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider">Vice Captain</span>
                                                                <span className="text-gray-800 font-bold">{req.vice_captain_name || '-'}</span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider">Email Address</span>
                                                                <span className="text-gray-800 font-bold">{req.email}</span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider">Location Status</span>
                                                                <span className="text-gray-800 font-bold">{req.city}, {req.state}</span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider">Town / Area</span>
                                                                <span className="text-gray-800 font-bold">{req.town || '-'}</span>
                                                            </div>
                                                            <div className="col-span-1 sm:col-span-2 space-y-1">
                                                                <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider">Full Postal Address</span>
                                                                <span className="text-gray-800 font-bold">{req.full_address}</span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="block text-gray-400 font-bold text-[10px] uppercase tracking-wider">Pin Code</span>
                                                                <span className="text-gray-800 font-bold">{req.pin_code}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center">
                                                {loading ? (
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Loader2 className="animate-spin text-saffron-600" size={32} />
                                                        <span className="text-gray-500 font-medium">Fetching requests...</span>
                                                    </div>
                                                ) : requestsError ? (
                                                    <StatusScreen variant={requestsError} onRetry={fetchRequests} compact bare />
                                                ) : (
                                                    <div className="space-y-2">
                                                        <p className="text-gray-400 text-lg font-medium font-serif">All clear!</p>
                                                        <p className="text-gray-400 text-sm">No pending organization requests discovered.</p>
                                                    </div>
                                                )}
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
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Building2 size={18} className="text-blue-600" />
                        Managed Organizations
                    </h2>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                                    <tr>
                                        <th className="p-5 w-16">Org ID</th>
                                        <th className="p-5">Group Name</th>
                                        <th className="p-5">Captain</th>
                                        <th className="p-5">Mobile</th>
                                        <th className="p-5">Town</th>
                                        <th className="p-5">City</th>
                                        <th className="p-5">State</th>
                                        <th className="p-5 text-center">Sevaks</th>
                                        <th className="p-5 text-center">Vihars</th>
                                        <th className="p-5 text-right">Last Activity</th>
                                        <th className="p-5 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {orgStats.length > 0 ? sortedStats
                                        .map((stat) => {
                                        const admin = orgAdmins[stat.org_id];
                                        return (
                                            <tr key={stat.org_id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-5">
                                                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-black tracking-wide bg-saffron-600 text-white shadow-sm shadow-saffron-200 select-all">
                                                        {serialById.get(stat.org_id)}
                                                    </span>
                                                </td>
                                                <td className="p-5 font-bold text-gray-900">
                                                    {stat.org_name}
                                                    {scope?.all && <PlatformBadge brand={stat.brand} />}
                                                </td>
                                                <td className="p-5 text-sm text-gray-700 font-medium">
                                                    {admin?.full_name || '-'}
                                                </td>
                                                <td className="p-5 text-sm text-gray-600 font-mono">
                                                    {admin?.mobile || '-'}
                                                </td>
                                                <td className="p-5 text-sm text-gray-600">
                                                    {admin?.town || '-'}
                                                </td>
                                                <td className="p-5 text-sm text-gray-600">
                                                    {stat.city || '-'}
                                                </td>
                                                <td className="p-5 text-sm text-gray-600">
                                                    {admin?.state || '-'}
                                                </td>
                                                <td className="p-5 text-center">
                                                    <span className="inline-block px-3 py-1 bg-saffron-50 text-saffron-700 text-xs font-bold rounded-lg border border-saffron-100">
                                                        {stat.total_sevaks}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
                                                        {stat.total_entries}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-right text-sm text-gray-500 font-medium whitespace-nowrap">
                                                    {stat.last_updated ? new Date(stat.last_updated).toLocaleDateString() : (
                                                        <span className="text-gray-300 italic">No activity</span>
                                                    )}
                                                </td>
                                                <td className="p-5 text-center">
                                                    {admin?.mobile && (
                                                        <button
                                                            onClick={() => {
                                                                const captainName = admin.full_name || 'Captain';
                                                                const lastActivityDate = stat.last_updated ? new Date(stat.last_updated).toLocaleDateString() : 'None';
                                                                const message = [
                                                                    '\uD83D\uDE4F Jai Jinendra \uD83D\uDE4F',
                                                                    '',
                                                                    `Pranam ${captainName},`,
                                                                    '',
                                                                    `A gentle reminder that your Captain Profile Activity is currently showing as ${lastActivityDate}.`,
                                                                    '',
                                                                    'Kindly request you to please update your profile by adding Vihar entries or adding Sevaks at your convenience.',
                                                                    '',
                                                                    'In case of any difficulty, please feel free to get in touch or use the link below for assistance:',
                                                                    '',
                                                                    `\uD83D\uDD17 ${BRAND.siteUrl || window.location.origin}`,
                                                                ].join('\n');
                                                                const encodedMsg = encodeURIComponent(message);
                                                                const phone = `91${admin.mobile}`;
                                                                const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                                                                // Mobile: wa.me deep link → mobile app
                                                                // Desktop: whatsapp:// protocol → opens native WhatsApp desktop app
                                                                const waLink = isMobile
                                                                    ? `https://wa.me/${phone}?text=${encodedMsg}`
                                                                    : `whatsapp://send?phone=${phone}&text=${encodedMsg}`;
                                                                window.open(waLink, '_blank');
                                                            }}
                                                            className="inline-flex items-center justify-center p-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl shadow-sm transition-all active:scale-95"
                                                            title="Send WhatsApp Reminder"
                                                        >
                                                            <MessageCircle size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={10} className="p-20 text-center">
                                                {statsLoading ? (
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Loader2 className="animate-spin text-blue-600" size={32} />
                                                        <span className="text-gray-500 font-medium">Retrieving stats...</span>
                                                    </div>
                                                ) : statsError ? (
                                                    <StatusScreen variant={statsError} onRetry={fetchStats} compact bare />
                                                ) : "No active groups found"}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Public Community Directory — pending listings/edits review */}
                {scope?.all && BRAND.showsDirectoryAdmin && <SuperAdminDirectoryPanel currentUser={currentUser} />}

            </div>
        </div>
    );
};

export default SuperAdminDashboard;

