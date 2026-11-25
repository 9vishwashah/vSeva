import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, Globe, Instagram, Mail, Shield, Star, Trash2, MessageCircle, Footprints, Users, Target, BellRing } from 'lucide-react';
import { BRAND } from '@brand';

// About the app (opened from Profile & Settings): what it is, its version, and where to get help.
const isNative = (): boolean => {
  const c = (globalThis as any).Capacitor;
  return !!c && typeof c.isNativePlatform === 'function' && c.isNativePlatform();
};

// The web build stamp (UTC yyyymmddhhmm) as a readable date
const buildLabel = (() => {
  const b = typeof __APP_BUILD__ === 'string' ? __APP_BUILD__ : '';
  if (!/^\d{12}$/.test(b)) return '';
  const d = new Date(Date.UTC(+b.slice(0, 4), +b.slice(4, 6) - 1, +b.slice(6, 8), +b.slice(8, 10), +b.slice(10, 12)));
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
})();

const Row: React.FC<{ href: string; icon: React.ReactNode; tile: string; label: string; sub?: string }> = ({ href, icon, tile, label, sub }) => (
  <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
    className="flex items-center gap-3 p-3 rounded-[20px] bg-surface ring-1 ring-inset ring-line hover:bg-white transition-colors no-underline">
    <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl [&>svg]:h-5 [&>svg]:w-5 ${tile}`} aria-hidden="true">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-[15px] font-semibold text-ink">{label}</span>
      {sub && <span className="block text-[12.5px] text-ink-3 truncate">{sub}</span>}
    </span>
    <ChevronRight size={18} className="shrink-0 text-ink-3" />
  </a>
);

const AboutApp: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [nativeVersion, setNativeVersion] = useState<string | null>(null);
  useEffect(() => {
    if (!isNative()) return;
    import('@capacitor/app').then(({ App }) => App.getInfo()).then(info => setNativeVersion(`${info.version} (${info.build})`)).catch(() => undefined);
  }, []);

  const site = BRAND.siteUrl || window.location.origin;
  const features = [
    { icon: <Footprints />, tile: 'bg-block-sky text-ink', text: 'Record every Vihar with route, distance, Sadhu-Sadhvi and Sevaks' },
    { icon: <Users />, tile: 'bg-block-tea text-block-seashell', text: 'Manage your group’s Sevaks, contacts and approvals' },
    { icon: <Target />, tile: 'bg-block-mustard text-ink', text: 'Set a Sankalp and follow kilometres, streaks and statistics' },
    { icon: <BellRing />, tile: 'bg-block-lavender text-ink', text: 'Vihar alerts, reminders and SOS on your phone' },
  ];

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface ring-1 ring-inset ring-line text-ink hover:bg-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="display text-[1.7rem] sm:text-[2.3rem] font-extrabold text-ink">About</h1>
      </div>

      {/* App card */}
      <div className="bg-surface rounded-card ring-1 ring-inset ring-line p-6 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-white ring-1 ring-inset ring-line overflow-hidden">
          <img src={BRAND.logo} alt="" className={`h-20 w-20 object-contain ${BRAND.logoPadded ? 'scale-[1.4]' : ''}`} />
        </div>
        <h2 className="display mt-4 text-[2rem] font-extrabold text-brand">{BRAND.name}</h2>
        {BRAND.slogan && <p className="mt-1 text-[15px] text-ink-2">{BRAND.slogan}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {nativeVersion && <span className="num inline-flex h-7 items-center rounded-full bg-sunken px-3 text-[12.5px] font-semibold text-ink-2">Version {nativeVersion}</span>}
          {buildLabel && <span className="inline-flex h-7 items-center rounded-full bg-sunken px-3 text-[12.5px] font-semibold text-ink-2">Updated {buildLabel}</span>}
        </div>
      </div>

      {/* What it does */}
      <div className="bg-surface rounded-card ring-1 ring-inset ring-line p-5 space-y-3">
        <p className="m-0 text-sm font-bold text-ink">What {BRAND.name} does</p>
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl [&>svg]:h-5 [&>svg]:w-5 ${f.tile}`} aria-hidden="true">{f.icon}</span>
            <p className="m-0 text-[14px] text-ink-2">{f.text}</p>
          </div>
        ))}
      </div>

      {/* Help and links */}
      <div className="space-y-2">
        <p className="m-0 px-1 display text-[1.15rem] font-bold text-ink">Help and links</p>
        {BRAND.contact.whatsapp && (
          <Row href={`https://wa.me/${BRAND.contact.whatsapp}`} icon={<MessageCircle />} tile="bg-[#25D366]/15 text-[#128C4B]" label="Help on WhatsApp" sub="Questions, sign-in trouble, onboarding" />
        )}
        {BRAND.contact.email && <Row href={`mailto:${BRAND.contact.email}`} icon={<Mail />} tile="bg-block-sky text-ink" label="Email us" sub={BRAND.contact.email} />}
        <Row href={`${site}/documentation`} icon={<BookOpen />} tile="bg-block-mustard text-ink" label="How to use the app" sub="Guides for Captains and Sevaks" />
        {BRAND.playStoreUrl && <Row href={BRAND.playStoreUrl} icon={<Star />} tile="bg-brand text-ink" label="Rate us on Google Play" sub="A few words help other groups find us" />}
        {BRAND.instagram && <Row href={BRAND.instagram.url} icon={<Instagram />} tile="bg-block-pink text-ink" label="Follow on Instagram" sub={BRAND.instagram.handle} />}
        <Row href={site} icon={<Globe />} tile="bg-sunken text-ink" label="Website" sub={site.replace(/^https?:\/\//, '')} />
        <Row href="/privacy" icon={<Shield />} tile="bg-block-tea text-block-seashell" label="Privacy policy" />
        <Row href="/delete-account" icon={<Trash2 />} tile="bg-err-soft text-err" label="Delete my account" sub="How to remove your account and data" />
      </div>

      {BRAND.designer && (
        <p className="text-center text-[12.5px] text-ink-3">
          Designed and built by <span className="font-semibold text-ink-2">{BRAND.designer.name}</span> ({BRAND.designer.org})
        </p>
      )}
    </div>
  );
};

export default AboutApp;
