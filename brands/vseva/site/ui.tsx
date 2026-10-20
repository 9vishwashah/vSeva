import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Download, Instagram, Menu, Phone, X, Youtube } from 'lucide-react';
import WhatsAppIcon from '../../../components/WhatsAppIcon';
import { InstallPWA } from '../../../components/InstallPWA';
import { CONTACT, COMMUNITY_LINKS, NAV, type Screen } from './content';
import './site.css';

export type SitePage = 'home' | 'docs' | 'contact' | 'support';

// Same behaviour as the original landing page's Install button: press the install banner's own button
// (Android prompt, iPhone guide, or the desktop/Android tip); without the banner, scroll to the bottom.
export const installApp = () => {
  const banner = document.getElementById('pwa-install-btn');
  if (banner) banner.click();
  else window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
};

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
      {mounted && <InstallPWA onDismiss={() => setBannerOpen(false)} />}
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
    Login
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
          <img src="/vseva-site/logo-96.webp" srcSet="/vseva-site/logo-96.webp 1x, /vseva-site/logo-192.webp 2x" alt="" width={36} height={36} className="h-9 w-9 scale-[1.45] object-contain" />
          <span className="vs-display text-[1.45rem] tracking-[-0.03em] text-[color:var(--ink)]">vSeva</span>
        </a>

        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {NAV.map(item => (
            <a key={item.href} href={item.href} className="vs-navlink" aria-current={isCurrent(item.href, page) ? 'page' : undefined}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            <button type="button" onClick={installApp} className="vs-btn vs-btn-ghost vs-btn-sm">
              <Download size={16} aria-hidden /> Install App
            </button>
          </span>
          <LoginLink onLogin={onLogin} className="vs-btn vs-btn-primary vs-btn-sm" />
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line-strong)] lg:hidden"
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
        className="border-b border-[color:var(--line)] bg-[color:var(--paper)] lg:hidden"
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
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setOpen(false); installApp(); }} className="vs-btn vs-btn-ghost">
              <Download size={16} aria-hidden /> Install App
            </button>
            <LoginLink onLogin={onLogin} className="vs-btn vs-btn-primary" />
          </div>
        </nav>
      </div>
    </header>
  );
};

/* ───────────── Footer ───────────── */

export const SiteFooter: React.FC = () => {
  const year = new Date().getFullYear();
  const col = 'flex flex-col gap-2.5';
  const link = 'text-[0.95rem] text-[#d8cabd] no-underline transition-colors hover:text-white';
  return (
    <footer className="bg-[color:var(--night)] pb-40 text-[#f3e9de] md:pb-28">
      {/* VJAS business call to action */}
      <div className="mx-auto max-w-[1240px] px-4 pt-16 sm:px-6 md:pt-20">
        <div className="grid gap-8 border-b border-white/10 pb-14 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <p className="vs-eyebrow !text-[#f0a37c]">VJAS · Digital services</p>
            <h2 className="vs-h2 mt-3 text-white">Looking for digital solutions for your business?</h2>
            <p className="mt-4 max-w-[58ch] text-[#cdbfb2]">
              From websites and web applications to custom digital solutions, VJAS helps businesses build useful digital experiences.
            </p>
          </div>
          <div className="md:col-span-4 md:text-right">
            <a href={CONTACT.vjasPhoneUrl} className="vs-btn vs-btn-light">
              <Phone size={16} aria-hidden /> Contact VJAS: {CONTACT.vjasPhoneDisplay}
            </a>
          </div>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <a href="/" className="flex items-center gap-2.5 no-underline" aria-label="vSeva home">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                <img src="/vseva-site/logo-96.webp" srcSet="/vseva-site/logo-96.webp 1x, /vseva-site/logo-192.webp 2x" alt="" width={36} height={36} className="h-9 w-9 scale-[1.45] object-contain" loading="lazy" />
              </span>
              <span className="vs-display text-[1.6rem] text-white">vSeva</span>
            </a>
            <p className="mt-4 max-w-[34ch] text-[0.95rem] text-[#cdbfb2]">
              Every Step Counts. A digital platform for recording, managing and understanding the Vihar Seva journey.
            </p>
            <a
              href={CONTACT.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/15 px-4 py-3 text-white no-underline transition-colors hover:border-white/40"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF0000]"><Youtube size={18} aria-hidden /></span>
              <span className="leading-tight">
                <span className="block text-[0.95rem] font-semibold">Watch the complete guide and setup</span>
                <span className="block text-[0.8rem] text-[#cdbfb2]">YouTube · @VJASTECH</span>
              </span>
            </a>
          </div>

          <nav aria-label="Footer: vSeva" className={`${col} lg:col-span-2`}>
            <p className="vs-eyebrow !text-[#9c8b7d]">vSeva</p>
            <a className={link} href="/#features">Features</a>
            <a className={link} href="/#how-it-works">How it works</a>
            <a className={link} href="/#get-started">Get started</a>
            <a className={link} href="/#story">Our story</a>
            <a className={link} href="/login">Login</a>
          </nav>
          <nav aria-label="Footer: help" className={`${col} lg:col-span-2`}>
            <p className="vs-eyebrow !text-[#9c8b7d]">Help</p>
            <a className={link} href="/documentation">Documentation</a>
            <a className={link} href="/documentation#faq">FAQ</a>
            <a className={link} href="/contact">Contact</a>
            <a className={link} href="/support-us">Support us</a>
            <a className={link} href="/privacy">Privacy Policy</a>
          </nav>
          <nav aria-label="Footer: community" className={`${col} lg:col-span-2`}>
            <p className="vs-eyebrow !text-[#9c8b7d]">Community</p>
            {COMMUNITY_LINKS.map(l => <a key={l.href} className={link} href={l.href}>{l.title}</a>)}
            <a className={link} href={CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram {CONTACT.instagramHandle}</a>
            <a className={link} href={CONTACT.youtubeUrl} target="_blank" rel="noopener noreferrer">YouTube</a>
          </nav>
          <div className={`${col} lg:col-span-2`}>
            <p className="vs-eyebrow !text-[#9c8b7d]">Reach us</p>
            <a className={link} href={CONTACT.supportWhatsAppUrl} target="_blank" rel="noopener noreferrer">WhatsApp {CONTACT.supportWhatsAppDisplay}</a>
            <a className={link} href={CONTACT.vjasPhoneUrl}>VJAS {CONTACT.vjasPhoneDisplay}</a>
            <a className={link} href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 pt-6 text-[0.85rem] text-[#9c8b7d] sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} VJAS. All rights reserved.</p>
          <p>Designed and Developed by <span className="font-semibold text-[#f3e9de]">VJAS</span></p>
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
    <a href={CONTACT.vjasPhoneUrl} className="vs-fab bg-[color:var(--ink)]" aria-label={`Call VJAS, ${CONTACT.vjasPhoneDisplay}`}>
      <Phone size={19} aria-hidden />
    </a>
  </div>
);

/* ───────────── Building blocks ───────────── */

const src = (s: Screen, w: 400 | 760) => `/vseva-site/screens/${s.name}-${w}.webp`;

// A real app screenshot in a slim phone frame
export const PhoneShot: React.FC<{ screen: Screen; className?: string; priority?: boolean; sizes?: string }> = ({ screen, className = '', priority, sizes = '(max-width: 640px) 60vw, 300px' }) => (
  <div className={`vs-phone ${className}`}>
    <div className="vs-phone-screen">
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
