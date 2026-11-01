import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Instagram, LogIn, Menu, Phone, X, Youtube } from 'lucide-react';
import WhatsAppIcon from '../../../components/WhatsAppIcon';
import { InstallPWA, IOS_GUIDE_EVENT } from '../../../components/InstallPWA';
import { CONTACT, COMMUNITY_LINKS, NAV, PLAY_STORE_URL, type Screen } from './content';
import './site.css';

export type SitePage = 'home' | 'docs' | 'contact' | 'support';

// iPhone: there is no App Store app, so open the "Add to Home Screen" guide for the web app (InstallPWA)
export const installOnIPhone = () => window.dispatchEvent(new Event(IOS_GUIDE_EVENT));

/* ───────────── Store buttons ───────────── */

// The Google Play mark in its four colours
export const GooglePlayIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden focusable="false">
    <path fill="#00A0FF" d="M1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924z" />
    <path fill="#00D26A" d="M13.544 10.989l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973z" />
    <path fill="#FFC107" d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594z" />
    <path fill="#F4433A" d="M13.544 13.056l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
  </svg>
);

export const AppleIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden focusable="false" fill="currentColor">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
);

// Store-badge style buttons: Android opens Google Play, iPhone opens the Add to Home Screen guide.
// compact = one-line pill for the header; otherwise a two-line badge.
export const StoreButtons: React.FC<{ compact?: boolean; className?: string; onPick?: () => void }> = ({ compact, className = '', onPick }) => (
  <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onPick}
      className={compact ? 'vs-btn vs-btn-sm vs-store-dark' : 'vs-store vs-store-dark'}
      aria-label="Get vSeva on Google Play (Android)"
    >
      <GooglePlayIcon size={compact ? 17 : 24} />
      {compact ? 'Google Play' : <span className="vs-store-text"><span className="vs-store-cap">Get it on</span>Google Play</span>}
    </a>
    <button
      type="button"
      onClick={() => { onPick?.(); installOnIPhone(); }}
      className={compact ? 'vs-btn vs-btn-sm vs-btn-ghost' : 'vs-store vs-store-light'}
      aria-label="Install vSeva on iPhone (web app)"
    >
      <AppleIcon size={compact ? 17 : 24} />
      {compact ? 'iPhone' : <span className="vs-store-text"><span className="vs-store-cap">Install on</span>iPhone</span>}
    </button>
  </div>
);

// True after the first client render; browser-only UI waits for it so prerendered HTML hydrates cleanly.
export const useMounted = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
};

/* ───────────── Layout shell ───────────── */

interface ShellProps {
  page: SitePage;
  title: string;
  description: string;
  onLogin?: () => void;
  children: React.ReactNode;
}

export const SiteShell: React.FC<ShellProps> = ({ page, title, description, onLogin, children }) => {
  const mounted = useMounted();
  const [bannerOpen, setBannerOpen] = useState(true);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('js', 'vs-site');
    (window as any).__vsLive = true; // tells the inline head script that the page came alive
    // Title and description for client-side visits (the prerendered HTML already carries them)
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    // Reveal sections as they scroll into view (CSS does nothing for reduced-motion users)
    const els = Array.from(document.querySelectorAll<HTMLElement>('.vs [data-reveal]:not(.is-in)'));
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-in')); return () => html.classList.remove('vs-site'); }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(el => io.observe(el));
    return () => { io.disconnect(); html.classList.remove('vs-site'); };
  }, [title, description]);

  return (
    <div className="vs min-h-screen">
      <a href="#main" className="vs-skip">Skip to content</a>
      <SiteHeader page={page} onLogin={onLogin} />
      <main id="main" className="pb-10">{children}</main>
      <SiteFooter />
      <FloatingActions raised={mounted && bannerOpen} />
      {/* The existing install banner (Android prompt / iPhone guide), unchanged */}
      {mounted && <InstallPWA variant="light" androidStoreUrl={PLAY_STORE_URL} onDismiss={() => setBannerOpen(false)} />}
    </div>
  );
};

/* ───────────── Header ───────────── */

const isCurrent = (href: string, page: SitePage) =>
  (href === '/documentation' && page === 'docs') || (href === '/contact' && page === 'contact') || (href === '/support-us' && page === 'support');

