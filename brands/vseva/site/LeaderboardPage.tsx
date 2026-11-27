import React from 'react';
import { ArrowRight, Route } from 'lucide-react';
import { Section, SiteShell, StoreButtons } from './ui';
import { PAGE_META } from './seo';
import Leaderboard from './Leaderboard';

// /leaderboard: the leaderboard on its own page, the link to share in WhatsApp groups. A short heading, so the board
// itself is in the first screen on a phone; "Share on WhatsApp" is the top floating button (ui.tsx FloatingActions).
// The build writes the board into the page (siteData.ts) and draws its link preview with the current top 3
// (scripts/og-leaderboard.mjs).
const LeaderboardPage: React.FC = () => {
  const meta = PAGE_META['/leaderboard'];
  return (
    <SiteShell page="leaderboard" title={meta.title} description={meta.description}>
      <Section className="pb-16 pt-5 md:pb-20 md:pt-10">
        <nav aria-label="Breadcrumb" className="mb-3 hidden text-[0.85rem] text-[color:var(--muted)] sm:block">
          <ol className="flex items-center gap-2">
            <li><a href="/" className="no-underline hover:text-[color:var(--ink)]">Home</a></li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-[color:var(--ink)]">Leaderboard</li>
          </ol>
        </nav>
        <h1 className="vs-display text-[clamp(2rem,6vw,3.6rem)]">Top Vihar Sevaks<span className="vs-accent">.</span></h1>
        <div className="mt-4">
          <Leaderboard />
        </div>
      </Section>
      <Section className="pb-20 md:pb-28">
        <div className="grid gap-4 md:grid-cols-2">
          <a href="/vihar-routes" className="group vs-tile vs-tile-sky flex items-center justify-between gap-4 !p-6 no-underline">
            <span>
              <span className="flex items-center gap-2 font-[family-name:var(--display)] text-[1.4rem] font-extrabold tracking-[-0.02em]"><Route size={20} aria-hidden /> Find a Vihar route</span>
              <span className="mt-1 block text-[0.95rem] opacity-80">Routes and distances shared by Vihar Seva groups, with the Captain to contact.</span>
            </span>
            <ArrowRight size={22} className="shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </a>
          <div className="vs-tile vs-tile-ink !p-6">
            <p className="font-[family-name:var(--display)] text-[1.4rem] font-extrabold tracking-[-0.02em] text-white">Record your Vihars on vSeva</p>
            <p className="mt-1 text-[0.95rem] text-white/75">Your group&rsquo;s Vihars, Sankalp and stats, in one app.</p>
            <StoreButtons compact className="mt-4" />
          </div>
        </div>
      </Section>
    </SiteShell>
  );
};

export default LeaderboardPage;
