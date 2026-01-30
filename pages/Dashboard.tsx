import React, { useState, useEffect } from 'react';
import { UserProfile, ViharEntry, UserRole, Organization, AreaRoute } from '../types';
import { dataService } from '../services/dataService';
import StatCard from '../components/StatCard';
import { Trophy, Users, MapPin, Activity, Download, FileText, Table, Heart, UserCheck, Medal } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabase';

interface DashboardProps {
  currentUser: UserProfile;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{ entries: ViharEntry[], stats: any }>({
    entries: [],
    stats: {
      totalVihars: 0,
      totalKm: 0,
      totalSadhu: 0,
      totalSadhvi: 0,
      longestVihar: 0,
      streak: 0,
      vSynergy: "N/A",
      vRank: "N/A"
    }
  });

  const [orgDetails, setOrgDetails] = useState<Organization | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [availableRoutes, setAvailableRoutes] = useState<AreaRoute[]>([]);
  const [uniqueAreas, setUniqueAreas] = useState<string[]>([]);

  const [alertData, setAlertData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '06:00',
    from: '',
    to: '',
    type: 'morning',
    sadhu: 0,
    sadhvi: 0
  });

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_upcoming_alert', {
        vihar_date_input: alertData.date,
        vihar_time_input: alertData.time,
        from_loc: alertData.from,
        to_loc: alertData.to,
        v_type: alertData.type,
        s_count: Number(alertData.sadhu),
        sv_count: Number(alertData.sadhvi)
      });

      if (error) throw error;
      showToast(`Alert sent with Priority!`, 'success');
      setIsAlertOpen(false);
      // Reset form
      setAlertData({ date: new Date().toISOString().split('T')[0], time: '06:00', from: '', to: '', type: 'morning', sadhu: 0, sadhvi: 0 });
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to create alert", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Fetch Org Details & Sevaks (for name mapping)
        const [org, orgSevaks, routes] = await Promise.all([
          dataService.getOrganization(currentUser.organization_id),
          dataService.getOrgSevaks(currentUser.organization_id),
          dataService.getRoutes()
        ]);
        setOrgDetails(org);
        setAvailableRoutes(routes);

        // Extract Unique Areas
        const areas = new Set<string>();
        routes.forEach(r => {
          areas.add(r.from_name);
          areas.add(r.to_name);
        });
        setUniqueAreas(Array.from(areas).sort());

        // Create username -> fullname map for Synergy display
        const nameMap: Record<string, string> = {};
        orgSevaks.forEach(s => { nameMap[s.username] = s.full_name.split(' ')[0]; });

        // To calculate RANK, we need ALL entries for the organization
        const allOrgEntries = await dataService.getEntries(currentUser.organization_id);

        let myEntries: ViharEntry[] = [];
        let rank: number | string = "N/A";

        if (currentUser.role === UserRole.ORG_ADMIN) {
          // Admin sees org stats
          myEntries = allOrgEntries;
          rank = "Admin";
        } else {
          // Sevak sees own stats
          myEntries = allOrgEntries.filter(e => (e.sevaks || []).includes(currentUser.username));
          // Calculate Rank
          rank = await dataService.getSevakRank(currentUser.organization_id, currentUser.username);
        }

        const stats = dataService.calculateStats(myEntries, currentUser.username, nameMap);
        stats.vRank = rank;

        setData({ entries: myEntries, stats });
      } catch (e) {
        console.error(e);
        showToast("Failed to load dashboard data", 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentUser]);

  // Prepare Chart Data (Last 7 Days)
  const chartData = data.entries
    .slice(0, 7)
    .reverse()
    .map(e => ({
      date: new Date(e.vihar_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      km: e.distance_km
    }));

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Vihar Entry Report", 14, 20);
      doc.setFontSize(11);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

      const tableData = data.entries.map(row => [
        row.vihar_date,
        row.vihar_from,
        row.vihar_to,
        row.distance_km?.toString() || '0',
        (row.no_sadhubhagwan || 0) + (row.no_sadhvijibhagwan || 0),
        row.sevaks.join(', ')
      ]);

      autoTable(doc, {
        head: [['Date', 'From', 'To', 'Km', 'Gurus', 'Sevaks']],
        body: tableData,
        startY: 35,
      });

      doc.save(`Vihar_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast("PDF Report downloaded successfully", 'success');
      setShowDownloadMenu(false);
    } catch (error) {
      showToast("Failed to generate PDF", 'error');
    }
  };

  const downloadCSV = () => {
    try {
      const headers = ['Date', 'Type', 'From', 'To', 'Distance(km)', 'Sadhu', 'Sadhvi', 'Sevaks', 'Wheelchair', 'Notes'];
      const rows = data.entries.map(e => [
        e.vihar_date,
        e.vihar_type,
        e.vihar_from,
        e.vihar_to,
        e.distance_km,
        e.no_sadhubhagwan,
        e.no_sadhvijibhagwan,
        `"${e.sevaks.join(', ')}"`, // Handle commas in names
        e.wheelchair ? 'Yes' : 'No',
        `"${e.notes || ''}"`
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Vihar_Export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      showToast("CSV Export downloaded successfully", 'success');
      setShowDownloadMenu(false);
    } catch (error) {
      showToast("Failed to export CSV", 'error');
    }
  };

  const SkeletonLoader = ({ width = "w-16" }) => (
    <div className={`h-8 ${width} bg-gray-200 rounded animate-pulse mt-1`}></div>
  );

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Alert Modal */}
      {isAlertOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="bg-saffron-600 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <MapPin className="animate-bounce" size={20} />
                <h3 className="font-bold text-lg">Announce Upcoming Vihar</h3>
              </div>
              <button onClick={() => setIsAlertOpen(false)} className="hover:bg-saffron-700 p-1 rounded-full"><Users size={20} /></button>
            </div>

            <form onSubmit={handleCreateAlert} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                  <input type="date" required className="w-full p-2 border rounded-lg"
                    value={alertData.date} onChange={e => setAlertData({ ...alertData, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
                  <input type="time" required className="w-full p-2 border rounded-lg"
                    value={alertData.time} onChange={e => setAlertData({ ...alertData, time: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                  <select className="w-full p-2 border rounded-lg"
                    value={alertData.type} onChange={e => setAlertData({ ...alertData, type: e.target.value })} >
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From</label>
                  <select
                    required
                    className="w-full p-2 border rounded-lg appearance-none bg-white"
                    value={alertData.from}
                    onChange={e => setAlertData({ ...alertData, from: e.target.value, to: '' })}
                  >
                    <option value="">Start Location</option>
                    {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To</label>
                  <select
                    required
                    disabled={!alertData.from}
                    className="w-full p-2 border rounded-lg appearance-none bg-white disabled:bg-gray-50"
                    value={alertData.to}
                    onChange={e => setAlertData({ ...alertData, to: e.target.value })}
                  >
                    <option value="">End Location</option>
                    {uniqueAreas.filter(a => a !== alertData.from).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sadhu Bhagwan</label>
                  <input type="number" min="0" className="w-full p-2 border rounded-lg"
                    value={alertData.sadhu} onChange={e => setAlertData({ ...alertData, sadhu: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sadhviji Bhagwan</label>
                  <input type="number" min="0" className="w-full p-2 border rounded-lg"
                    value={alertData.sadhvi} onChange={e => setAlertData({ ...alertData, sadhvi: Number(e.target.value) })} />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAlertOpen(false)} className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-lg">Cancel</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-saffron-600 hover:bg-saffron-700 text-white font-bold rounded-lg shadow-lg shadow-saffron-200">
                  {isLoading ? 'Sending...' : '📢 Send Alert to All'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 font-serif">
            Namaste, {currentUser.full_name.split(' ')[0]} 🙏
          </h1>
          <p className="text-gray-500 mt-1">
            Overview for {orgDetails?.name || currentUser.organization_id}
          </p>
        </div>

        {currentUser.role === UserRole.ORG_ADMIN && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsAlertOpen(true)}
              className="flex items-center space-x-2 bg-saffron-600 hover:bg-saffron-700 text-white px-4 py-2 rounded-lg shadow-lg shadow-saffron-200 transition-all animate-pulse-slow"
            >
              <MapPin size={18} />
              <span className="font-bold">Alert Upcoming Vihar</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="flex items-center space-x-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg shadow-sm transition-all"
              >
                <Download size={18} />
                <span>Download Report</span>
              </button>
              {showDownloadMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <button onClick={downloadPDF} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center space-x-2 text-sm text-gray-700">
                    <FileText size={16} className="text-red-500" />
                    <span>Download PDF</span>
                  </button>
                  <button onClick={downloadCSV} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center space-x-2 text-sm text-gray-700 border-t border-gray-50">
                    <Table size={16} className="text-green-500" />
                    <span>Export CSV</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Col: Stats & Chart */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Stats Grid - Updated to 6 Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* 1. Total Km */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center space-x-2 text-saffron-600 mb-2">
                <Activity size={18} className="shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Km</span>
              </div>
              {isLoading ? <SkeletonLoader /> : <p className="text-2xl font-bold text-gray-800">{data.stats.totalKm}</p>}
            </div>

            {/* 2. Total Vihars */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center space-x-2 text-blue-600 mb-2">
                <MapPin size={18} className="shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Vihars</span>
              </div>
              {isLoading ? <SkeletonLoader /> : <p className="text-2xl font-bold text-gray-800">{data.stats.totalVihars}</p>}
            </div>

            {/* 3. Sadhubhagwant */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center space-x-2 text-red-600 mb-2">
                <Users size={18} className="shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider truncate" title="SADHUBHAGWANT">Sadhubhagwant</span>
              </div>
              {isLoading ? <SkeletonLoader /> : <p className="text-2xl font-bold text-gray-800">{data.stats.totalSadhu}</p>}
            </div>

            {/* 4. Sadhvijibhagwant */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center space-x-2 text-pink-600 mb-2">
                <Users size={18} className="shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider truncate" title="SADHVIJIBHAGWANT">Sadhvijibhagwant</span>
              </div>
              {isLoading ? <SkeletonLoader /> : <p className="text-2xl font-bold text-gray-800">{data.stats.totalSadhvi}</p>}
            </div>

            {/* 5. VSynergy */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 col-span-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-purple-600 mb-2">
                  <Heart size={18} className="shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">VSynergy</span>
                </div>
                {isLoading ? <SkeletonLoader width="w-24" /> : (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {data.stats.vSynergy !== "N/A" && data.stats.vSynergy ? (
                      data.stats.vSynergy.split(',').slice(0, 2).map((name: string, i: number) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 capitalize border border-purple-200">
                          {name.trim().split(' ')[0]}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 font-medium">-</span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Top Partner</p>
            </div>

            {/* 6. vRank */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative group">
              <div className="flex items-center space-x-2 text-orange-500 mb-2">
                <Medal size={18} className="shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider">vRank</span>
              </div>
              {isLoading ? <SkeletonLoader width="w-12" /> : (
                <div>
                  <p className="text-2xl font-bold text-gray-800">#{data.stats.vRank}</p>
                  <p className="text-[10px] text-gray-400">Org Leaderboard</p>
                </div>
              )}
              {/* Info Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-[10px] p-2 rounded hidden group-hover:block z-50 text-center shadow-lg">
                Rank based on total Vihars. Ties broken by Total Km.
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Activity (Last 7 Days)</h3>
            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                    <Tooltip
                      cursor={{ fill: '#f9fafb' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="km" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#ea580c' : '#fdba74'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  {isLoading ? "Loading activity..." : "No recent activity to show."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Stat Card Preview */}
        <div className="flex flex-col items-center">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 w-full flex flex-col items-center">
            <h3 className="text-lg font-bold text-gray-800 mb-4 self-start">Your Impact Card</h3>
            <StatCard
              stats={data.stats}
              userName={currentUser.full_name}
              orgName={orgDetails?.name || 'vSeva'}
              loading={isLoading}
            />
            <p className="text-xs text-gray-400 mt-4 text-center">
              Share this card on social media to inspire others.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;