const LoginLink: React.FC<{ onLogin?: () => void; className: string }> = ({ onLogin, className }) => (
  <a
    href="/login"
    className={className}
    onClick={e => { if (onLogin) { e.preventDefault(); onLogin(); } }}
  >
    <LogIn size={16} aria-hidden /> Login
  </a>
);

export const SiteHeader: React.FC<{ page: SitePage; onLogin?: () => void }> = ({ page, onLogin }) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Mobile menu: focus the first link when it opens; Escape closes it and returns focus to the toggle
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('a,button')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="vs-header" data-scrolled={scrolled || open ? 'true' : 'false'}>
      <div className="mx-auto flex h-full max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2.5 no-underline" aria-label="vSeva home">
          <img src="/vseva-site/logo-96.webp" srcSet="/vseva-site/logo-96.webp 1x, /vseva-site/logo-192.webp 2x" alt="" width={48} height={48} className="h-12 w-12 scale-[1.4] object-contain" />
          <span className="vs-display text-[1.7rem] tracking-[-0.03em] text-[color:var(--ink)]">vSeva</span>
        </a>

        <nav aria-label="Main" className="hidden items-center gap-7 xl:flex">
          {NAV.map(item => (
            <a key={item.href} href={item.href} className="vs-navlink" aria-current={isCurrent(item.href, page) ? 'page' : undefined}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Phones show only Google Play here; iPhone and Login are in the menu */}
          <StoreButtons compact className="hidden !flex-nowrap sm:flex" />
          <span className="sm:hidden">
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="vs-btn vs-btn-sm vs-store-dark" aria-label="Get vSeva on Google Play (Android)">
              <GooglePlayIcon size={17} /> Get app
            </a>
          </span>
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line-strong)] xl:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen(o => !o)}
          >
            {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>
        </div>
      </div>

      <div
        id={menuId}
        ref={panelRef}
        hidden={!open}
        className="border-b border-[color:var(--line)] bg-[color:var(--paper)] xl:hidden"
      >
        <nav aria-label="Mobile" className="mx-auto flex max-w-[1240px] flex-col px-4 pb-5 pt-2 sm:px-6">
          {NAV.map(item => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={isCurrent(item.href, page) ? 'page' : undefined}
              className="flex min-h-[48px] items-center justify-between border-b border-[color:var(--line)] text-[1.05rem] font-medium text-[color:var(--ink)] no-underline"
            >
              {item.label}
              <ArrowUpRight size={16} className="text-[color:var(--muted)]" aria-hidden />
            </a>
          ))}
          <StoreButtons className="mt-5 [&>*]:flex-1" onPick={() => setOpen(false)} />
          <LoginLink onLogin={onLogin} className="vs-btn vs-btn-ghost mt-2.5 w-full" />
        </nav>
      </div>
    </header>
  );
};

/* ───────────── Footer ───────────── */

