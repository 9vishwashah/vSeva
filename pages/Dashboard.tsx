import React, { useState, useEffect } from 'react';
import { UserProfile, ViharEntry, UserRole, Organization } from '../types';
import { dataService } from '../services/dataService';
import StatCard from '../components/StatCard';
import { Trophy, Users, MapPin, Activity, Download, FileText, Table, Heart, UserCheck, Medal } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '../context/ToastContext';

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

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Fetch Org Details & Sevaks (for name mapping)
        const [org, orgSevaks] = await Promise.all([
             dataService.getOrganization(currentUser.organization_id),
             dataService.getOrgSevaks(currentUser.organization_id)
        ]);
        setOrgDetails(org);

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
           rank = dataService.calculateRank(allOrgEntries, currentUser.username);
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
    <div className="space-y-8 animate-fade-in">
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
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                                <Tooltip 
                                    cursor={{fill: '#f9fafb'}}
                                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
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