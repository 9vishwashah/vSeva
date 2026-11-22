import React, { useEffect, useState, useMemo } from 'react';
import { UserProfile, ViharEntry, UserRole, Organization } from '../types';
import { dataService } from '../services/dataService';
import SankalpRing from '../components/SankalpRing';
import { useOrgSankalp } from '../services/sankalpService';
import { useCacheRefresh } from '../hooks/useCacheRefresh';
import { isDateInViharYear } from '../services/viharYear';
import { useViharYear } from '../context/ViharYearContext';
import LeaderboardCard from '../components/LeaderboardCard';
import { LastSevenDaysChart, ConsistencyCalendar } from '../components/ViharActivityCharts';
import { Trophy, Medal, Flame } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import { StatBlock, StatBlockSkeleton } from '../components/core';
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

  const load = async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setLoadError(null);
      }
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
        if (!silent) setLoadError(navigator.onLine ? 'error' : 'offline');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    load();
  }, [currentUser.organization_id, currentUser.id, currentUser.role, currentUser.username]);
  useCacheRefresh(() => load(true));

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
          <h1 className="display text-[1.7rem] sm:text-[2.3rem] font-extrabold text-ink">Group Analytics</h1>
          <p className="text-xs text-ink-2">Every number behind your Seva</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <StatBlockSkeleton key={i} />)}
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
        <StatusScreen variant={loadError} onRetry={() => load()} />
      </div>
    );
  }

  // When browsing a past VY, anchor these rolling windows to the end of that
  // VY instead of today, so they show that period's own activity rather than
  // an unrelated "right now".
  const isViewingCurrentVY = selectedVYStartYear === currentVYStartYear;
  const vyAnchorDate = isViewingCurrentVY ? new Date() : selectedVY.end;

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
          <h1 className="display text-[1.7rem] sm:text-[2.3rem] font-extrabold text-ink flex items-center gap-2 flex-wrap">
            Group Analytics
            <span className="text-[11px] font-extrabold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{selectedVY.label}</span>
          </h1>
          <p className="text-xs text-ink-2">Every number behind your Seva, this Vihar Year</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Design Core tiles: same colour meanings as the Dashboard (mustard = distance, sky = Vihars, pink = Sadhu / Sadhvi) */}
        <StatBlock tone="mustard" label="Total Distance" value={stats.totalKm} unit="km" />
        <StatBlock tone="sky" label="Total Vihars" value={stats.totalVihars} />
        <StatBlock tone="pink" label="Sadhu / Sadhvi" value={stats.totalSadhu} of={stats.totalSadhvi} />
        <StatBlock tone="plain" label="Longest Vihar" value={stats.longestVihar ?? 0} unit="km" />
      </div>

      {/* Sankalp */}
      {/* The Vihar Group's own Sankalp — org-wide progress against the
          Captain's org-wide goal, not just whoever's looking at the page. */}
      <SankalpRing count={orgEntriesAll.filter(e => isDateInViharYear(e.vihar_date, selectedVY)).length} goal={orgSankalp?.target} title="Group Sankalp" tone="purple" periodLabel={selectedVY.label} />

      {/* Leaderboards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LeaderboardCard title="Top Vihar Sevaks" icon={<Trophy size={20} />} items={leaderboard.male} colorClass="text-info" bgClass="bg-info-soft" orgName={orgDetails?.name} orgCity={orgDetails?.city} captainName={captainName} viceCaptainName={orgDetails?.vice_captain_name} vyLabel={selectedVY.label} />
        <LeaderboardCard title="Top Vihar Sevikas" icon={<Trophy size={20} />} items={leaderboard.female} colorClass="text-pink-600" bgClass="bg-pink-50" orgName={orgDetails?.name} orgCity={orgDetails?.city} captainName={captainName} viceCaptainName={orgDetails?.vice_captain_name} vyLabel={selectedVY.label} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <LastSevenDaysChart entries={entries} anchorDate={vyAnchorDate} />
        <ConsistencyCalendar entries={entries} anchorDate={vyAnchorDate} />
      </div>

      {/* Gender participation */}
      {totalGenderCount > 0 && (
        <div className="bg-surface rounded-[22px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <p className="m-0 mb-4 text-sm font-bold text-ink">Participation by Gender</p>
          <div className="flex h-3.5 rounded-lg overflow-hidden mb-3">
            <div style={{ width: `${malePct}%`, background: '#9ED6DF' }} />
            <div style={{ width: `${femalePct}%`, background: '#EAA7C7' }} />
          </div>
          <div className="flex gap-5">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#9ED6DF' }} />
              <span className="text-xs font-semibold text-ink">Male · {malePct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#EAA7C7' }} />
              <span className="text-xs font-semibold text-ink">Female · {femalePct}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Highest Streaks — Captain-only, org-wide */}
      {isAdmin && streakLeaderboard.length > 0 && (
        <div className="bg-surface rounded-[22px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <p className="m-0 mb-3.5 text-sm font-bold text-ink flex items-center gap-1.5">
            <Flame size={16} className="text-brand-700" /> Highest Streaks
          </p>
          <div className="space-y-2">
            {streakLeaderboard.slice(0, 8).map((s, i) => (
              <div key={s.username} className="flex items-center gap-3">
                <span className={`w-6 text-xs font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-ink-3' : i === 2 ? 'text-brand-700' : 'text-ink-3'}`}>#{i + 1}</span>
                <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">{s.name}</span>
                <span className="flex items-center gap-1 text-sm font-extrabold text-brand-700">
                  <Flame size={14} /> {s.streak} day{s.streak === 1 ? '' : 's'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Routes */}
      {topRoutes.length > 0 && (
        <div className="bg-surface rounded-[22px] p-5 space-y-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <p className="m-0 text-sm font-bold text-ink">Top Routes</p>
          {topRoutes.map(([route, count]) => (
            <div key={route} className="flex items-center justify-between">
              <p className="m-0 text-[13.5px] font-semibold text-ink">{route}</p>
              <p className="m-0 text-[13px] font-bold text-brand-700">{count} Vihar{count === 1 ? '' : 's'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Achievements — real thresholds against real Vihar count */}
      <div className="bg-surface rounded-[22px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <p className="m-0 mb-3.5 text-sm font-bold text-ink">Achievements</p>
        <div className="grid grid-cols-4 gap-2.5">
          {ACHIEVEMENT_THRESHOLDS.map(threshold => {
            const unlocked = stats.totalVihars >= threshold;
            return (
              <div key={threshold} className="flex flex-col items-center gap-1.5">
                <div
                  className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center"
                  style={{ background: unlocked ? '#FFF4EA' : '#E9E3D8', opacity: unlocked ? 1 : 0.5 }}
                >
                  <Medal size={22} style={{ color: unlocked ? '#E8730C' : '#A49D91' }} />
                </div>
                <span className={`text-[10.5px] font-bold ${unlocked ? 'text-ink' : 'text-ink-3'}`}>{threshold} Vihar</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Statistics;