export const SiteFooter: React.FC = () => {
  const year = new Date().getFullYear();
  const col = 'flex flex-col gap-2.5';
  const link = 'text-[0.95rem] text-[color:var(--ink-2)] no-underline transition-colors hover:text-[color:var(--saffron-deep)]';
  const ext = (href: string) => /^https?:/.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  return (
    <footer className="border-t border-[color:var(--line)] bg-white pb-40 text-[color:var(--ink)] md:pb-28">
      <div className="mx-auto max-w-[1240px] px-4 pt-14 sm:px-6 md:pt-16">
        {/* VJAS business call to action */}
        <div className="grid gap-8 rounded-[28px] bg-[color:var(--saffron-deep)] p-7 text-white md:grid-cols-12 md:items-end md:p-10">
          <div className="md:col-span-8">
            <p className="vs-eyebrow !text-white">VJAS · Digital services</p>
            <h2 className="vs-h2 mt-3 text-white">Looking for digital solutions for your business?</h2>
            <p className="mt-4 max-w-[58ch] text-white">
              From websites and web applications to custom digital solutions, VJAS helps businesses build useful digital experiences.
            </p>
          </div>
          <div className="md:col-span-4 md:text-right">
            <a href={CONTACT.vjasPhoneUrl} className="vs-btn vs-btn-light max-w-full !whitespace-normal py-3 text-center !leading-snug">
              <Phone size={16} aria-hidden /> Contact VJAS: {CONTACT.vjasPhoneDisplay}
            </a>
          </div>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <a href="/" className="flex items-center gap-2.5 no-underline" aria-label="vSeva home">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--line)] bg-white">
                <img src="/vseva-site/logo-96.webp" srcSet="/vseva-site/logo-96.webp 1x, /vseva-site/logo-192.webp 2x" alt="" width={36} height={36} className="h-9 w-9 scale-[1.45] object-contain" loading="lazy" />
              </span>
              <span className="vs-display text-[1.6rem] text-[color:var(--ink)]">vSeva</span>
            </a>
            <p className="mt-4 max-w-[34ch] text-[0.95rem] text-[color:var(--ink-2)]">
              Every Step Counts. A digital platform for recording, managing and understanding the Vihar Seva journey.
            </p>
            <a
              href={CONTACT.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-[color:var(--line-strong)] px-4 py-3 text-[color:var(--ink)] no-underline transition-colors hover:border-[color:var(--saffron)]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF0000] text-white"><Youtube size={18} aria-hidden /></span>
              <span className="leading-tight">
                <span className="block text-[0.95rem] font-semibold">Watch the complete guide and setup</span>
                <span className="block text-[0.8rem] text-[color:var(--muted)]">YouTube · @VJASTECH</span>
              </span>
            </a>
          </div>

          <nav aria-label="Footer: vSeva" className={`${col} lg:col-span-2`}>
            <p className="vs-eyebrow">vSeva</p>
            <a className={link} href="/#features">Features</a>
            <a className={link} href="/#how-it-works">How it works</a>
            <a className={link} href="/#get-started">Get started</a>
            <a className={link} href="/#story">Our story</a>
            <a className={link} href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">Android app on Google Play</a>
            <a className={link} href="/login">Login</a>
          </nav>
          <nav aria-label="Footer: help" className={`${col} lg:col-span-2`}>
            <p className="vs-eyebrow">Help</p>
            <a className={link} href="/documentation">Documentation</a>
            <a className={link} href="/documentation#faq">FAQ</a>
            <a className={link} href="/contact">Contact</a>
            <a className={link} href="/support-us">Support us</a>
            <a className={link} href="/privacy">Privacy Policy</a>
          </nav>
          <nav aria-label="Footer: community" className={`${col} lg:col-span-2`}>
            <p className="vs-eyebrow">Community</p>
            {COMMUNITY_LINKS.map(l => <a key={l.href} className={link} href={l.href} {...ext(l.href)}>{l.title}</a>)}
            <a className={link} href={CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram {CONTACT.instagramHandle}</a>
            <a className={link} href={CONTACT.youtubeUrl} target="_blank" rel="noopener noreferrer">YouTube</a>
          </nav>
          <div className={`${col} lg:col-span-2`}>
            <p className="vs-eyebrow">Reach us</p>
            <a className={link} href={CONTACT.supportWhatsAppUrl} target="_blank" rel="noopener noreferrer">WhatsApp {CONTACT.supportWhatsAppDisplay}</a>
            <a className={link} href={CONTACT.vjasPhoneUrl}>VJAS {CONTACT.vjasPhoneDisplay}</a>
            <a className={link} href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-[color:var(--line)] pt-6 text-[0.85rem] text-[color:var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} VJAS. All rights reserved.</p>
          <p>Designed and Developed by <span className="font-semibold text-[color:var(--saffron-deep)]">VJAS</span></p>
        </div>
      </div>
    </footer>
  );
};

/* ───────────── Floating actions (phones) ───────────── */

