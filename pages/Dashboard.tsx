import React, { useState, useEffect } from 'react';
import { UserProfile, ViharEntry, UserRole, Organization } from '../types';
import { dataService } from '../services/dataService';
import StatCard from '../components/StatCard';
import { Trophy, Users, MapPin, Activity, Download, FileText, Table } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DashboardProps {
  currentUser: UserProfile;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  const [data, setData] = useState<{ entries: ViharEntry[], stats: any }>({
    entries: [],
    stats: {
      totalVihars: 0,
      totalKm: 0,
      totalSadhu: 0,
      totalSadhvi: 0,
      longestVihar: 0,
      streak: 0
    }
  });
  
  const [orgDetails, setOrgDetails] = useState<Organization | null>(null);
  const [sevakGenderStats, setSevakGenderStats] = useState<{male: any[], female: any[]}>({ male: [], female: [] });
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      let entries: ViharEntry[] = [];
      try {
        if (currentUser.role === UserRole.ORG_ADMIN) {
          entries = await dataService.getEntries(currentUser.organization_id);
          const org = await dataService.getOrganization(currentUser.organization_id);
          setOrgDetails(org);
          
          // Calculate Gender Stats for Admin View
          const sevaks = await dataService.getOrgSevaks(currentUser.organization_id);
          const maleSevaks: Record<string, number> = {};
          const femaleSevaks: Record<string, number> = {};
          
          // Initialize counts
          sevaks.forEach(s => {
              if (s.gender === 'Male') maleSevaks[s.full_name] = 0;
              else if (s.gender === 'Female') femaleSevaks[s.full_name] = 0;
          });

          // Map username to fullname for entry counting
          const userMap: Record<string, UserProfile> = {};
          sevaks.forEach(s => userMap[s.username] = s);

          // Count Vihars
          entries.forEach(e => {
              e.sevaks?.forEach(username => {
                  const profile = userMap[username];
                  if (profile) {
                      if (profile.gender === 'Male') {
                          maleSevaks[profile.full_name] = (maleSevaks[profile.full_name] || 0) + 1;
                      } else if (profile.gender === 'Female') {
                          femaleSevaks[profile.full_name] = (femaleSevaks[profile.full_name] || 0) + 1;
                      }
                  }
              });
          });

          // Format for Recharts
          const formatData = (obj: Record<string, number>) => 
             Object.entries(obj)
                .map(([name, count]) => ({ name: `${name} (${count})`, count }))
                .sort((a,b) => b.count - a.count);

          setSevakGenderStats({
              male: formatData(maleSevaks),
              female: formatData(femaleSevaks)
          });

        } else {
          entries = await dataService.getSevakEntries(currentUser.username);
          // For Sevak, we can try to fetch their org name too
          const org = await dataService.getOrganization(currentUser.organization_id);
          setOrgDetails(org);
        }
        
        const stats = dataService.calculateStats(entries);
        setData({ entries, stats });

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      }
    };
    fetchData();
  }, [currentUser]);

  const recentVihars = [...data.entries]
    .sort((a,b) => new Date(b.vihar_date).getTime() - new Date(a.vihar_date).getTime())
    .slice(0, 5);

  const StatBox = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  );

  const downloadCSV = () => {
      const headers = ["Date", "Type", "From", "To", "Distance (km)", "Sadhu", "Sadhvi", "Sevaks"];
      const rows = data.entries.map(e => [
          e.vihar_date,
          e.vihar_type,
          e.vihar_from,
          e.vihar_to,
          e.distance_km,
          e.no_sadhubhagwan || 0,
          e.no_sadhvijibhagwan || 0,
          e.sevaks.join('; ')
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `vihar_report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowDownloadMenu(false);
  };

  const downloadPDF = () => {
      const doc = new jsPDF();
      doc.text(`${orgDetails?.name || 'Organization'} - Monthly Report`, 14, 15);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);

      const tableColumn = ["Date", "Type", "Route", "Dist (km)", "Group"];
      const tableRows = data.entries.map(e => [
          e.vihar_date,
          e.vihar_type,
          `${e.vihar_from} -> ${e.vihar_to}`,
          e.distance_km,
          `${e.no_sadhubhagwan || 0} Sadhu, ${e.no_sadhvijibhagwan || 0} Sadhvi`
      ]);

      autoTable(doc, {
          startY: 30,
          head: [tableColumn],
          body: tableRows,
      });

      doc.save(`vihar_report_${new Date().toISOString().slice(0,10)}.pdf`);
      setShowDownloadMenu(false);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">
                {currentUser.role === UserRole.ORG_ADMIN ? 'Organization Overview' : 'My Analytics'}
            </h1>
            <p className="text-gray-500 mt-1">
                Jai Jinendra, {currentUser.full_name} | <span className="font-semibold text-saffron-600">{orgDetails ? `${orgDetails.name}, ${orgDetails.city || ''}` : currentUser.organization_id}</span>
            </p>
        </div>
        {/* Only Sevaks see share card immediately, Admins maybe elsewhere */}
        {currentUser.role === UserRole.SEVAK && (
             <div className="hidden md:block">
                 {/* Desktop placeholder for layout balance */}
             </div>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Total Vihars" value={data.stats.totalVihars} icon={Activity} color="bg-blue-500" />
        <StatBox label="Total KM" value={data.stats.totalKm} icon={MapPin} color="bg-saffron-500" />
        <StatBox label="Gurus Served" value={data.stats.totalSadhu + data.stats.totalSadhvi} icon={Users} color="bg-green-500" />
        <StatBox label="Streak" value={`${data.stats.streak} Days`} icon={Trophy} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Chart & Recent */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* Gender Stats Charts (Admin Only) */}
            {currentUser.role === UserRole.ORG_ADMIN && (
                <>
                    {/* Female Sevaks Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                             <span className="text-pink-500">♀</span> Female Sevaks (Count)
                        </h3>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={sevakGenderStats.female} margin={{ left: 40, right: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12}} />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#666', fontSize: 12 }}>
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Male Sevaks Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                             <span className="text-blue-500">♂</span> Male Sevaks (Count)
                        </h3>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={sevakGenderStats.male} margin={{ left: 40, right: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12}} />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#666', fontSize: 12 }}>
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}

            {/* Activity Activity Chart (Sevak & Admin) */}
            {currentUser.role === UserRole.SEVAK && (
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Activity Volume</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[...recentVihars].reverse()}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="vihar_date" tickFormatter={(val) => val.slice(5)} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="distance_km" fill="#f97316" radius={[4, 4, 0, 0]}>
                                    {recentVihars.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#f97316' : '#fdba74'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Recent Vihars List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800">Recent Vihars</h3>
                </div>
                <div className="divide-y divide-gray-100">
                    {recentVihars.length === 0 ? (
                        <p className="p-6 text-gray-500 text-center">No vihars recorded yet.</p>
                    ) : (
                        recentVihars.map((v) => (
                            <div key={v.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-saffron-50 text-saffron-600 p-2 rounded-lg font-bold text-xs uppercase text-center w-12">
                                        {v.vihar_date.slice(5)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{v.vihar_from} <span className="text-gray-400">→</span> {v.vihar_to}</p>
                                        <p className="text-xs text-gray-500">{v.group_sadhu ? 'Sadhu' : ''} {v.group_sadhvi ? 'Sadhvi' : ''} Group</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-900">{v.distance_km} km</p>
                                    <p className="text-xs text-gray-500">{v.vihar_type}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        {/* Right Col: Share Card & Badges */}
        <div className="space-y-8">
            {currentUser.role === UserRole.SEVAK && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Share Your Seva</h3>
                    <p className="text-sm text-gray-500 text-center mb-6">Inspire others by sharing your journey card on WhatsApp or Instagram.</p>
                    
                    <StatCard 
                        stats={data.stats} 
                        userName={currentUser.full_name} 
                        orgName={orgDetails?.name || currentUser.organization_id} 
                    />
                </div>
            )}

            {/* Admin Quick Actions (if admin) */}
            {currentUser.role === UserRole.ORG_ADMIN && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
                    <div className="space-y-3 relative">
                        <button className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700">
                            + Add New Member
                        </button>
                        
                        {/* Download Menu */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 flex justify-between items-center"
                            >
                                <span>Download Monthly Report</span>
                                <Download size={16} />
                            </button>
                            
                            {showDownloadMenu && (
                                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                                    <button onClick={downloadCSV} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700">
                                        <Table size={16} className="text-green-600" /> Download CSV
                                    </button>
                                    <button onClick={downloadPDF} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 border-t border-gray-100">
                                        <FileText size={16} className="text-red-600" /> Download PDF
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
