import React, { useState } from 'react';
import { ArrowRight, Check, Link2, Route } from 'lucide-react';
import WhatsAppIcon from '../../../components/WhatsAppIcon';
import { PageIntro, Section, SiteShell, StoreButtons } from './ui';
import { PAGE_META, canonical } from './seo';
import Leaderboard from './Leaderboard';

// /leaderboard: the leaderboard on its own page, the link to share in WhatsApp groups. The build writes the board into
// the page (siteData.ts) and gives it its own link preview (public/vseva-og-leaderboard.jpg).
const SHARE_URL = canonical('/leaderboard');
const SHARE_TEXT = `Top Vihar Sevaks and Vihar Seva groups on vSeva. See who walked the most this Vihar Year:\n${SHARE_URL}`;

const ShareRow: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(SHARE_URL); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <a href={`https://wa.me/?text=${encodeURIComponent(SHARE_TEXT)}`} target="_blank" rel="noopener noreferrer" className="vs-btn bg-[#25D366] text-[color:var(--ink)] hover:brightness-95">
        <WhatsAppIcon size={18} /> Share on WhatsApp
      </a>
      <button type="button" onClick={copy} className="vs-btn vs-btn-ghost">
        {copied ? <Check size={17} aria-hidden /> : <Link2 size={17} aria-hidden />} {copied ? 'Link copied' : 'Copy link'}
      </button>
    </div>
  );
};

const LeaderboardPage: React.FC = () => {
  const meta = PAGE_META['/leaderboard'];
  return (
    <SiteShell page="leaderboard" title={meta.title} description={meta.description}>
      <PageIntro
        crumb="Leaderboard"
        eyebrow="Leaderboard"
        title={<>Top Vihar Sevaks<span className="vs-accent">.</span></>}
        lede="The Sevaks, Sevikas and Vihar Seva groups who walk the most, across every group on vSeva. Switch the year, rank by kilometres, or find yourself."
      />
      <Section className="-mt-4 pb-16 md:pb-20">
        <div className="mb-6"><ShareRow /></div>
        <Leaderboard />
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
