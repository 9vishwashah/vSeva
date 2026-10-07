import React, { useEffect, useState, useMemo } from 'react';
import { UserProfile, ViharEntry, UserRole, Organization } from '../types';
import { dataService } from '../services/dataService';
import SankalpRing from '../components/SankalpRing';
import { useOrgSankalp } from '../services/sankalpService';
import { isDateInViharYear } from '../services/viharYear';
import { useViharYear } from '../context/ViharYearContext';
import { toLocalDateKey } from '../services/dateUtils';
import LeaderboardCard from '../components/LeaderboardCard';
import { Trophy, Medal, Flame } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import StatusScreen from '../components/StatusScreen';

interface StatisticsProps {
  currentUser: UserProfile;
}

const ACHIEVEMENT_THRESHOLDS = [10, 25, 50, 100];

const Statistics: React.FC<StatisticsProps> = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<'offline' | 'error' | null>(null);
  const [entries, setEntries] = useState<ViharEntry[]>([]);
  const [orgEntriesAll, setOrgEntriesAll] = useState<ViharEntry[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [genderMap, setGenderMap] = useState<Record<string, string>>({});
  const [orgDetails, setOrgDetails] = useState<Organization | null>(null);
  const [captainName, setCaptainName] = useState<string>('');
  const [streakLeaderboard, setStreakLeaderboard] = useState<{ username: string; name: string; streak: number }[]>([]);

  const isAdmin = currentUser.role === UserRole.ORG_ADMIN;

  const { selectedVY, selectedVYStartYear, currentVYStartYear } = useViharYear();
  // The Group Sankalp the Captain set for the selected Vihar Year (everyone in the group sees the same card).
  const orgSankalp = useOrgSankalp(currentUser.organization_id, selectedVY.startYear);

  const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [allOrgEntries, rankingEntries, orgSevaks, org] = await Promise.all([
          dataService.getEntries(currentUser.organization_id),
          // Org-wide, for the leaderboard only — getEntries() above is RLS-
          // limited to a Sevak's own entries, which would make the "Top
          // Vihar Sevaks/Sevikas" leaderboard only ever show themselves.
          dataService.getOrgEntriesForRanking(currentUser.organization_id),
          // Org-wide roster (username/full_name/gender) — profiles RLS only
          // lets a Sevak read their own row, so getAllOrgUsers() here would
          // have silently returned just themselves, dropping every other
          // sevak out of the gender-filtered leaderboard/Participation split.
          dataService.getOrgRosterForStats(currentUser.organization_id, true),
          dataService.getOrganization(currentUser.organization_id),
        ]);

        const myEntries = isAdmin
          ? allOrgEntries
          : allOrgEntries.filter(e => (e.sevaks || []).includes(currentUser.username));

        setEntries(myEntries);
        setOrgEntriesAll(rankingEntries);
        setOrgDetails(org);

        const nm: Record<string, string> = {};
        const gm: Record<string, string> = {};
        orgSevaks.forEach(s => {
          nm[s.username] = s.full_name;
          gm[s.username] = (s.gender || '').toLowerCase();
        });
        setNameMap(nm);
        setGenderMap(gm);

        // The Vihar Group's own Yearly Sankalp — the Captain's goal, set on
        // their own Profile & Settings, not whichever Sevak happens to be
        // looking at this page. An Admin viewing their own org IS the
        // Captain, so this is a plain self-lookup for them; a Sevak instead
        // waits for the org-wide Captain lookup shared with captainName.
        if (isAdmin) {
          setCaptainName(currentUser.full_name);
          setStreakLeaderboard(dataService.getStreakLeaderboard(allOrgEntries, nm));
        } else {
          dataService.getMyCaptainName().then(name => { if (name) setCaptainName(name); });
        }
      } catch (e) {
        console.error("Failed to load statistics", e);
        setLoadError(navigator.onLine ? 'error' : 'offline');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    load();
  }, [currentUser.organization_id, currentUser.id, currentUser.role, currentUser.username]);

  // Vihar Year (VY) scoping: KPI tiles, achievements, and the leaderboard all
  // reset for whichever VY the selector picks, like a Financial Year P&L —
  // computed live from vihar_date, nothing stored or moved. Streak stays
  // lifetime/continuous — a real streak spanning a VY boundary shouldn't get
  // truncated just because the period rolled over. Pure client-side derivation
  // from already-fetched data, so changing the year needs no re-fetch.
  const stats = useMemo(() => {
    const myEntriesVY = entries.filter(e => isDateInViharYear(e.vihar_date, selectedVY));
    const vyStats = dataService.calculateStats(myEntriesVY, currentUser.username, nameMap);
    vyStats.streak = dataService.calculateStats(entries, currentUser.username, nameMap).streak;
    return vyStats;
  }, [entries, selectedVY.start.getTime(), selectedVY.end.getTime(), nameMap, currentUser.username]);

  const leaderboard = useMemo(() => {
    const orgEntriesVY = orgEntriesAll.filter(e => isDateInViharYear(e.vihar_date, selectedVY));
    return dataService.getTopSevaksLeaderboard(orgEntriesVY, nameMap, genderMap);
  }, [orgEntriesAll, selectedVY.start.getTime(), selectedVY.end.getTime(), nameMap, genderMap]);

  // Org-wide (Participation by Gender is about the whole org's Seva, not
  // just whoever happens to be looking at the page) — same orgEntriesAll
  // source as the leaderboard below.
  const genderSplit = useMemo(() => {
    let male = 0, female = 0;
    orgEntriesAll
      .filter(e => isDateInViharYear(e.vihar_date, selectedVY))
      .forEach(e => {
        (e.sevaks || []).forEach(u => {
          const g = genderMap[u];
          if (g === 'male') male++;
          else if (g === 'female') female++;
        });
      });
    return { male, female };
  }, [orgEntriesAll, selectedVY.start.getTime(), selectedVY.end.getTime(), genderMap]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-5 pb-10">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-[#241C17]">Group Analytics</h1>
          <p className="text-xs text-[#8A6A57]">Every number behind your Seva</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

  if (loadError) {
    return (
      <div className="max-w-5xl mx-auto space-y-5 pb-10">
        <StatusScreen variant={loadError} onRetry={load} />
      </div>
    );
  }

  // When browsing a past VY, anchor these rolling windows to the end of that
  // VY instead of today, so they show that period's own activity rather than
  // an unrelated "right now".
  const isViewingCurrentVY = selectedVYStartYear === currentVYStartYear;
  const vyAnchorDate = isViewingCurrentVY ? new Date() : selectedVY.end;

  // Weekly trend — Vihar count per day, last 7 days (of the selected VY)
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(vyAnchorDate);
    d.setDate(d.getDate() - (6 - i));
    const key = toLocalDateKey(d);
    const count = entries.filter(e => e.vihar_date === key).length;
    return { label: d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3), count };
  });
  const maxWeeklyCount = Math.max(1, ...weekDays.map(d => d.count));

  // Consistency — 12 weeks x 7 days heatmap (columns = weeks, oldest first)
  const heatmapWeeks = Array.from({ length: 12 }).map((_, weekIndex) => {
    const weeksAgo = 11 - weekIndex;
    return Array.from({ length: 7 }).map((_, dayIndex) => {
      const d = new Date(vyAnchorDate);
      d.setDate(d.getDate() - weeksAgo * 7 - (6 - dayIndex));
      const key = toLocalDateKey(d);
      return entries.some(e => e.vihar_date === key);
    });
  });

  // Top routes — org-wide (not just the viewer's own entries), scoped to
  // the selected VY like the rest of this page.
  const routeCounts: Record<string, number> = {};
  orgEntriesAll.filter(e => isDateInViharYear(e.vihar_date, selectedVY)).forEach(e => {
    const key = `${e.vihar_from} → ${e.vihar_to}`;
    routeCounts[key] = (routeCounts[key] || 0) + 1;
  });
  const topRoutes = Object.entries(routeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const totalGenderCount = genderSplit.male + genderSplit.female;
  const malePct = totalGenderCount > 0 ? Math.round((genderSplit.male / totalGenderCount) * 100) : 0;
  const femalePct = totalGenderCount > 0 ? 100 - malePct : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-[#241C17] flex items-center gap-2 flex-wrap">
            Group Analytics
            <span className="text-[10px] font-extrabold bg-saffron-100 text-saffron-700 px-2 py-0.5 rounded-full">{selectedVY.label}</span>
          </h1>
          <p className="text-xs text-[#8A6A57]">Every number behind your Seva, this Vihar Year</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
      {/* The Vihar Group's own Sankalp — org-wide progress against the
          Captain's org-wide goal, not just whoever's looking at the page. */}
      <SankalpRing count={orgEntriesAll.filter(e => isDateInViharYear(e.vihar_date, selectedVY)).length} goal={orgSankalp?.target} title="Group Sankalp" tone="purple" periodLabel={selectedVY.label} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
        <LeaderboardCard title="Top Vihar Sevaks" icon={<Trophy size={20} />} items={leaderboard.male} colorClass="text-blue-600" bgClass="bg-blue-50" orgName={orgDetails?.name} orgCity={orgDetails?.city} captainName={captainName} viceCaptainName={orgDetails?.vice_captain_name} vyLabel={selectedVY.label} />
        <LeaderboardCard title="Top Vihar Sevikas" icon={<Trophy size={20} />} items={leaderboard.female} colorClass="text-pink-600" bgClass="bg-pink-50" orgName={orgDetails?.name} orgCity={orgDetails?.city} captainName={captainName} viceCaptainName={orgDetails?.vice_captain_name} vyLabel={selectedVY.label} />
      </div>

      {/* Highest Streaks — Captain-only, org-wide */}
      {isAdmin && streakLeaderboard.length > 0 && (
        <div className="bg-white rounded-[22px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <p className="m-0 mb-3.5 text-sm font-bold text-[#241C17] flex items-center gap-1.5">
            <Flame size={16} className="text-orange-500" /> Highest Streaks
          </p>
          <div className="space-y-2">
            {streakLeaderboard.slice(0, 8).map((s, i) => (
              <div key={s.username} className="flex items-center gap-3">
                <span className={`w-6 text-xs font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-500' : 'text-gray-300'}`}>#{i + 1}</span>
                <span className="flex-1 min-w-0 text-sm font-semibold text-[#241C17] truncate">{s.name}</span>
                <span className="flex items-center gap-1 text-sm font-extrabold text-orange-600">
                  <Flame size={14} /> {s.streak} day{s.streak === 1 ? '' : 's'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