export const FloatingActions: React.FC<{ raised: boolean }> = ({ raised }) => (
  <div
    className="fixed right-3 z-30 flex flex-col gap-2.5 md:hidden"
    style={{ bottom: raised ? 'calc(80px + env(safe-area-inset-bottom))' : 'calc(16px + env(safe-area-inset-bottom))', transition: 'bottom 200ms ease' }}
    aria-label="Quick contact"
    role="group"
  >
    <a href={CONTACT.supportWhatsAppUrl} target="_blank" rel="noopener noreferrer" className="vs-fab bg-[#25D366]" aria-label="WhatsApp vSeva support">
      <WhatsAppIcon size={22} />
    </a>
    <a
      href={CONTACT.instagramUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="vs-fab"
      style={{ background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fd5949 45%, #d6249f 60%, #285AEB 90%)' }}
      aria-label={`vSeva on Instagram (${CONTACT.instagramHandle})`}
    >
      <Instagram size={21} aria-hidden />
    </a>
    <a href={CONTACT.vjasPhoneUrl} className="vs-fab bg-[color:var(--saffron-deep)]" aria-label={`Call VJAS, ${CONTACT.vjasPhoneDisplay}`}>
      <Phone size={19} aria-hidden />
    </a>
  </div>
);

/* ───────────── Building blocks ───────────── */

const src = (s: Screen, w: 400 | 760) => `/vseva-site/screens/${s.name}-${w}.webp`;

// A real app screenshot inside the iPhone 17 Pro (Cosmic Orange) mockup, used for every phone on the site. The frame art
// (public/vseva-site/iphone-17-pro-*.webp, from the "iPhone 17 Mockups" Figma Community file by Max Rudberg, CC BY 4.0) has a see-through
// screen; on its 448 × 916 canvas the screen is at x 24, y 21, 402 × 874 (the percentages in site.css).
export const IPhoneShot: React.FC<{ screen: Screen; className?: string; priority?: boolean; sizes?: string }> = ({ screen, className = '', priority, sizes = '(max-width: 640px) 60vw, 300px' }) => (
  <div className={`vs-iphone ${className}`}>
    {/* a cropped capture (shorter than a full screen) sits at the top at full width instead of being cut at the sides */}
    <div className={`vs-iphone-screen${screen.height / screen.width < 1.9 ? ' vs-iphone-partial' : ''}`}>
      <img
        src={src(screen, 760)}
        srcSet={`${src(screen, 400)} 400w, ${src(screen, 760)} 760w`}
        sizes={sizes}
        width={screen.width}
        height={screen.height}
        alt={screen.alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        {...(priority ? { fetchpriority: 'high' } : {})}
      />
    </div>
    <img
      className="vs-iphone-frame"
      src="/vseva-site/iphone-17-pro-448.webp"
      srcSet="/vseva-site/iphone-17-pro-448.webp 448w, /vseva-site/iphone-17-pro-896.webp 896w"
      sizes={sizes}
      width={448}
      height={916}
      alt=""
      aria-hidden
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  </div>
);

// A screenshot without a frame (for wide or partial screens)
export const Shot: React.FC<{ screen: Screen; className?: string; sizes?: string }> = ({ screen, className = '', sizes = '(max-width: 640px) 90vw, 420px' }) => (
  <img
    src={src(screen, 760)}
    srcSet={`${src(screen, 400)} 400w, ${src(screen, 760)} 760w`}
    sizes={sizes}
    width={screen.width}
    height={screen.height}
    alt={screen.alt}
    loading="lazy"
    decoding="async"
    className={className}
  />
);

export const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`vs-eyebrow ${className}`}>{children}</p>
);

export const Section: React.FC<{ id?: string; className?: string; children: React.ReactNode; labelledBy?: string }> = ({ id, className = '', children, labelledBy }) => (
  <section id={id} aria-labelledby={labelledBy} className={`px-4 sm:px-6 ${className}`}>
    <div className="mx-auto max-w-[1240px]">{children}</div>
  </section>
);

// Short page intro used on the inner pages, with breadcrumbs
export const PageIntro: React.FC<{ crumb: string; eyebrow: string; title: React.ReactNode; lede?: React.ReactNode }> = ({ crumb, eyebrow, title, lede }) => (
  <Section className="pb-10 pt-10 md:pb-14 md:pt-16">
    <nav aria-label="Breadcrumb" className="mb-8 text-[0.85rem] text-[color:var(--muted)]">
      <ol className="flex items-center gap-2">
        <li><a href="/" className="no-underline hover:text-[color:var(--ink)]">Home</a></li>
        <li aria-hidden>/</li>
        <li aria-current="page" className="text-[color:var(--ink)]">{crumb}</li>
      </ol>
    </nav>
    <Eyebrow>{eyebrow}</Eyebrow>
    <h1 className="vs-display mt-4 max-w-[16ch] text-[clamp(2.6rem,7vw,5.2rem)]">{title}</h1>
    {lede && <p className="vs-lede mt-6 max-w-[60ch]">{lede}</p>}
  </Section>
);
