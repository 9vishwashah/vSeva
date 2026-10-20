import React from 'react';
import { QrCode } from 'lucide-react';
import { SUPPORT } from './content';
import { Section, SiteShell } from './ui';
import { PAGE_META } from './seo';

// Support Us. The QR stays a labelled placeholder until SUPPORT.upiQrImage (content.ts) points at the real image.

const SupportPage: React.FC = () => {
  const meta = PAGE_META['/support-us'];
  return (
    <SiteShell page="support" title={meta.title} description={meta.description}>
      <Section className="py-12 md:py-20">
        <nav aria-label="Breadcrumb" className="mb-10 text-[0.85rem] text-[color:var(--muted)]">
          <ol className="flex items-center gap-2">
            <li><a href="/" className="no-underline hover:text-[color:var(--ink)]">Home</a></li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-[color:var(--ink)]">Support us</li>
          </ol>
        </nav>

        <div className="grid items-center gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="vs-eyebrow">Support us</p>
            <h1 className="vs-display mt-4 max-w-[13ch] text-[clamp(2.8rem,7.5vw,5.6rem)]">
              Support the journey of Seva<span className="vs-accent">.</span>
            </h1>
            <div className="mt-8 max-w-[54ch] space-y-4 text-[1.08rem] leading-relaxed text-[color:var(--ink-2)]">
              <p>
                vSeva is built to help Vihar Seva groups organize their records, coordinate their efforts and preserve the journey
                of Seva in a more structured way.
              </p>
              <p>
                If you find vSeva useful, your voluntary support can help us continue improving the platform, maintaining its
                services and building tools that better serve the community.
              </p>
              <p className="font-semibold text-[color:var(--ink)]">Every contribution is appreciated. Thank you for being part of the journey.</p>
            </div>
            <p className="mt-8 max-w-[54ch] border-l-2 border-[color:var(--saffron)] pl-4 text-[0.92rem] text-[color:var(--muted)]">
              Support is entirely voluntary.
            </p>
          </div>

          <div className="lg:col-span-5">
            <figure className="mx-auto max-w-[360px] rounded-[28px] border border-[color:var(--line-strong)] bg-white p-6 text-center sm:p-8" data-reveal>
              <div className="flex items-center justify-center gap-2">
                <img src="/vseva-site/logo-96.webp" srcSet="/vseva-site/logo-96.webp 1x, /vseva-site/logo-192.webp 2x" alt="" width={28} height={28} className="h-7 w-7 scale-[1.45] object-contain" />
                <span className="vs-display text-[1.3rem]">vSeva</span>
              </div>
              <div className="mx-auto mt-6 aspect-square w-full max-w-[260px]">
                {SUPPORT.upiQrImage ? (
                  <img src={SUPPORT.upiQrImage} alt={SUPPORT.upiQrAlt} width={520} height={520} className="h-full w-full rounded-xl object-contain" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[color:var(--line-strong)] bg-[color:var(--paper)] p-6">
                    <QrCode size={40} className="text-[color:var(--muted)]" aria-hidden />
                    <p className="vs-mono text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--muted)]">UPI QR code placeholder</p>
                  </div>
                )}
              </div>
              <figcaption className="mt-6">
                <p className="font-[family-name:var(--display)] text-[1.15rem] font-bold">Scan to support vSeva.</p>
                <p className="mt-1 text-[0.88rem] text-[color:var(--muted)]">
                  {SUPPORT.upiQrImage ? 'Use any UPI app.' : 'The UPI code will appear here soon.'}
                </p>
              </figcaption>
            </figure>
          </div>
        </div>
      </Section>

      <Section className="border-t border-[color:var(--line)] py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { t: 'Other ways to help', b: 'Tell another Vihar Seva group about vSeva, or share your Seva card on WhatsApp and Instagram.' },
            { t: 'Ideas and feedback', b: 'Found something that could work better? Tell us on WhatsApp.', href: '/contact', l: 'Contact us' },
            { t: 'Learn the app', b: 'The documentation covers every screen, from onboarding to reports.', href: '/documentation', l: 'Read the documentation' },
          ].map((c, i) => (
            <div key={c.t} data-reveal style={{ ['--d' as string]: i }}>
              <p className="vs-h3">{c.t}</p>
              <p className="mt-2 text-[color:var(--ink-2)]">{c.b}</p>
              {c.href && <a href={c.href} className="vs-link mt-3 inline-block text-[0.95rem]">{c.l}</a>}
            </div>
          ))}
        </div>
      </Section>
    </SiteShell>
  );
};

export default SupportPage;
