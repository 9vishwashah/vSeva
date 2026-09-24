import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ViharEntry, UserRole, Organization, AreaRoute } from '../types';
import { dataService } from '../services/dataService';
import UpcomingViharCard from '../components/UpcomingViharCard';
import SankalpRing from '../components/SankalpRing';
import { Users, MapPin, Footprints, Download, FileText, Table, Activity, AlertCircle, X, Plus } from 'lucide-react';
import vSevaLogo from '../assets/vseva-logo-removebg-preview.png';
import vsgLogo from '../assets/vsg.jpg';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabase';

interface DashboardProps {
  currentUser: UserProfile;
  navigateToProfile?: () => void;
  navigateToNotifications?: () => void;
  onAddVihar?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, navigateToProfile, navigateToNotifications, onAddVihar }) => {
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
      vRank: "N/A",
      activeUsernames: []
    },
    leaderboard: { male: [], female: [] }
  });

  const [orgDetails, setOrgDetails] = useState<Organization | null>(null);
  const [yearlyGoal, setYearlyGoal] = useState(25);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dataService.getYearlyGoal(currentUser.id).then(setYearlyGoal);
  }, [currentUser.id]);

  // Profile completion modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showActiveSevaksModal, setShowActiveSevaksModal] = useState(false);

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
        const isAdmin = currentUser.role === UserRole.ORG_ADMIN;

        // All of these only depend on currentUser (already known), not on each
        // other's results — they were previously awaited in a 4-stage sequential
        // chain. Firing them together turns ~4 round-trips into 1.
        const [
          org, orgSevaks, routes, secureMap, allOrgEntries, detailedStats, leaderboard, rankPair
        ] = await Promise.all([
          dataService.getOrganization(currentUser.organization_id),
          dataService.getAllOrgUsers(currentUser.organization_id, true),
          dataService.getRoutes(currentUser.organization_id),
          dataService.getSevakNameMap(currentUser.organization_id),
          dataService.getEntries(currentUser.organization_id),
          dataService.getDashboardStats(currentUser.organization_id).catch(e => {
            console.error("Failed to load accurate dashboard stats", e);
            return null;
          }),
          dataService.getTopSevaks(currentUser.organization_id),
          isAdmin
            ? Promise.resolve(null)
            : Promise.all([
                dataService.getSevakRank(currentUser.organization_id, currentUser.username),
                dataService.getTotalOrgSevaks(currentUser.organization_id)
              ]),
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
        Object.assign(nameMap, secureMap);
        orgSevaks.forEach(s => {
          nameMap[s.username] = s.full_name;
          nameMap[s.username.split('@')[0]] = s.full_name;
        });
        setSevakMap(nameMap);

        let myEntries: ViharEntry[];
        let rank: number | string;
        let totalCount: number | null;

        if (isAdmin) {
          // Admin sees org stats
          myEntries = allOrgEntries;
          rank = "Admin";
          totalCount = orgSevaks.length;
        } else {
          // Sevak sees own stats
          myEntries = allOrgEntries.filter(e => (e.sevaks || []).includes(currentUser.username));
          const [rankRes, totalRes] = rankPair as [number | string, number | null];
          rank = rankRes;
          totalCount = totalRes;
        }

        const stats = dataService.calculateStats(myEntries, currentUser.username, nameMap);
        stats.vRank = rank;

        if (detailedStats) {
          stats.totalOrgSevaks = detailedStats.totalMale + detailedStats.totalFemale;
          stats.activeSevaks = detailedStats.activeMale + detailedStats.activeFemale;
          stats.totalMale = detailedStats.totalMale;
          stats.totalFemale = detailedStats.totalFemale;
          stats.activeMale = detailedStats.activeMale;
          stats.activeFemale = detailedStats.activeFemale;
          stats.activeUsernames = detailedStats.activeUsernames || [];
        } else {
          stats.totalOrgSevaks = totalCount !== null ? totalCount : 0;
          stats.activeSevaks = 0;
          stats.totalMale = 0;
          stats.totalFemale = 0;
          stats.activeMale = 0;
          stats.activeFemale = 0;
          stats.activeUsernames = [];
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

  const downloadPDF = async () => {
    try {
      // jsPDF + autoTable (~420KB) and the Hindi/Gujarati font data (~570KB)
      // are only needed for this rarely-used export action — load them on
      // demand instead of bundling them into Dashboard's initial chunk, which
      // every user pays for just to open the app.
      const [
        { default: jsPDF },
        { default: autoTable },
        { NotoSansDevanagariBase64 },
        { NotoSansGujaratiBase64 },
      ] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        import('../assets/NotoSansDevanagari-Regular'),
        import('../assets/NotoSansGujarati-Regular'),
      ]);
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

  const downloadExcel = async () => {
    try {
      // xlsx (~280KB) is only needed for this rarely-used export action —
      // load it on demand rather than bundling it into Dashboard's initial chunk.
      const XLSX = await import('xlsx');
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

  // Tangerine redesign: Consistency + Recent Activity + Sankalp count are all
  // derived from data.entries — no new data source needed.
  const currentYear = new Date().getFullYear();
  const yearlyViharCount = data.entries.filter(e => new Date(`${e.vihar_date}T00:00:00`).getFullYear() === currentYear).length;

  const weekDayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const startOfWeek = (() => {
    const d = new Date();
    const day = (d.getDay() + 6) % 7; // 0 = Monday
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const weeklyConsistency = weekDayLabels.map((label, i) => {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + i);
    const dayKey = dayDate.toISOString().split('T')[0];
    return { label, done: data.entries.some(e => e.vihar_date === dayKey) };
  });

  const recentActivity = [...data.entries]
    .sort((a, b) => new Date(b.vihar_date).getTime() - new Date(a.vihar_date).getTime())
    .slice(0, 3);

  const formatRelativeDate = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

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

      {/* Active Sevaks Modal */}
      {showActiveSevaksModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowActiveSevaksModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 relative border-t-4 border-orange-500 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Activity size={20} className="text-orange-500" /> Active Sevaks</h3>
              <button onClick={() => setShowActiveSevaksModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar">
              {data.stats.activeUsernames && data.stats.activeUsernames.length > 0 ? (
                <ul className="space-y-2">
                  {data.stats.activeUsernames.map((u: string) => {
                    const plainUsername = u.split('@')[0];
                    const fullName = sevakMap[u] || sevakMap[plainUsername] || plainUsername;
                    return (
                      <li key={u} className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100 text-orange-900 font-medium shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-800 font-bold text-xs shrink-0 border border-orange-300">
                          {fullName.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate">{fullName}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-center text-gray-500 py-8">No active sevaks found.</div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* Header - plain greeting bar (Tangerine redesign: gradient moved to Sankalp card below) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 shrink-0 rounded-full bg-[#FCE6D8] flex items-center justify-center">
            <span className="text-[#C05A2C] font-extrabold text-sm">
              {currentUser.full_name ? currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'VS'}
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <p className="m-0 text-xs font-bold text-[#8A6A57]">Jai Jinendra,</p>
            <h1 className="m-0 text-xl sm:text-2xl font-extrabold tracking-tight text-[#241C17] truncate">
              {currentUser.full_name}
            </h1>
          </div>
        </div>

        {/* Action buttons (admin only) */}
        {currentUser.role === UserRole.ORG_ADMIN && (
          <div className="flex flex-row gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setIsAlertOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 bg-saffron-600 hover:bg-saffron-700 text-white font-bold px-3 sm:px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 text-sm"
            >
              <MapPin size={18} />
              <span className="truncate">Alert Vihar</span>
            </button>

            <div ref={downloadMenuRef} className="relative flex-1 md:flex-none">
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="w-full flex items-center justify-center gap-1.5 sm:gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-[#241C17] font-semibold px-3 sm:px-4 py-2.5 rounded-xl transition-all active:scale-95 text-sm shadow-sm"
              >
                <Download size={18} />
                <span className="truncate">Export</span>
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

        {/* Add Vihar (Sevak only) — a Sevak has no direct-log flow, so their entry
            is always a submission awaiting Captain approval. */}
        {currentUser.role === UserRole.SEVAK && onAddVihar && (
          <button
            onClick={onAddVihar}
            className="flex items-center justify-center gap-1.5 bg-saffron-600 hover:bg-saffron-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 text-sm w-full md:w-auto shrink-0"
          >
            <Plus size={18} />
            <span>Add Vihar</span>
          </button>
        )}
      </div>

      {/* Yearly Sankalp — real progress vs. the goal set in Profile settings */}
      <SankalpRing count={yearlyViharCount} goal={yearlyGoal} />

      <UpcomingViharCard currentUser={currentUser} onViewAll={navigateToNotifications} />

      {/* Stats section */}
      <div className="max-w-2xl space-y-8">
        {/* Quick Stats Grid — 2x2 primary tiles (Tangerine redesign, flat tints) */}
          <div className="grid grid-cols-2 gap-3">
            {/* 1. Total Km */}
            <div className="rounded-[18px] p-4 vseva-stagger-in" style={{ background: '#FFF0E5', animationDelay: '0ms' }}>
              {isLoading ? <SkeletonLoader /> : (
                <p className="text-[22px] font-extrabold text-[#241C17] leading-none">{data.stats.totalKm}<span className="text-[13px] font-bold text-[#8A6A57]"> km</span></p>
              )}
              <p className="mt-1 text-xs font-semibold text-[#B5602C]">Total KM</p>
            </div>

            {/* 2. Total Vihars */}
            <div className="rounded-[18px] p-4 vseva-stagger-in" style={{ background: '#E9F4FD', animationDelay: '40ms' }}>
              {isLoading ? <SkeletonLoader /> : (
                <p className="text-[22px] font-extrabold text-[#241C17] leading-none">{data.stats.totalVihars}</p>
              )}
              <p className="mt-1 text-xs font-semibold text-[#2E7EB0]">Vihars</p>
            </div>

            {/* 3. Sadhu / Sadhvi (combined) */}
            <div className="rounded-[18px] p-4 vseva-stagger-in" style={{ background: '#FCEAEB', animationDelay: '80ms' }}>
              {isLoading ? <SkeletonLoader /> : (
                <p className="text-[22px] font-extrabold text-[#241C17] leading-none">{data.stats.totalSadhu}<span className="text-sm text-[#D9A6A5]"> / </span>{data.stats.totalSadhvi}</p>
              )}
              <p className="mt-1 text-xs font-semibold text-[#C05A57]">Sadhu / Sadhvi</p>
            </div>

            {/* 4. Co-Sevak */}
            <div className="rounded-[18px] p-4 vseva-stagger-in" style={{ background: '#F1EAFB', animationDelay: '120ms' }}>
              {isLoading ? <SkeletonLoader /> : (
                currentUser.role === UserRole.ORG_ADMIN ? (
                  <p className="text-[22px] font-extrabold text-[#241C17] leading-none">{data.stats.totalOrgSevaks}</p>
                ) : data.stats.vSynergy && data.stats.vSynergy !== "N/A" ? (
                  <p className="text-[15px] font-extrabold text-[#241C17] leading-tight truncate">{data.stats.vSynergy.split(',')[0]}</p>
                ) : (
                  <p className="text-[15px] font-semibold text-[#8A6A57]/70 italic">Find a partner</p>
                )
              )}
              <p className="mt-1 text-xs font-semibold text-[#6B4FAE]">Co-Sevak</p>
            </div>
          </div>

          {/* Secondary stats — Rank / Total Sevaks / Active Sevaks (kept from existing dashboard, not in the pilot mock but not removed) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {currentUser.role !== UserRole.ORG_ADMIN && (
              <div className="rounded-[18px] p-4 vseva-stagger-in" style={{ background: '#FFF6E0', animationDelay: '160ms' }}>
                {isLoading ? <SkeletonLoader /> : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-[22px] font-extrabold text-[#241C17] leading-none">#{data.stats.vRank}</span>
                  </div>
                )}
                <p className="mt-1 text-xs font-semibold text-[#946800]">Rank in Org</p>
              </div>
            )}

            <div className="rounded-[18px] p-4 vseva-stagger-in" style={{ background: '#E6F7F0', animationDelay: '200ms' }}>
              {isLoading ? <SkeletonLoader /> : (
                <div className="flex items-center gap-2">
                  <span className="text-[22px] font-extrabold text-[#241C17] leading-none">{data.stats.totalOrgSevaks}</span>
                  <span className="text-[10px] font-bold text-[#1F8A63]/70">{data.stats.totalMale || 0}M / {data.stats.totalFemale || 0}F</span>
                </div>
              )}
              <p className="mt-1 text-xs font-semibold text-[#1F8A63]">Total Sevaks</p>
            </div>

            <div className="rounded-[18px] p-4 vseva-stagger-in" style={{ background: '#E3F6F5', animationDelay: '240ms' }}>
              {isLoading ? <SkeletonLoader /> : (
                <div className="flex items-center justify-between">
                  <span className="text-[22px] font-extrabold text-[#241C17] leading-none">{data.stats.activeSevaks}</span>
                  <button onClick={() => setShowActiveSevaksModal(true)} className="text-[9px] font-bold px-2.5 py-1 bg-white/70 text-[#1B8A94] rounded-lg hover:bg-white transition-colors active:scale-95 tracking-wider">VIEW</button>
                </div>
              )}
              <p className="mt-1 text-xs font-semibold text-[#1B8A94]" title=">= 1 Vihar in last 30 days">Active Sevaks</p>
            </div>
          </div>

          {/* Consistency — this week */}
          <div className="bg-white rounded-[22px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <p className="m-0 mb-3.5 text-sm font-bold text-[#241C17]">Consistency · This week</p>
            <div className="grid grid-cols-7 gap-2 text-center">
              {weeklyConsistency.map((d, i) => (
                <div key={d.label}>
                  <p className="m-0 mb-1.5 text-[10px] font-bold text-gray-400">{d.label}</p>
                  <div
                    className="w-full aspect-square rounded-full vseva-stagger-in"
                    style={{
                      background: d.done ? '#DE6B38' : '#F2EEE8',
                      animationDelay: `${i * 40}ms`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-[22px] p-5 flex flex-col gap-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <p className="m-0 text-sm font-bold text-[#241C17]">Recent Activity</p>
              {navigateToNotifications && (
                <button onClick={navigateToNotifications} className="text-[12.5px] font-bold text-saffron-600 hover:text-saffron-700">
                  View all Vihars
                </button>
              )}
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400">No Vihars logged yet.</p>
            ) : (
              recentActivity.map((entry, i) => (
                <div key={entry.id} className="flex items-center gap-3 vseva-stagger-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="shrink-0 w-[38px] h-[38px] rounded-full bg-[#EAF6E6] flex items-center justify-center">
                    <Footprints size={17} className="text-[#5A9A45]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="m-0 text-[13.5px] font-bold text-[#241C17] truncate">{entry.vihar_from} → {entry.vihar_to}</p>
                    <p className="mt-0.5 text-xs text-gray-500 capitalize">
                      {formatRelativeDate(entry.vihar_date)} · {entry.vihar_type} · {(entry.sevaks || []).length} Sevak{(entry.sevaks || []).length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <p className="m-0 text-sm font-extrabold text-saffron-600 shrink-0">{(entry.distance_km ?? entry.haversine_km ?? 0).toFixed(1)} km</p>
                </div>
              ))
            )}
          </div>

      </div>

    </div>

  );
};

export default Dashboard;