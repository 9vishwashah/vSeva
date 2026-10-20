import React, { useState } from 'react';
import { ArrowUpRight, BookOpen, Instagram, Mail, Phone, Youtube } from 'lucide-react';
import WhatsAppIcon from '../../../components/WhatsAppIcon';
import { CONTACT, ONBOARDING_MESSAGE, whatsappWithText } from './content';
import { PageIntro, Section, SiteShell } from './ui';
import { PAGE_META } from './seo';

// There is no server inbox for website messages, so the "write to us" form does not pretend to send anything:
// it opens WhatsApp with the message typed in, and the person sends it from WhatsApp themselves.

const REASONS = ['Group onboarding', 'Sevak onboarding', 'Technical assistance', 'Feature inquiry', 'Other'] as const;

const ContactPage: React.FC = () => {
  const meta = PAGE_META['/contact'];
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const compose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      setError(!name.trim() ? 'Please enter your name.' : 'Please write your message.');
      return;
    }
    setError(null);
    const text = [
      'Jai Jinendra, vSeva team.',
      '',
      `Name: ${name.trim()}`,
      group.trim() ? `Group: ${group.trim()}` : null,
      `Reason: ${reason}`,
      '',
      message.trim(),
    ].filter(l => l !== null).join('\n');
    window.open(whatsappWithText(text), '_blank', 'noopener,noreferrer');
  };

  const label = 'mb-2 block text-[0.9rem] font-semibold text-[color:var(--ink)]';
  const field = 'w-full rounded-xl border border-[color:var(--line-strong)] bg-white px-4 py-3 text-[1rem] text-[color:var(--ink)] outline-none transition-colors placeholder:text-[#a8988b] focus:border-[color:var(--saffron)]';

  return (
    <SiteShell page="contact" title={meta.title} description={meta.description}>
      <PageIntro
        crumb="Contact"
        eyebrow="Contact us"
        title={<>Let’s make your Seva journey easier<span className="vs-accent">.</span></>}
        lede="Have a question about vSeva, need help getting your Vihar Seva group onboarded, or need assistance using the platform? Reach out to our team."
      />

      <Section className="pb-20">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* WhatsApp: vSeva support */}
          <div className="rounded-[24px] bg-[color:var(--night)] p-7 text-[#f3e9de] md:p-9 lg:col-span-7" data-reveal>
            <p className="vs-eyebrow !text-[#f0a37c]">vSeva support · WhatsApp</p>
            <p className="vs-display mt-4 text-[clamp(2rem,4.5vw,3.2rem)] text-white">{CONTACT.supportWhatsAppDisplay}</p>
            <p className="mt-3 max-w-[46ch] text-[#cdbfb2]">For group onboarding, Sevak setup, sign-in trouble and questions about any feature.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={CONTACT.supportWhatsAppUrl} target="_blank" rel="noopener noreferrer" className="vs-btn bg-[#13843f] text-white hover:bg-[#0f6f34]">
                <WhatsAppIcon size={18} /> Chat on WhatsApp
              </a>
              <a href="tel:+919594503214" className="vs-btn border border-white/25 text-white hover:border-white/60">
                <Phone size={16} aria-hidden /> Call
              </a>
            </div>
          </div>

          {/* VJAS: business and digital services */}
          <div className="rounded-[24px] border border-[color:var(--line-strong)] bg-white p-7 md:p-9 lg:col-span-5" data-reveal style={{ ['--d' as string]: 1 }}>
            <p className="vs-eyebrow">VJAS · Business and digital services</p>
            <p className="vs-display mt-4 text-[clamp(2rem,4.5vw,3.2rem)]">{CONTACT.vjasPhoneDisplay}</p>
            <p className="mt-3 text-[color:var(--ink-2)]">Websites, web applications and custom digital solutions for your business.</p>
            <a href={CONTACT.vjasPhoneUrl} className="vs-btn vs-btn-primary mt-7">
              <Phone size={16} aria-hidden /> Call VJAS
            </a>
          </div>
        </div>

        <ul className="mt-6 grid gap-px overflow-hidden rounded-[24px] border border-[color:var(--line)] bg-[color:var(--line)] sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: `mailto:${CONTACT.email}`, icon: <Mail size={18} aria-hidden />, title: 'Email', body: CONTACT.email, ext: false },
            { href: CONTACT.instagramUrl, icon: <Instagram size={18} aria-hidden />, title: 'Instagram', body: CONTACT.instagramHandle, ext: true },
            { href: CONTACT.youtubeUrl, icon: <Youtube size={18} aria-hidden />, title: 'YouTube guides', body: 'Complete guide and setup videos', ext: true },
            { href: '/documentation', icon: <BookOpen size={18} aria-hidden />, title: 'Documentation', body: 'Step-by-step help for every screen', ext: false },
          ].map(c => (
            <li key={c.title} className="bg-[color:var(--paper)]">
              <a
                href={c.href}
                {...(c.ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="group flex h-full items-start justify-between gap-4 p-6 no-underline transition-colors hover:bg-white"
              >
                <span>
                  <span className="flex items-center gap-2 font-semibold text-[color:var(--ink)]"><span className="text-[color:var(--saffron)]">{c.icon}</span>{c.title}</span>
                  <span className="mt-1 block text-[0.9rem] [overflow-wrap:anywhere] text-[color:var(--muted)]">{c.body}</span>
                </span>
                <ArrowUpRight size={18} className="shrink-0 text-[color:var(--muted)] group-hover:text-[color:var(--ink)]" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="onboarding" className="border-t border-[color:var(--line)] py-20" labelledBy="onboarding-title">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5" data-reveal>
            <p className="vs-eyebrow">Group onboarding</p>
            <h2 id="onboarding-title" className="vs-h2 mt-4">Bringing your group to vSeva?</h2>
            <p className="mt-5 max-w-[46ch] text-[color:var(--ink-2)]">
              The Captain applies with <strong>Create Captain Account</strong> on the sign-in screen; our team verifies every group,
              usually within 24 to 48 hours. If you would like help first, send us your group’s details and we’ll guide you.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={whatsappWithText(ONBOARDING_MESSAGE)} target="_blank" rel="noopener noreferrer" className="vs-btn vs-btn-saffron">
                <WhatsAppIcon size={18} /> Ask for onboarding help
              </a>
              <a href="/login" className="vs-btn vs-btn-ghost">Create Captain Account</a>
            </div>
            <a href="/documentation#group-onboarding" className="vs-link mt-6 inline-flex items-center gap-1.5 text-[0.95rem]">
              Read the onboarding guide <ArrowUpRight size={15} aria-hidden />
            </a>
          </div>

          <form onSubmit={compose} noValidate className="rounded-[24px] border border-[color:var(--line-strong)] bg-white p-6 md:p-9 lg:col-span-7" aria-labelledby="compose-title" data-reveal style={{ ['--d' as string]: 1 }}>
            <h3 id="compose-title" className="vs-h3">Write to us on WhatsApp</h3>
            <p className="mt-2 text-[0.92rem] text-[color:var(--muted)]">
              This opens WhatsApp with your message ready. Nothing is sent until you press send in WhatsApp.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="c-name" className={label}>Your name</label>
                <input id="c-name" className={field} value={name} onChange={e => setName(e.target.value)} autoComplete="name" aria-invalid={error === 'Please enter your name.' || undefined} aria-describedby={error ? 'c-error' : undefined} />
              </div>
              <div>
                <label htmlFor="c-group" className={label}>Organization <span className="font-normal text-[color:var(--muted)]">(optional)</span></label>
                <input id="c-group" className={field} value={group} onChange={e => setGroup(e.target.value)} placeholder="Your Vihar Seva group" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="c-reason" className={label}>Reason for contacting</label>
                <select id="c-reason" className={field} value={reason} onChange={e => setReason(e.target.value)}>
                  {REASONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="c-message" className={label}>Message</label>
                <textarea id="c-message" rows={5} className={field} value={message} onChange={e => setMessage(e.target.value)} aria-invalid={error === 'Please write your message.' || undefined} aria-describedby={error ? 'c-error' : undefined} />
              </div>
            </div>
            {error && <p id="c-error" role="alert" className="mt-4 text-[0.92rem] font-medium text-[#b42318]">{error}</p>}
            <button type="submit" className="vs-btn mt-6 w-full bg-[#13843f] text-white hover:bg-[#0f6f34] sm:w-auto">
              <WhatsAppIcon size={18} /> Open in WhatsApp
            </button>
          </form>
        </div>
      </Section>
    </SiteShell>
  );
};

export default ContactPage;
