import React from 'react';
import { Section, SiteShell } from './ui';
import { PAGE_META } from './seo';

// Support Us: why support matters and the other ways to help (no payment details on the site).

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

        <div className="max-w-[860px]">
          <p className="vs-eyebrow">Support us</p>
          <h1 className="vs-display mt-4 max-w-[13ch] text-[clamp(2.8rem,7.5vw,5.6rem)]">
            Support the journey of Seva<span className="vs-accent">.</span>
          </h1>
          <div className="mt-8 max-w-[58ch] space-y-4 text-[1.08rem] leading-relaxed text-[color:var(--ink-2)]">
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
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href="/contact" className="vs-btn vs-btn-saffron">Contact us to support</a>
            <span className="text-[0.92rem] text-[color:var(--muted)]">Support is entirely voluntary.</span>
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
