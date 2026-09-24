import React, { useEffect, useState } from 'react';
import { UserProfile, ViharEntry, UserRole } from '../types';
import { dataService } from '../services/dataService';
import SankalpRing from '../components/SankalpRing';
import LeaderboardCard from '../components/LeaderboardCard';
import { ChevronLeft, Trophy, Medal } from 'lucide-react';
import Skeleton from '../components/Skeleton';

interface StatisticsProps {
  currentUser: UserProfile;
}

const ACHIEVEMENT_THRESHOLDS = [10, 25, 50, 100];

const Statistics: React.FC<StatisticsProps> = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ViharEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [yearlyGoal, setYearlyGoal] = useState(25);
  const [leaderboard, setLeaderboard] = useState<{ male: any[]; female: any[]; overall: any[] }>({ male: [], female: [], overall: [] });
  const [genderSplit, setGenderSplit] = useState<{ male: number; female: number }>({ male: 0, female: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [allOrgEntries, orgSevaks, lb, goal] = await Promise.all([
          dataService.getEntries(currentUser.organization_id),
          dataService.getAllOrgUsers(currentUser.organization_id, true),
          dataService.getTopSevaks(currentUser.organization_id),
          dataService.getYearlyGoal(currentUser.id),
        ]);

        const myEntries = currentUser.role === UserRole.ORG_ADMIN
          ? allOrgEntries
          : allOrgEntries.filter(e => (e.sevaks || []).includes(currentUser.username));

        setEntries(myEntries);
        setLeaderboard(lb);
        setYearlyGoal(goal);

        const nameMap: Record<string, string> = {};
        orgSevaks.forEach(s => { nameMap[s.username] = s.full_name; });
        setStats(dataService.calculateStats(myEntries, currentUser.username, nameMap));

        const genderByUsername: Record<string, string> = {};
        orgSevaks.forEach(s => { genderByUsername[s.username] = (s.gender || '').toLowerCase(); });
        let male = 0, female = 0;
        myEntries.forEach(e => {
          (e.sevaks || []).forEach(u => {
            const g = genderByUsername[u];
            if (g === 'male') male++;
            else if (g === 'female') female++;
          });
        });
        setGenderSplit({ male, female });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser.organization_id, currentUser.id, currentUser.role, currentUser.username]);

  if (loading || !stats) {
    return (
      <div className="max-w-xl mx-auto space-y-5 pb-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center shrink-0">
            <ChevronLeft size={16} className="text-[#241C17]" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-[#241C17]">Statistics</h1>
            <p className="text-xs text-[#8A6A57]">Every number behind your Seva</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {['#FFF0E5', '#E9F4FD', '#FCEAEB', '#F1EAFB'].map((bg, i) => (
            <div key={i} className="rounded-[18px] p-4" style={{ background: bg }}>
              <Skeleton className="h-7 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="h-[120px] w-full rounded-[22px]" />
        <Skeleton className="h-[160px] w-full rounded-[22px]" />
        <Skeleton className="h-[220px] w-full rounded-[22px]" />
      </div>
    );
  }

  // Weekly trend — Vihar count per day, last 7 days
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    const count = entries.filter(e => e.vihar_date === key).length;
    return { label: d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3), count };
  });
  const maxWeeklyCount = Math.max(1, ...weekDays.map(d => d.count));

  // Consistency — 12 weeks x 7 days heatmap (columns = weeks, oldest first)
  const today = new Date();
  const heatmapWeeks = Array.from({ length: 12 }).map((_, weekIndex) => {
    const weeksAgo = 11 - weekIndex;
    return Array.from({ length: 7 }).map((_, dayIndex) => {
      const d = new Date(today);
      d.setDate(d.getDate() - weeksAgo * 7 - (6 - dayIndex));
      const key = d.toISOString().split('T')[0];
      return entries.some(e => e.vihar_date === key);
    });
  });

  // Top routes
  const routeCounts: Record<string, number> = {};
  entries.forEach(e => {
    const key = `${e.vihar_from} → ${e.vihar_to}`;
    routeCounts[key] = (routeCounts[key] || 0) + 1;
  });
  const topRoutes = Object.entries(routeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const totalGenderCount = genderSplit.male + genderSplit.female;
  const malePct = totalGenderCount > 0 ? Math.round((genderSplit.male / totalGenderCount) * 100) : 0;
  const femalePct = totalGenderCount > 0 ? 100 - malePct : 0;

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-10">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button onClick={() => window.history.back()} className="w-9 h-9 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center shrink-0">
          <ChevronLeft size={16} className="text-[#241C17]" />
        </button>
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-[#241C17]">Statistics</h1>
          <p className="text-xs text-[#8A6A57]">Every number behind your Seva</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[18px] p-4" style={{ background: '#FFF0E5' }}>
          <p className="text-[22px] font-extrabold text-[#241C17] leading-none">{stats.totalKm}<span className="text-[13px] font-bold text-[#8A6A57]"> km</span></p>
          <p className="mt-1 text-xs font-semibold text-[#B5602C]">Total Distance</p>
        </div>
        <div className="rounded-[18px] p-4" style={{ background: '#E9F4FD' }}>
          <p className="text-[22px] font-extrabold text-[#241C17] leading-none">{stats.totalVihars}</p>
          <p className="mt-1 text-xs font-semibold text-[#2E7EB0]">Total Vihars</p>
        </div>
        <div className="rounded-[18px] p-4" style={{ background: '#FCEAEB' }}>
          <p className="text-[22px] font-extrabold text-[#241C17] leading-none">{stats.totalSadhu}<span className="text-sm text-[#D9A6A5]"> / </span>{stats.totalSadhvi}</p>
          <p className="mt-1 text-xs font-semibold text-[#C05A57]">Sadhu / Sadhvi</p>
        </div>
        <div className="rounded-[18px] p-4" style={{ background: '#F1EAFB' }}>
          <p className="text-[22px] font-extrabold text-[#241C17] leading-none">{stats.longestVihar ?? 0}<span className="text-[13px] font-bold text-[#8A6A57]"> km</span></p>
          <p className="mt-1 text-xs font-semibold text-[#6B4FAE]">Longest Vihar</p>
        </div>
      </div>

      {/* Sankalp */}
      <SankalpRing count={entries.filter(e => new Date(`${e.vihar_date}T00:00:00`).getFullYear() === today.getFullYear()).length} goal={yearlyGoal} />

      {/* Weekly trend */}
      <div className="bg-white rounded-[22px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <p className="m-0 mb-4 text-sm font-bold text-[#241C17]">Vihars · Last 7 Days</p>
        <div className="flex items-end gap-2" style={{ height: 110 }}>
          {weekDays.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div
                className="w-full rounded-t-md"
                style={{
                  height: `${Math.max(8, (d.count / maxWeeklyCount) * 100)}%`,
                  background: d.count > 0 ? '#DE6B38' : '#F2E9DE',
                }}
              />
              <span className="text-[10px] font-semibold text-gray-400">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Consistency heatmap */}
      <div className="bg-white rounded-[22px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <p className="m-0 mb-3.5 text-sm font-bold text-[#241C17]">Consistency · Last 12 Weeks</p>
        <div className="grid grid-cols-12 gap-1">
          {heatmapWeeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((done, di) => (
                <div key={di} className="aspect-square rounded-[3px]" style={{ background: done ? '#DE6B38' : '#F2E9DE' }} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Gender participation */}
      {totalGenderCount > 0 && (
        <div className="bg-white rounded-[22px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <p className="m-0 mb-4 text-sm font-bold text-[#241C17]">Participation by Gender</p>
          <div className="flex h-3.5 rounded-lg overflow-hidden mb-3">
            <div style={{ width: `${malePct}%`, background: '#2E7EB0' }} />
            <div style={{ width: `${femalePct}%`, background: '#C9628F' }} />
          </div>
          <div className="flex gap-5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: '#2E7EB0' }} />
              <span className="text-xs font-semibold text-[#241C17]">Male · {malePct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: '#C9628F' }} />
              <span className="text-xs font-semibold text-[#241C17]">Female · {femalePct}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LeaderboardCard title="Top Vihar Sevaks" icon={<Trophy size={20} />} items={leaderboard.male} colorClass="text-blue-600" bgClass="bg-blue-50" />
        <LeaderboardCard title="Top Vihar Sevikas" icon={<Trophy size={20} />} items={leaderboard.female} colorClass="text-pink-600" bgClass="bg-pink-50" />
      </div>

      {/* Top Routes */}
      {topRoutes.length > 0 && (
        <div className="bg-white rounded-[22px] p-5 space-y-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <p className="m-0 text-sm font-bold text-[#241C17]">Top Routes</p>
          {topRoutes.map(([route, count]) => (
            <div key={route} className="flex items-center justify-between">
              <p className="m-0 text-[13.5px] font-semibold text-[#241C17]">{route}</p>
              <p className="m-0 text-[13px] font-bold text-saffron-600">{count} Vihar{count === 1 ? '' : 's'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Achievements — real thresholds against real Vihar count */}
      <div className="bg-white rounded-[22px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <p className="m-0 mb-3.5 text-sm font-bold text-[#241C17]">Achievements</p>
        <div className="grid grid-cols-4 gap-2.5">
          {ACHIEVEMENT_THRESHOLDS.map(threshold => {
            const unlocked = stats.totalVihars >= threshold;
            return (
              <div key={threshold} className="flex flex-col items-center gap-1.5">
                <div
                  className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center"
                  style={{ background: unlocked ? '#FFF0E5' : '#F2EEE8', opacity: unlocked ? 1 : 0.5 }}
                >
                  <Medal size={22} style={{ color: unlocked ? '#DE6B38' : '#B7B7AF' }} />
                </div>
                <span className={`text-[10.5px] font-bold ${unlocked ? 'text-[#241C17]' : 'text-[#B7B7AF]'}`}>{threshold} Vihar</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Statistics;
