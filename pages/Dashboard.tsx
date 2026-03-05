import React, { useState, useEffect } from 'react';
import { UserProfile, ViharEntry, UserRole, Organization, AreaRoute } from '../types';
import { dataService } from '../services/dataService';
import StatCard from '../components/StatCard';
import LeaderboardCard from '../components/LeaderboardCard';
import { Trophy, Users, MapPin, Footprints, Download, FileText, Table, Heart, UserCheck, Medal, Sparkles, Handshake } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import vSevaLogo from '../assets/vseva-logo.png';
import * as XLSX from 'xlsx';

import autoTable from 'jspdf-autotable';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabase';

interface DashboardProps {
  currentUser: UserProfile;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [sevakMap, setSevakMap] = useState<Record<string, string>>({}); // Add this state
  const [data, setData] = useState<{ entries: ViharEntry[], stats: any, leaderboard?: { male: any[], female: any[] } }>({
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
    },
    leaderboard: { male: [], female: [] }
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
        const [org, orgSevaks, routes] = await Promise.all([
          dataService.getOrganization(currentUser.organization_id),
          dataService.getOrgSevaks(currentUser.organization_id),
          dataService.getRoutes(currentUser.organization_id)
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
        setSevakMap(nameMap);

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

        // Fetch Leaderboard for Everyone
        let leaderboard = await dataService.getTopSevaks(currentUser.organization_id);
        if (currentUser.role !== UserRole.ORG_ADMIN) {
          leaderboard.male = leaderboard.male.slice(0, 3);
          leaderboard.female = leaderboard.female.slice(0, 3);
        }

        setData({ entries: myEntries, stats, leaderboard });
      } catch (e) {
        // ...
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentUser]);

  // Helper for names
  const getSevakName = (username: string) => {
    return sevakMap[username] || username.split('@')[0];
  };

  const prepareExportData = () => {
    return data.entries.map((entry, index) => {
      let group = '-';
      if (entry.group_sadhu && entry.group_sadhvi) group = 'Both';
      else if (entry.group_sadhu) group = 'Sadhu';
      else if (entry.group_sadhvi) group = 'Sadhvi';

      const sevakNames = (entry.sevaks || []).map(u => getSevakName(u)).join(', ');

      return {
        srNo: index + 1,
        date: entry.vihar_date,
        group: group,
        from: entry.vihar_from,
        to: entry.vihar_to,
        sadhu: entry.no_sadhubhagwan || 0,
        sadhvi: entry.no_sadhvijibhagwan || 0,
        sevaks: sevakNames,
        wheelchair: entry.wheelchair ? 'Yes' : 'No',
        samuday: entry.samuday || '-',
        type: entry.vihar_type === 'morning' ? 'Morning' : 'Evening',
        kms: entry.distance_km
      };
    });
  };

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
      const exportData = prepareExportData();

      if (exportData.length === 0) {
        showToast("No entries found to export", 'info');
        return;
      }

      // Add Logo (As Base64 or Image) - Using the imported image directly might rely on bundler
      // Ideally we load it into an image object first or verify if jspdf accepts URL
      // For now, let's try adding it. If it fails, we might need to fetch it.
      // Since it's imported via Vite/Webpack, it's a URL.
      // We will assume standard addImage works with that URL in browser environment or we need to convert.
      // Safe bet: load image to dataURL first.

      const img = new Image();
      img.src = vSevaLogo;

      // We need to wait for image load if we weren't sure, but it's likely cached/loaded. 
      // Better approach: simple addImage with the imported path often works in modern bundlers if it's a data URI or valid URL.
      // Let's rely on doc.addImage(vSevaLogo, ...)

      doc.addImage(vSevaLogo, 'PNG', 14, 10, 15, 15);

      // Title & Credits
      doc.setFontSize(18);
      doc.setTextColor(234, 88, 12); // Saffron

      const orgName = orgDetails?.name || 'Organization';
      const orgCity = orgDetails?.city ? `, ${orgDetails.city}` : '';
      const title = `${orgName}${orgCity}`;
      doc.text(title, 35, 18);

      doc.setFontSize(10);
      doc.setTextColor(150); // grey
      doc.text("vSeva by Vishwa Alpesh Shah", 35, 24);

      doc.setFontSize(9);
      doc.setTextColor(100);
      const now = new Date();
      const generatedAt = `${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
      doc.text(`Generated on: ${generatedAt}`, 14, 35);

      // Helper to draw watermark on a page
      const drawWatermark = () => {
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const wmSize = 100; // mm
        const wmX = (pageW - wmSize) / 2;
        const wmY = (pageH - wmSize) / 2;
        (doc as any).saveGraphicsState();
        (doc as any).setGState(new (doc as any).GState({ opacity: 0.12 }));
        doc.addImage(vSevaLogo, 'PNG', wmX, wmY, wmSize, wmSize);
        (doc as any).restoreGraphicsState();
      };

      autoTable(doc, {
        startY: 40,
        head: [['Sr No', 'Date', 'Group', 'From', 'To', 'Sadhu', 'Sadhvi', 'Sevaks', 'Wheelchair', 'Samuday', 'Type', 'Kms']],
        body: exportData.map(item => [
          item.srNo,
          item.date,
          item.group,
          item.from,
          item.to,
          item.sadhu,
          item.sadhvi,
          item.sevaks,
          item.wheelchair,
          item.samuday,
          item.type,
          item.kms
        ]),
        styles: {
          fontSize: 7,
          lineColor: [200, 200, 200],
          lineWidth: 0.2,
        },
        headStyles: { fillColor: [234, 88, 12], textColor: 255 },
        alternateRowStyles: { fillColor: [255, 250, 245] },
        didDrawPage: () => drawWatermark(),
      });

      doc.save(`vSeva_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast("PDF Report downloaded successfully", 'success');
      setShowDownloadMenu(false);
    } catch (error) {
      console.error(error);
      showToast("Failed to generate PDF", 'error');
    }
  };

  const downloadExcel = () => {
    try {
      const data = prepareExportData();
      const excelData = data.map(item => ({
        'Sr No': item.srNo,
        'Date': item.date,
        'Group': item.group,
        'From': item.from,
        'To': item.to,
        'No of Sadhu': item.sadhu,
        'No of Sadhvi': item.sadhvi,
        'Sevaks': item.sevaks,
        'Wheelchair': item.wheelchair,
        'Samuday': item.samuday,
        'Type': item.type,
        'Kms': item.kms
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Vihar Entries");
      XLSX.writeFile(wb, `vSeva_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

      showToast("Excel Export downloaded successfully", 'success');
      setShowDownloadMenu(false);
    } catch (error) {
      showToast("Failed to export Excel", 'error');
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
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-6 rounded-2xl ${currentUser.role === UserRole.ORG_ADMIN ? 'bg-gradient-to-r from-saffron-50 via-white to-saffron-50 border border-saffron-100' : 'bg-white'}`}>
        <div>
          <h1 className="text-3xl font-bold text-gray-800 font-serif">
            Jai Jinendra, {currentUser.full_name.split(' ')[0]}
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
                  <button onClick={downloadExcel} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center space-x-2 text-sm text-gray-700 border-t border-gray-50">
                    <Table size={16} className="text-green-500" />
                    <span>Export Excel</span>
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
          {/* Quick Stats Grid - Modern Minimalistic */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. Total Km */}
            <div className="group bg-white p-5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all border border-transparent hover:border-gray-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                <Footprints size={48} className="text-saffron-600" />
              </div>
              <div className="flex flex-col h-full justify-between relative z-10">
                <div className="flex items-center space-x-2 text-saffron-600 mb-3">
                  <div className="p-1.5 bg-saffron-50 rounded-lg">
                    <Footprints size={16} className="shrink-0" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-saffron-600 transition-colors">Total Km</span>
                </div>
                {isLoading ? <SkeletonLoader /> : <p className="text-3xl font-bold text-gray-900 tracking-tight">{data.stats.totalKm}</p>}
              </div>
            </div>

            {/* 2. Total Vihars */}
            <div className="group bg-white p-5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all border border-transparent hover:border-gray-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                <MapPin size={48} className="text-blue-600" />
              </div>
              <div className="flex flex-col h-full justify-between relative z-10">
                <div className="flex items-center space-x-2 text-blue-600 mb-3">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <MapPin size={16} className="shrink-0" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-blue-600 transition-colors">Vihars</span>
                </div>
                {isLoading ? <SkeletonLoader /> : <p className="text-3xl font-bold text-gray-900 tracking-tight">{data.stats.totalVihars}</p>}
              </div>
            </div>

            {/* 3. Sadhubhagwant */}
            <div className="group bg-white p-5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all border border-transparent hover:border-gray-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                <Users size={48} className="text-red-600" />
              </div>
              <div className="flex flex-col h-full justify-between relative z-10">
                <div className="flex items-center space-x-2 text-red-600 mb-3">
                  <div className="p-1.5 bg-red-50 rounded-lg">
                    <Users size={16} className="shrink-0" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-red-600 transition-colors truncate" title="SADHUBHAGWANT">Sadhu</span>
                </div>
                {isLoading ? <SkeletonLoader /> : <p className="text-3xl font-bold text-gray-900 tracking-tight">{data.stats.totalSadhu}</p>}
              </div>
            </div>

            {/* 4. Sadhvijibhagwant */}
            <div className="group bg-white p-5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all border border-transparent hover:border-gray-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                <Users size={48} className="text-pink-600" />
              </div>
              <div className="flex flex-col h-full justify-between relative z-10">
                <div className="flex items-center space-x-2 text-pink-600 mb-3">
                  <div className="p-1.5 bg-pink-50 rounded-lg">
                    <Users size={16} className="shrink-0" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-pink-600 transition-colors truncate" title="SADHVIJIBHAGWANT">Sadhvi</span>
                </div>
                {isLoading ? <SkeletonLoader /> : <p className="text-3xl font-bold text-gray-900 tracking-tight">{data.stats.totalSadhvi}</p>}
              </div>
            </div>

            {/* 5. Rank (Sevaks Only) */}
            {currentUser.role !== UserRole.ORG_ADMIN && (
              <div className="group bg-white p-5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all border border-transparent hover:border-gray-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                  <Medal size={48} className="text-yellow-600" />
                </div>
                <div className="flex flex-col h-full justify-between relative z-10">
                  <div className="flex items-center space-x-2 text-yellow-600 mb-3">
                    <div className="p-1.5 bg-yellow-50 rounded-lg">
                      <Medal size={16} className="shrink-0" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-yellow-600 transition-colors">Rank</span>
                  </div>
                  {isLoading ? <SkeletonLoader /> : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900 tracking-tight">#{data.stats.vRank}</span>
                      <span className="text-xs text-gray-400 font-medium">Org</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. Synergy (Sevaks Only) */}
            {currentUser.role !== UserRole.ORG_ADMIN && (
              <div className="group bg-white p-5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all border border-transparent hover:border-gray-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                  <Handshake size={48} className="text-saffron-600" />
                </div>
                <div className="flex flex-col h-full justify-between relative z-10">
                  <div className="flex items-center space-x-2 text-saffron-600 mb-3">
                    <div className="p-1.5 bg-saffron-50 rounded-lg">
                      <Handshake size={16} className="shrink-0" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-saffron-600 transition-colors">Synergy</span>
                  </div>
                  {isLoading ? <SkeletonLoader /> : (
                    <div className="flex flex-wrap gap-1">
                      {data.stats.vSynergy && data.stats.vSynergy !== "N/A" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-saffron-50 text-saffron-600 border border-saffron-100">
                          {data.stats.vSynergy.split(',')[0]}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Find a partner</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Leaderboards - ADMIN ONLY */}
          {currentUser.role === UserRole.ORG_ADMIN && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <LeaderboardCard
                title="Top 10 Male Sevaks"
                icon={<Trophy size={20} />}
                items={data.leaderboard?.male || []}
                colorClass="text-blue-600"
                bgClass="bg-blue-50"
                loading={isLoading}
                orgName={orgDetails?.name || ''}
              />
              <LeaderboardCard
                title="Top 10 Female Sevaks"
                icon={<Trophy size={20} />}
                items={data.leaderboard?.female || []}
                colorClass="text-pink-600"
                bgClass="bg-pink-50"
                loading={isLoading}
                orgName={orgDetails?.name || ''}
              />
            </div>
          )}

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

          {/* Leaderboards - SEVAK ONLY (Top 3) */}
          {currentUser.role !== UserRole.ORG_ADMIN && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <LeaderboardCard
                title="Top 3 Male Sevaks"
                icon={<Trophy size={20} />}
                items={data.leaderboard?.male || []}
                colorClass="text-blue-600"
                bgClass="bg-blue-50"
                loading={isLoading}
                orgName={orgDetails?.name || ''}
              />
              <LeaderboardCard
                title="Top 3 Female Sevaks"
                icon={<Trophy size={20} />}
                items={data.leaderboard?.female || []}
                colorClass="text-pink-600"
                bgClass="bg-pink-50"
                loading={isLoading}
                orgName={orgDetails?.name || ''}
              />
            </div>
          )}
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
              isAdmin={currentUser.role === UserRole.ORG_ADMIN}
              topSevak={(data.leaderboard as any)?.overall?.[0] || null}
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