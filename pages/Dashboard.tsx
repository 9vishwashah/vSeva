import React, { useMemo } from 'react';
import { UserProfile, ViharEntry, UserRole } from '../types';
import { dataService } from '../services/dataService';
import StatCard from '../components/StatCard';
import { Trophy, Users, MapPin, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface DashboardProps {
  currentUser: UserProfile;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  // Memoize data calculation so it doesn't run on every render
  const data = useMemo(() => {
    let entries: ViharEntry[] = [];
    if (currentUser.role === UserRole.ORG_ADMIN) {
      entries = dataService.getEntriesForOrg(currentUser.organization_id);
    } else {
      entries = dataService.getEntriesForSevak(currentUser.name);
    }
    const stats = dataService.calculateStats(entries);
    return { entries, stats };
  }, [currentUser]);

  const recentVihars = data.entries
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

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">
                {currentUser.role === UserRole.ORG_ADMIN ? 'Organization Overview' : 'My Analytics'}
            </h1>
            <p className="text-gray-500 mt-1">Jai Jinendra, {currentUser.name}</p>
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
            {/* Chart Area */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Activity Volume</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={recentVihars.reverse()}>
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

            {/* Recent Vihars List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800">Recent Journeys</h3>
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
                        userName={currentUser.name} 
                        orgName={currentUser.organization_id === 'org_1' ? 'Vashi Jain Sangh' : 'Jain Sangh'} 
                    />
                </div>
            )}

            {/* Admin Quick Actions (if admin) */}
            {currentUser.role === UserRole.ORG_ADMIN && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700">
                            + Add New Member
                        </button>
                        <button className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700">
                            Download Monthly Report
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;