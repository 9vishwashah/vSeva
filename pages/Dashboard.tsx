import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ViharEntry, UserRole, Organization, AreaRoute } from '../types';
import { dataService } from '../services/dataService';
import StatCard from '../components/StatCard';
import LeaderboardCard from '../components/LeaderboardCard';
import { Trophy, Users, MapPin, Footprints, Download, FileText, Table, Medal, Handshake, Activity, AlertCircle, X } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import vSevaLogo from '../assets/vseva-logo.png';
import vsgLogo from '../assets/vsg.jpg';
import { NotoSansDevanagariBase64 } from '../assets/NotoSansDevanagari-Regular';
import { NotoSansGujaratiBase64 } from '../assets/NotoSansGujarati-Regular';
import * as XLSX from 'xlsx';

import autoTable from 'jspdf-autotable';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabase';

interface DashboardProps {
  currentUser: UserProfile;
  navigateToProfile?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, navigateToProfile }) => {
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
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Profile completion modal state
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (currentUser.role === UserRole.SEVAK) {
      const isProfileIncomplete = !currentUser.blood_group?.trim() || !currentUser.emergency_number?.trim() || !currentUser.address?.trim();
      if (isProfileIncomplete) {
        const hasSeen = sessionStorage.getItem('hasSeenCompletenessPrompt');
        if (!hasSeen) {
          setShowProfileModal(true);
          sessionStorage.setItem('hasSeenCompletenessPrompt', 'true');
        }
      }
    }
  }, [currentUser]);

  // Close download menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    if (showDownloadMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDownloadMenu]);
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
      console.log("Triggering create_upcoming_alert RPC with data:", alertData);
      const { data: rpcData, error } = await supabase.rpc('create_upcoming_alert', {
        vihar_date_input: alertData.date,
        vihar_time_input: alertData.time,
        from_loc: alertData.from,
        to_loc: alertData.to,
        v_type: alertData.type,
        s_count: Number(alertData.sadhu),
        sv_count: Number(alertData.sadhvi)
      });

      if (error) {
        console.error("RPC Error:", error);
        alert(`Failed to trigger alert! Error: ${JSON.stringify(error)}`);
        throw error;
      };

      console.log("RPC Success. Data:", rpcData);
      showToast(`Alert sent with Priority!`, 'success');
      setIsAlertOpen(false);
      // Reset form
      setAlertData({ date: new Date().toISOString().split('T')[0], time: '06:00', from: '', to: '', type: 'morning', sadhu: 0, sadhvi: 0 });
    } catch (err: any) {
      console.error("Catch Error:", err);
      alert(`System Error: ${err.message || "Unknown error occurred"}`);
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
          dataService.getAllOrgUsers(currentUser.organization_id, true),
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
        
        // Load map securely via proxy if possible
        const secureMap = await dataService.getSevakNameMap(currentUser.organization_id);
        Object.assign(nameMap, secureMap);

        orgSevaks.forEach(s => {
          nameMap[s.username] = s.full_name;
          nameMap[s.username.split('@')[0]] = s.full_name;
        });
        setSevakMap(nameMap);

        // To calculate RANK, we need ALL entries for the organization
        const allOrgEntries = await dataService.getEntries(currentUser.organization_id);

        let myEntries: ViharEntry[] = [];
        let rank: number | string = "N/A";
        let totalCount: number | null = null;

        if (currentUser.role === UserRole.ORG_ADMIN) {
          // Admin sees org stats
          myEntries = allOrgEntries;
          rank = "Admin";
          totalCount = orgSevaks.length;
        } else {
          // Sevak sees own stats
          myEntries = allOrgEntries.filter(e => (e.sevaks || []).includes(currentUser.username));
          // Calculate Rank & Total count (using RPC to bypass RLS)
          const [rankRes, totalRes] = await Promise.all([
            dataService.getSevakRank(currentUser.organization_id, currentUser.username),
            dataService.getTotalOrgSevaks(currentUser.organization_id)
          ]);
          rank = rankRes;
          totalCount = totalRes;
        }

        const stats = dataService.calculateStats(myEntries, currentUser.username, nameMap);
        stats.vRank = rank;

        try {
          const detailedStats = await dataService.getDashboardStats(currentUser.organization_id);
          stats.totalOrgSevaks = detailedStats.totalMale + detailedStats.totalFemale;
          stats.activeSevaks = detailedStats.activeMale + detailedStats.activeFemale;
          stats.totalMale = detailedStats.totalMale;
          stats.totalFemale = detailedStats.totalFemale;
          stats.activeMale = detailedStats.activeMale;
          stats.activeFemale = detailedStats.activeFemale;
        } catch (e) {
          console.error("Failed to load accurate dashboard stats", e);
          if (totalCount !== null) {
              stats.totalOrgSevaks = totalCount;
          } else {
              stats.totalOrgSevaks = 0;
          }
          stats.activeSevaks = 0;
          stats.totalMale = 0;
          stats.totalFemale = 0;
          stats.activeMale = 0;
          stats.activeFemale = 0;
        }

        // (Active sevaks count is now fetched directly via dataService.getDashboardStats)

        // Fetch Leaderboard for Everyone
        let leaderboard = await dataService.getTopSevaks(currentUser.organization_id);

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
    const plainUsername = username.split('@')[0];
    return sevakMap[username] || sevakMap[plainUsername] || plainUsername;
  };

  const prepareExportData = () => {
    return data.entries.map((entry, index) => {
      const sevakNames = (entry.sevaks || []).map(u => getSevakName(u)).join(', ');

      return {
        srNo: index + 1,
        date: entry.vihar_date ? entry.vihar_date.split('-').reverse().join('-') : '-',
        from: entry.vihar_from,
        to: entry.vihar_to,
        sadhu: entry.no_sadhubhagwan || 0,
        sadhvi: entry.no_sadhvijibhagwan || 0,
        samuday: entry.samuday || '-',
        wheelchair: entry.wheelchair ? 'Yes' : 'No',
        type: entry.vihar_type === 'morning' ? 'Morning' : 'Evening',
        kms: entry.distance_km,
        sevaks: sevakNames
      };
    });
  };

  // Prepare Chart Data (Aggregated by Date)
  const groupedData: Record<string, { km: number, count: number, _rawDate: Date }> = {};

  data.entries.forEach(e => {
    const rawDate = new Date(e.vihar_date);
    // Use ISO string base to cleanly group identical days regardless of timezone shifts
    const key = rawDate.toISOString().split('T')[0];

    if (!groupedData[key]) {
      groupedData[key] = { km: 0, count: 0, _rawDate: rawDate };
    }
    groupedData[key].km += Number(e.distance_km || 0);
    groupedData[key].count += 1;
  });

  // Convert to array, sort by date descending (newest first), take top 7, then reverse for L-to-R chronological chart
  const recentDays = Object.values(groupedData)
    .sort((a, b) => b._rawDate.getTime() - a._rawDate.getTime())
    .slice(0, 7)
    .reverse();

  const chartData = recentDays.map(d => ({
    date: d._rawDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    km: parseFloat(d.km.toFixed(2)),
    count: d.count
  }));

  const maxKm = chartData.length > 0 ? Math.max(...chartData.map(d => d.km)) : 0;

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      const exportData = prepareExportData();

      if (exportData.length === 0) {
        showToast("No entries found to export", 'info');
        return;
      }

      doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', NotoSansDevanagariBase64);
      doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'normal');
      doc.addFileToVFS('NotoSansGujarati-Regular.ttf', NotoSansGujaratiBase64);
      doc.addFont('NotoSansGujarati-Regular.ttf', 'NotoSansGujarati', 'normal');

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
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.addImage(vsgLogo, 'JPEG', pageWidth - 14 - 15, 10, 15, 15);

      // Title & Credits
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(18);
      doc.setTextColor(234, 88, 12); // Saffron

      const orgName = orgDetails?.name || 'Organization';
      const orgCity = orgDetails?.city ? `, ${orgDetails.city}` : '';
      const title = `${orgName}${orgCity}`;
      doc.text(title, 35, 18);

      doc.setFontSize(10);
      doc.setTextColor(150); // grey
      doc.text("vSeva by VJAS", 35, 24);

      doc.setFontSize(9);
      doc.setTextColor(100);
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
      const generatedAt = `${now.toLocaleDateString('en-GB')} ${timeString}`;
      doc.text(`Generated on: ${generatedAt}`, 14, 38);

      doc.setTextColor(234, 88, 12); // Saffron
      const managerText = `Managed by: ${currentUser.full_name}`;
      doc.text(managerText, doc.internal.pageSize.getWidth() - 14, 38, { align: 'right' });

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

      let totalSadhu = 0;
      let totalSadhvi = 0;
      let totalKms = 0;

      const bodyData = exportData.map(item => {
        totalSadhu += Number(item.sadhu) || 0;
        totalSadhvi += Number(item.sadhvi) || 0;
        totalKms += Number(item.kms) || 0;
        return [
          item.srNo,
          item.date,
          item.from,
          item.to,
          item.sadhu,
          item.sadhvi,
          item.samuday,
          item.wheelchair,
          item.type,
          item.kms,
          item.sevaks
        ];
      });

      // Add Total Row
      bodyData.push([
        '',
        'TOTAL',
        '',
        '',
        totalSadhu,
        totalSadhvi,
        '',
        '',
        '',
        parseFloat(totalKms.toFixed(2)),
        ''
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Sr No', 'Date', 'From', 'To', 'Sadhu', 'Sadhvi', 'Samuday', 'Wheelchair', 'Type', 'Kms', 'Sevaks']],
        body: bodyData,
        styles: {
          fontSize: 7,
          lineColor: [200, 200, 200],
          lineWidth: 0.2,
          textColor: [30, 30, 30]
        },
        headStyles: { fillColor: [234, 88, 12], textColor: 255 },
        alternateRowStyles: { fillColor: [255, 250, 245] },
        didParseCell: (hookData) => {
          const text = hookData.cell.raw != null ? String(hookData.cell.raw) : '';
          const hasHindi = /[\u0900-\u097F]/.test(text);
          const hasGujarati = /[\u0A80-\u0AFF]/.test(text);
          if (hasGujarati) {
            hookData.cell.styles.font = 'NotoSansGujarati';
          } else if (hasHindi) {
            hookData.cell.styles.font = 'NotoSansDevanagari';
          }

          // Style for the Total row
          if (hookData.section === 'body' && hookData.row.index === bodyData.length - 1) {
            hookData.cell.styles.fillColor = [254, 235, 219]; // Light saffron/orange bg
            hookData.cell.styles.textColor = [234, 88, 12]; // Saffron text
            hookData.cell.styles.fontStyle = 'bold';
            // Custom fonts might not have bold, fallback to normal for non-English if needed
            if (!hasHindi && !hasGujarati) {
              hookData.cell.styles.font = 'helvetica';
            }
          }
        },
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
        'From': item.from,
        'To': item.to,
        'No of Sadhu': item.sadhu,
        'No of Sadhvi': item.sadhvi,
        'Samuday': item.samuday,
        'Wheelchair': item.wheelchair,
        'Type': item.type,
        'Kms': item.kms,
        'Sevaks': item.sevaks
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
      {/* Profile Completion Modal (Stats Page) */}
      {showProfileModal && (
        <div 
          className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowProfileModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 p-6 relative border-t-4 border-orange-500"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex justify-center mb-4 text-orange-500">
               <AlertCircle size={48} className="drop-shadow-sm" />
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Kindly Complete Your Profile</h3>
            <p className="text-sm text-center text-gray-600 mb-6 leading-relaxed">
              Updating your Blood Group, Emergency Number, and Address ensures we can assist you promptly during an incident. It is also required to generate your complete Vihar Sevak Card.
            </p>
            <div className="flex gap-3">
                <button 
                    onClick={() => setShowProfileModal(false)} 
                    className="flex-1 py-2.5 text-orange-700 font-semibold bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors border border-orange-100"
                >
                    Later
                </button>
                <button 
                    onClick={() => {
                        setShowProfileModal(false);
                        if (navigateToProfile) navigateToProfile();
                    }} 
                    className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-saffron-600 hover:from-orange-700 hover:to-saffron-700 text-white font-bold rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-95"
                >
                    Complete Now
                </button>
            </div>
          </div>
        </div>
      )}

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



      {/* Header - Orange Gradient Banner */}
      <div className="relative rounded-2xl bg-gradient-to-br from-saffron-500 via-orange-500 to-amber-400 p-5 sm:p-6 text-white shadow-lg">
        {/* Decorative circles — clipped inside their own container so dropdown isn't cut */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute top-4 right-32 w-16 h-16 rounded-full bg-white/5" />
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-5">
          {/* Left: greeting + org */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-full bg-orange-100 flex items-center justify-center border-2 border-white shadow-md">
              <span className="text-saffron-600 font-bold text-lg sm:text-xl">
                {currentUser.full_name ? currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'VS'}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-tight drop-shadow-md text-white/95 truncate">
                {currentUser.full_name}
              </h1>
              <div className="mt-1.5 sm:mt-2 inline-flex items-center gap-1.5 px-3 py-1 sm:py-1.5 rounded-full bg-white/20 border border-white/30 shadow-sm backdrop-blur-sm self-start max-w-full">
                <span className="inline-block w-2 h-2 rounded-full bg-white shadow-sm shrink-0" />
                <p className="text-white text-xs sm:text-sm font-semibold tracking-wide truncate">
                  {orgDetails
                    ? `${orgDetails.name}${orgDetails.city ? `, ${orgDetails.city}` : ''}`
                    : currentUser.organization_id}
                </p>
              </div>
            </div>
          </div>

          {/* Right: action buttons (admin only) */}
          {currentUser.role === UserRole.ORG_ADMIN && (
            <div className="flex flex-row gap-2.5 shrink-0">
              <button
                onClick={() => setIsAlertOpen(true)}
                className="flex items-center justify-center gap-2 bg-white text-saffron-600 hover:bg-saffron-50 font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all active:scale-95"
              >
                <MapPin size={18} />
                <span>Alert Vihar</span>
              </button>

              <div ref={downloadMenuRef} className="relative">
                <button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 text-white font-semibold px-4 py-2.5 rounded-xl transition-all w-full active:scale-95"
                >
                  <Download size={18} />
                  <span>Export</span>
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
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
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">



        {/* Left Col: Stats & Chart */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Stats Grid - Rich Modern */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. Total Km */}
            <div className="group bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(234,88,12,0.15)] transition-all duration-300 border border-gray-100 hover:border-saffron-200 relative overflow-hidden hover:-translate-y-0.5">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-saffron-500 rounded-t-2xl" />
              <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 group-hover:rotate-6 duration-500">
                <Footprints size={56} className="text-saffron-600" />
              </div>
              <div className="p-5 pt-6 relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-gradient-to-br from-orange-50 to-saffron-100 rounded-xl border border-saffron-100 shadow-sm">
                    <Footprints size={15} className="text-saffron-600 shrink-0" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Km</span>
                </div>
                {isLoading ? <SkeletonLoader /> : <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{data.stats.totalKm}<span className="text-sm font-semibold text-saffron-400 ml-1">km</span></p>}
              </div>
            </div>

            {/* 2. Total Vihars */}
            <div className="group bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(59,130,246,0.15)] transition-all duration-300 border border-gray-100 hover:border-blue-200 relative overflow-hidden hover:-translate-y-0.5">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-t-2xl" />
              <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 group-hover:rotate-6 duration-500">
                <MapPin size={56} className="text-blue-600" />
              </div>
              <div className="p-5 pt-6 relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-100 shadow-sm">
                    <MapPin size={15} className="text-blue-600 shrink-0" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Vihars</span>
                </div>
                {isLoading ? <SkeletonLoader /> : <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{data.stats.totalVihars}</p>}
              </div>
            </div>

            {/* 3. Sadhubhagwant */}
            <div className="group bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(239,68,68,0.15)] transition-all duration-300 border border-gray-100 hover:border-red-200 relative overflow-hidden hover:-translate-y-0.5">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-400 to-rose-500 rounded-t-2xl" />
              <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 group-hover:rotate-6 duration-500">
                <Users size={56} className="text-red-600" />
              </div>
              <div className="p-5 pt-6 relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-gradient-to-br from-red-50 to-rose-100 rounded-xl border border-red-100 shadow-sm">
                    <Users size={15} className="text-red-600 shrink-0" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400" title="SADHUBHAGWANT">Sadhu</span>
                </div>
                {isLoading ? <SkeletonLoader /> : <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{data.stats.totalSadhu}</p>}
              </div>
            </div>

            {/* 4. Sadhvijibhagwant */}
            <div className="group bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(236,72,153,0.15)] transition-all duration-300 border border-gray-100 hover:border-pink-200 relative overflow-hidden hover:-translate-y-0.5">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-400 to-fuchsia-500 rounded-t-2xl" />
              <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 group-hover:rotate-6 duration-500">
                <Users size={56} className="text-pink-600" />
              </div>
              <div className="p-5 pt-6 relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-gradient-to-br from-pink-50 to-fuchsia-100 rounded-xl border border-pink-100 shadow-sm">
                    <Users size={15} className="text-pink-600 shrink-0" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400" title="SADHVIJIBHAGWANT">Sadhvi</span>
                </div>
                {isLoading ? <SkeletonLoader /> : <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{data.stats.totalSadhvi}</p>}
              </div>
            </div>

            {/* 5. Rank (Sevaks Only) */}
            {currentUser.role !== UserRole.ORG_ADMIN && (
              <div className="group bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(234,179,8,0.15)] transition-all duration-300 border border-gray-100 hover:border-yellow-200 relative overflow-hidden hover:-translate-y-0.5">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-t-2xl" />
                <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 group-hover:rotate-6 duration-500">
                  <Medal size={56} className="text-yellow-600" />
                </div>
                <div className="p-5 pt-6 relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl border border-yellow-100 shadow-sm">
                      <Medal size={15} className="text-yellow-600 shrink-0" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Rank</span>
                  </div>
                  {isLoading ? <SkeletonLoader /> : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-gray-900 tracking-tight">#{data.stats.vRank}</span>
                      <span className="text-xs text-amber-400 font-bold ml-1 bg-amber-50 px-1.5 py-0.5 rounded-full">Org</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. Synergy (Sevaks Only) */}
            {currentUser.role !== UserRole.ORG_ADMIN && (
              <div className="group bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(234,88,12,0.15)] transition-all duration-300 border border-gray-100 hover:border-saffron-200 relative overflow-hidden hover:-translate-y-0.5">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-saffron-400 to-orange-500 rounded-t-2xl" />
                <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 group-hover:rotate-6 duration-500">
                  <Handshake size={56} className="text-saffron-600" />
                </div>
                <div className="p-5 pt-6 relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-gradient-to-br from-orange-50 to-saffron-100 rounded-xl border border-saffron-100 shadow-sm">
                      <Handshake size={15} className="text-saffron-600 shrink-0" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Co-Sevak</span>
                  </div>
                  {isLoading ? <SkeletonLoader /> : (
                    <div className="flex flex-wrap gap-1">
                      {data.stats.vSynergy && data.stats.vSynergy !== "N/A" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-saffron-50 to-orange-50 text-saffron-700 border border-saffron-200 shadow-sm">
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

            {/* 7. Total Sevaks */}
            <div className="group bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.15)] transition-all duration-300 border border-gray-100 hover:border-emerald-200 relative overflow-hidden hover:-translate-y-0.5">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-t-2xl" />
              <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 group-hover:rotate-6 duration-500">
                <Users size={56} className="text-emerald-600" />
              </div>
              <div className="p-5 pt-6 relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-50 to-teal-100 rounded-xl border border-emerald-100 shadow-sm">
                    <Users size={15} className="text-emerald-600 shrink-0" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Sevaks</span>
                </div>
                {isLoading ? <SkeletonLoader /> : (
                  <div>
                    <p className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">{data.stats.totalOrgSevaks}</p>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-100 shadow-sm">
                        {data.stats.totalMale || 0}
                      </span>
                      <div className="h-3 w-[1px] bg-gray-200" />
                      <span className="w-5 h-5 rounded-full bg-pink-50 flex items-center justify-center text-[10px] font-bold text-pink-600 border border-pink-100 shadow-sm">
                        {data.stats.totalFemale || 0}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 8. Active Sevaks */}
            <div className="group bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(139,92,246,0.15)] transition-all duration-300 border border-gray-100 hover:border-violet-200 relative overflow-hidden hover:-translate-y-0.5">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 to-purple-500 rounded-t-2xl" />
              <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 group-hover:rotate-6 duration-500">
                <Activity size={56} className="text-violet-600" />
              </div>
              <div className="p-5 pt-6 relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-gradient-to-br from-violet-50 to-purple-100 rounded-xl border border-violet-100 shadow-sm">
                    <Activity size={15} className="text-violet-600 shrink-0" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400" title=">= 1 Vihar in last 30 days">Active Sevaks</span>
                </div>
                {isLoading ? <SkeletonLoader /> : (
                  <div>
                    <p className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">{data.stats.activeSevaks}</p>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-100 shadow-sm">
                        {data.stats.activeMale || 0}
                      </span>
                      <div className="h-3 w-[1px] bg-gray-200" />
                      <span className="w-5 h-5 rounded-full bg-pink-50 flex items-center justify-center text-[10px] font-bold text-pink-600 border border-pink-100 shadow-sm">
                        {data.stats.activeFemale || 0}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Leaderboards - ADMIN ONLY */}
          {currentUser.role === UserRole.ORG_ADMIN && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <LeaderboardCard
                title="Top Vihar Sevaks"
                icon={<Trophy size={20} />}
                items={data.leaderboard?.male || []}
                colorClass="text-blue-600"
                bgClass="bg-blue-50"
                loading={isLoading}
                orgName={orgDetails?.name || ''}
              />
              <LeaderboardCard
                title="Top Vihar Sevikas"
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
            <h3 className="text-lg font-bold text-gray-800 mb-6">Recent Vihar Activity</h3>
            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                    <Tooltip
                      cursor={{ fill: '#f9fafb' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border border-gray-100 p-3 rounded-xl shadow-lg">
                              <p className="font-bold text-gray-800 mb-1">{payload[0].payload.date}</p>
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Distance</p>
                                  <p className="text-saffron-600 font-bold">{payload[0].value} km</p>
                                </div>
                                <div className="h-8 w-px bg-gray-100"></div>
                                <div>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vihars</p>
                                  <p className="text-gray-700 font-bold">{payload[0].payload.count}</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="km" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.km === maxKm && maxKm > 0 ? '#ea580c' : '#fdba74'} />
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

          {/* Leaderboards - SEVAK ONLY (Gender Specific) */}
          {currentUser.role !== UserRole.ORG_ADMIN && (() => {
            const gender = (currentUser.gender || '').toLowerCase();
            const showMale = gender !== 'female'; // show male card for males or if gender unknown
            const showFemale = gender !== 'male'; // show female card for females or if gender unknown
            return (
              <div className="grid grid-cols-1 gap-6 pt-2">
                {showMale && (
                  <LeaderboardCard
                    title="Top Vihar Sevaks"
                    icon={<Trophy size={20} />}
                    items={data.leaderboard?.male || []}
                    colorClass="text-blue-600"
                    bgClass="bg-blue-50"
                    loading={isLoading}
                    orgName={orgDetails?.name || ''}
                  />
                )}
                {showFemale && (
                  <LeaderboardCard
                    title="Top Vihar Sevikas"
                    icon={<Trophy size={20} />}
                    items={data.leaderboard?.female || []}
                    colorClass="text-pink-600"
                    bgClass="bg-pink-50"
                    loading={isLoading}
                    orgName={orgDetails?.name || ''}
                  />
                )}
              </div>
            );
          })()}
        </div>

        {/* Right Col: Stat Card Preview */}
        <div className="flex flex-col items-center">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 w-full flex flex-col items-center">
            <h3 className="text-lg font-bold text-gray-800 mb-4 self-start">{currentUser.role === UserRole.ORG_ADMIN ? 'Your Vihar Group Summary' : 'Your Impact Card'}</h3>
            <StatCard
              stats={data.stats}
              userName={currentUser.full_name}
              orgName={orgDetails?.name || 'vSeva'}
              orgCity={orgDetails?.city || ''}
              loading={isLoading}
              isAdmin={currentUser.role === UserRole.ORG_ADMIN}
              topSevak={(data.leaderboard as any)?.male?.[0] || null}
              topSevika={(data.leaderboard as any)?.female?.[0] || null}
            />
          </div>

        </div>
      </div>

    </div>

  );
};

export default Dashboard;