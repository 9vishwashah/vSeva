// Seva Achievement cards: which shareable cards a user has earned, built ONLY from numbers the Dashboard
// already shows (its Vihar-Year stats, rank, streak and Sankalp progress). Nothing here queries the
// database or recomputes a statistic; it picks and phrases. Rendering lives in achievementCard.ts.
//
// To add a new card type: add a kind, push it in buildAchievements() when it is earned, and give it a
// `hero` the renderer understands ('number' | 'ring' | 'summary').

export type AchievementKind = 'vihars' | 'milestone' | 'distance' | 'sankalp' | 'streak' | 'year';
export type CardIcon = 'footprints' | 'medal' | 'route' | 'target' | 'flame' | 'sunrise';

export interface SummaryStat { value: string; label: string }

export type AchievementHero =
  | { type: 'number'; value: string; unit: string }
  | { type: 'ring'; value: string; progress: number; unit: string; detail: string }
  | { type: 'summary'; title: string; period: string; stats: SummaryStat[]; footnote?: string };

export interface Achievement {
  kind: AchievementKind;
  label: string;   // name in the picker
  badge: string;   // small label at the top of the card, e.g. "MILESTONE UNLOCKED"
  icon: CardIcon;
  hero: AchievementHero;
  caption: string; // one short line under the hero
}

export interface AchievementInput {
  /** 'sevak' = the user's own Seva; 'group' = a Captain sharing the whole Vihar Group's Seva. */
  subject: 'sevak' | 'group';
  /** The Dashboard's displayStats for the selected Vihar Year. */
  stats: {
    totalVihars: number;
    totalKm: number;
    totalSadhu: number;
    totalSadhvi: number;
    streak?: number;
    vRank?: number | string;
    activeSevaks?: number;
  };
  /** Distinct days with a Vihar in the selected Vihar Year (from the Dashboard's own entries). */
  sevaDays: number;
  /** Sankalp ring numbers exactly as the Dashboard shows them; target null/undefined = not set. */
  sankalp: { count: number; target: number | null | undefined };
  vyLabel: string; // "VY 2026-27"
}

// Vihar-count milestones. The first four are the Achievements medals on the Statistics page.
export const VIHAR_MILESTONES = [10, 25, 50, 100, 150, 200, 300, 500, 750, 1000];

export const formatCount = (n: number) => Math.round(n).toLocaleString('en-IN');

// KM as the Dashboard stores it (2 decimals) shown with at most one decimal on the card.
export const formatKm = (km: number) => {
  const r = Math.round(km * 10) / 10;
  return Number.isInteger(r) ? r.toLocaleString('en-IN') : r.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function sankalpCaption(pct: number, group: boolean): string {
  if (pct >= 100) return group ? 'Our Sankalp is fulfilled.' : 'Sankalp fulfilled.';
  if (pct >= 75) return 'The Sankalp is within reach.';
  if (pct >= 50) return 'Halfway to the Sankalp.';
  if (pct >= 25) return 'Steadily towards the Sankalp.';
  return 'The Sankalp has begun.';
}

export function buildAchievements(input: AchievementInput): Achievement[] {
  const { subject, stats, sevaDays, sankalp, vyLabel } = input;
  const group = subject === 'group';
  const vihars = Math.max(0, Math.round(stats.totalVihars || 0));
  const km = Math.max(0, Number(stats.totalKm) || 0);
  const list: Achievement[] = [];
  if (vihars === 0) return list; // nothing earned yet this Vihar Year

  // A. Vihar count
  list.push({
    kind: 'vihars',
    label: 'Vihars',
    badge: group ? 'GROUP SEVA' : 'VIHAR SEVA',
    icon: 'footprints',
    hero: { type: 'number', value: formatCount(vihars), unit: plural(vihars, 'VIHAR', 'VIHARS') },
    caption: 'Every step becomes Seva.',
  });

  // F. Highest milestone reached (only once one is reached)
  const milestone = [...VIHAR_MILESTONES].reverse().find(m => vihars >= m);
  if (milestone) {
    list.push({
      kind: 'milestone',
      label: 'Milestone',
      badge: 'MILESTONE UNLOCKED',
      icon: 'medal',
      hero: { type: 'number', value: formatCount(milestone), unit: 'VIHARS' },
      caption: `${formatCount(milestone)} journeys of Seva.`,
    });
  }

  // B. Distance
  if (km > 0) {
    list.push({
      kind: 'distance',
      label: 'Distance',
      badge: 'SEVA DISTANCE',
      icon: 'route',
      hero: { type: 'number', value: formatKm(km), unit: 'KM WALKED IN SEVA' },
      caption: 'Every step. Every Seva.',
    });
  }

  // C. Sankalp: same ratio as the Dashboard's Sankalp ring
  const target = typeof sankalp.target === 'number' && sankalp.target > 0 ? sankalp.target : null;
  if (target && sankalp.count > 0) {
    const progress = Math.max(0, Math.min(1, sankalp.count / target));
    const pct = Math.round(progress * 100);
    list.push({
      kind: 'sankalp',
      label: 'Sankalp',
      badge: pct >= 100 ? 'SANKALP FULFILLED' : 'SANKALP PROGRESS',
      icon: 'target',
      hero: {
        type: 'ring',
        value: `${pct}%`,
        progress,
        unit: group ? 'OF OUR GROUP SANKALP' : 'OF MY SANKALP',
        detail: `${formatCount(sankalp.count)} of ${formatCount(target)} Vihars`,
      },
      caption: sankalpCaption(pct, group),
    });
  }

  // D. Streak (a Sevak's own; the Dashboard shows no streak for a Group)
  const streak = Math.round(stats.streak || 0);
  if (!group && streak >= 2) {
    list.push({
      kind: 'streak',
      label: 'Streak',
      badge: 'SEVA STREAK',
      icon: 'flame',
      hero: { type: 'number', value: formatCount(streak), unit: 'DAYS IN A ROW' },
      caption: 'Consistency becomes Seva.',
    });
  }

  // E. Yearly summary
  const sadhuSadhvi = (stats.totalSadhu || 0) + (stats.totalSadhvi || 0);
  const summary: SummaryStat[] = [
    { value: formatCount(vihars), label: plural(vihars, 'Vihar', 'Vihars') },
    { value: formatKm(km), label: 'KM walked' },
    { value: formatCount(sadhuSadhvi), label: 'Sadhu & Sadhviji' },
    group
      ? { value: formatCount(stats.activeSevaks || 0), label: plural(stats.activeSevaks || 0, 'Active Sevak', 'Active Sevaks') }
      : { value: formatCount(sevaDays), label: plural(sevaDays, 'Day of Seva', 'Days of Seva') },
  ];
  const rank = typeof stats.vRank === 'number' ? stats.vRank : null;
  list.push({
    kind: 'year',
    label: 'Year',
    badge: 'YEARLY ACHIEVEMENT',
    icon: 'sunrise',
    hero: {
      type: 'summary',
      title: group ? 'OUR SEVA JOURNEY' : 'MY SEVA JOURNEY',
      period: vyLabel.replace(/^VY\s*/, ''),
      stats: summary,
      footnote: !group && rank && rank <= 10 ? `#${rank} in my Vihar Group` : undefined,
    },
    caption: group ? 'Together, every step becomes Seva.' : 'Every journey begins with a single step.',
  });

  return list;
}
