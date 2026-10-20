import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowUpRight, MapPin, BookOpen } from 'lucide-react';
import { COMMUNITY_LINKS, FOUNDERS, SCREENS, STATS, TEAM, TICKER, type Screen } from './content';
import { Eyebrow, PhoneShot, Section, Shot, SiteShell } from './ui';
import { PAGE_META } from './seo';

/* ───────────── Hero ───────────── */

const Hero: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  // A small depth shift between the two phones while scrolling past the hero (off for reduced motion)
  const front = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);
  const back = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 40]);

  return (
    <div ref={ref} className="relative overflow-hidden">
      <Section className="pb-16 pt-10 md:pb-24 md:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <p className="vs-eyebrow vs-rise" style={{ ['--d' as string]: 0 }}>A digital platform for Vihar Seva</p>
            <h1 className="vs-display vs-rise mt-5 text-[clamp(3.4rem,10.5vw,8.4rem)]" style={{ ['--d' as string]: 1 }}>
              Every Step<br />Counts<span className="vs-accent">.</span>
            </h1>
            <p className="vs-rise mt-7 max-w-[30ch] font-[family-name:var(--display)] text-[clamp(1.35rem,2.4vw,1.75rem)] font-bold leading-[1.2] tracking-[-0.015em] text-[color:var(--ink)]" style={{ ['--d' as string]: 2 }}>
              A more organized way to record, manage and understand your Vihar Seva journey.
            </p>
            <p className="vs-lede vs-rise mt-5 max-w-[52ch]" style={{ ['--d' as string]: 3 }}>
              vSeva brings Vihar records, Sevak management, Sankalp progress and group coordination into one app for
              Captains and Sevaks, on your phone or in any browser.
            </p>
            <div className="vs-rise mt-9 flex flex-wrap items-center gap-3" style={{ ['--d' as string]: 4 }}>
              <a href="#get-started" className="vs-btn vs-btn-saffron">Get Started <ArrowRight size={17} aria-hidden /></a>
              <a href="#features" className="vs-btn vs-btn-ghost">Explore the Platform</a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[460px] lg:col-span-5 lg:max-w-none">
            <div className="relative h-[520px] sm:h-[600px]">
              <motion.div style={{ y: back }} className="absolute left-0 top-[88px] w-[54%] max-w-[230px]">
                <PhoneShot screen={SCREENS.groupAnalytics} sizes="(max-width: 640px) 50vw, 230px" />
              </motion.div>
              <motion.div style={{ y: front }} className="absolute right-0 top-0 w-[64%] max-w-[300px]">
                <PhoneShot screen={SCREENS.sevakHome} priority sizes="(max-width: 640px) 62vw, 300px" />
              </motion.div>
              {/* Two quiet labels naming real features on the screens */}
              <span className="vs-rise absolute right-[56%] top-[22px] hidden rounded-full border border-[color:var(--line-strong)] bg-white px-3 py-1.5 text-[0.78rem] font-medium shadow-sm sm:inline-block" style={{ ['--d' as string]: 5 }}>
                Group Analytics
              </span>
              <span className="vs-rise absolute -right-2 top-[46%] rounded-full bg-[color:var(--ink)] px-3 py-1.5 text-[0.78rem] font-medium text-white shadow-sm sm:-right-6" style={{ ['--d' as string]: 6 }}>
                My Sankalp &amp; Your Stats
              </span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
};

/* ───────────── Ticker ───────────── */

const Ticker: React.FC = () => {
  const items = (dup: boolean) => (
    <ul className={`flex ${dup ? 'vs-ticker-dup' : ''}`} aria-hidden={dup || undefined}>
      {TICKER.map(t => <li key={t} className="vs-ticker-item">{t}</li>)}
    </ul>
  );
  return (
    <div className="vs-ticker py-4" aria-label="What vSeva covers">
      <div className="vs-ticker-track">
        {items(false)}
        {items(true)}
      </div>
    </div>
  );
};

/* ───────────── Stats: three milestones on a road ───────────── */

const Stats: React.FC = () => (
  <Section className="py-20 md:py-24" labelledBy="stats-title">
    <div className="grid gap-12 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-4" data-reveal>
        <Eyebrow>So far</Eyebrow>
        <h2 id="stats-title" className="vs-h2 mt-4">Counted the way a road counts.</h2>
        <p className="vs-lede mt-5 max-w-[38ch]">Groups, Sevaks and Vihars already on vSeva, one milestone at a time.</p>
      </div>
      <div className="lg:col-span-8">
        <ul className="grid grid-cols-3 gap-3 sm:gap-6">
          {STATS.map((s, i) => (
            <li key={s.label} data-reveal style={{ ['--d' as string]: i }}>
              <div className="vs-milestone">
                <span className="vs-milestone-cap">{s.label}</span>
                <span className="vs-milestone-value">{s.value}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="vs-road mt-[-1px]" aria-hidden />
      </div>
    </div>
  </Section>
);

/* ───────────── Story ───────────── */

const STAGES = [
  { name: 'Collect', body: 'Every Vihar recorded in one place.' },
  { name: 'Organize', body: 'Sevaks, routes and contacts, kept by the Captain.' },
  { name: 'Track', body: 'Kilometres, Sankalp and the Vihar Year at a glance.' },
  { name: 'Connect', body: 'Alerts, VChat, contacts and Seva cards to share.' },
];

const Story: React.FC = () => (
  <Section id="story" className="border-t border-[color:var(--line)] py-20 md:py-24" labelledBy="story-title">
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-6" data-reveal>
        <Eyebrow>Our story</Eyebrow>
        <h2 id="story-title" className="vs-h2 mt-4 max-w-[17ch]">From a Google Form to a platform built around the Seva journey.</h2>
        <div className="mt-8 max-w-[56ch] space-y-4 text-[color:var(--ink-2)]">
          <p>
            Vihar Seva means walking with Sadhu and Sadhvi Bhagwant from one place to the next. It takes coordination:
            who is walking, which route, and an accurate record of every journey.
          </p>
          <p>
            vSeva started as a Google Form, a simple way to collect each Vihar. As the entries grew, so did the need: groups
            wanted to see their Sevaks, their routes, their kilometres and how the year was going, not just a list of rows.
          </p>
          <p>
            So the form became a platform, with Vihar records, Sevak management, dashboards, statistics and the everyday
            workflows a Vihar Seva group runs on.
          </p>
        </div>
      </div>

      <div className="lg:col-span-6" data-reveal style={{ ['--d' as string]: 1 }}>
        {/* Form → app: a simple sketch of a form next to the real Vihar entry screen */}
        <figure className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
          <div className="rounded-2xl border border-[color:var(--line-strong)] bg-white p-4 sm:p-5" aria-hidden>
            <p className="vs-eyebrow !text-[color:var(--muted)]">The form</p>
            {['Date', 'From', 'To', 'Sevaks'].map(f => (
              <div key={f} className="mt-4">
                <p className="text-[0.75rem] text-[color:var(--muted)]">{f}</p>
                <div className="mt-1.5 h-7 rounded-md border border-[color:var(--line)] bg-[color:var(--paper)]" />
              </div>
            ))}
            <div className="mt-5 h-8 w-20 rounded-md bg-[color:var(--line)]" />
          </div>
          <ArrowRight className="text-[color:var(--saffron)]" size={22} aria-hidden />
          <PhoneShot screen={SCREENS.entryStep2} sizes="(max-width: 640px) 42vw, 230px" />
          <figcaption className="col-span-3 mt-2 text-[0.85rem] text-[color:var(--muted)]">
            Left: what a form collects. Right: the same Vihar in vSeva, where the route sets the distance.
          </figcaption>
        </figure>
      </div>
    </div>

    <ol className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--line)] sm:grid-cols-2 lg:grid-cols-4">
      {STAGES.map((st, i) => (
        <li key={st.name} className="bg-[color:var(--paper)] p-6" data-reveal style={{ ['--d' as string]: i }}>
          <p className="flex items-center gap-2 font-[family-name:var(--display)] text-[1.5rem] font-extrabold tracking-[-0.02em]">
            {st.name}
            {i < STAGES.length - 1 && <ArrowRight size={18} className="text-[color:var(--saffron)]" aria-hidden />}
          </p>
          <p className="mt-2 text-[0.95rem] text-[color:var(--ink-2)]">{st.body}</p>
        </li>
      ))}
    </ol>
  </Section>
);

/* ───────────── Features ───────────── */

const DocLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a href={href} className="vs-link mt-6 inline-flex items-center gap-1.5 text-[0.95rem]">
    {children} <ArrowUpRight size={15} aria-hidden />
  </a>
);

const FeatureSplit: React.FC<{
  eyebrow: string; title: string; body: React.ReactNode; doc: { href: string; label: string };
  visual: React.ReactNode; flip?: boolean; id?: string;
}> = ({ eyebrow, title, body, doc, visual, flip, id }) => (
  <div id={id} className="grid items-center gap-10 border-t border-[color:var(--line)] py-16 md:py-20 lg:grid-cols-12">
    <div className={`lg:col-span-5 ${flip ? 'lg:order-2 lg:col-start-8' : ''}`} data-reveal>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h3 className="vs-h2 mt-4 !text-[clamp(1.9rem,3.6vw,2.9rem)]">{title}</h3>
      <div className="mt-5 max-w-[48ch] space-y-3 text-[color:var(--ink-2)]">{body}</div>
      <DocLink href={doc.href}>{doc.label}</DocLink>
    </div>
    <div className={`lg:col-span-6 ${flip ? 'lg:order-1 lg:col-start-1' : 'lg:col-start-7'}`} data-reveal style={{ ['--d' as string]: 1 }}>
      {visual}
    </div>
  </div>
);

const ENTRY_STEPS: { screen: Screen; label: string; body: string }[] = [
  { screen: SCREENS.entryStep1, label: 'Date & session', body: 'Today by default; Morning or Evening.' },
  { screen: SCREENS.entryStep2, label: 'Who and which route', body: 'Sadhubhagwan or Sadhvijibhagwan, From and To. The distance appears.' },
  { screen: SCREENS.entryStep3, label: 'Seva requirements', body: 'Every Sevak who walked, plus wheelchair and car Seva.' },
  { screen: SCREENS.entryStep4, label: 'Review & submit', body: 'Optional Samuday and notes, then Submit Entry.' },
];

const MORE_FEATURES = [
  { title: 'Routes and distance', body: 'The Captain keeps a list of From and To routes with kilometres, so distance fills itself in.', href: '/documentation#captain-workflows' },
  { title: 'Upcoming Vihar alerts', body: 'Announce the date, time, route and what is needed. Everyone is notified and Sevaks tap I’m Interested.', href: '/documentation#captain-workflows' },
  { title: 'PDF and Excel reports', body: 'Pick a date range, report type and columns, then download.', href: '/documentation#captain-workflows' },
  { title: 'Sevak management', body: 'Add Sevaks, share their login on WhatsApp in one tap, and see whose profile is still incomplete.', href: '/documentation#captain-workflows' },
  { title: 'VChat', body: 'Your group’s own chat. Captains can follow other groups; messages stay for 30 days.', href: '/documentation#other-features' },
  { title: 'Incidents', body: 'Sevaks report what happened with a photo or video, and the Captain follows it up.', href: '/documentation#other-features' },
  { title: 'Notifications', body: 'Alerts for upcoming Vihars, approvals and messages. Tapping one opens the right screen.', href: '/documentation#contacts-and-notifications' },
  { title: 'Three languages', body: 'English, ગુજરાતી and हिंदी. Switch any time from the top of the screen.', href: '/documentation#introduction' },
];

const Features: React.FC = () => (
  <Section id="features" className="border-t border-[color:var(--line)] pt-20 md:pt-24" labelledBy="features-title">
    <div className="max-w-[760px]" data-reveal>
      <Eyebrow>Features</Eyebrow>
      <h2 id="features-title" className="vs-h2 mt-4">Built for the way a Vihar Seva group actually works.</h2>
      <p className="vs-lede mt-5 max-w-[58ch]">
        Two roles, one record. The Captain looks after the group; Sevaks record their Vihars and follow their own progress.
      </p>
    </div>

    {/* 1 · Recording */}
    <div className="mt-14 border-t border-[color:var(--line)] py-16 md:py-20">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4" data-reveal>
          <Eyebrow>Vihar recording</Eyebrow>
          <h3 className="vs-h2 mt-4 !text-[clamp(1.9rem,3.6vw,2.9rem)]">Record a Vihar in four short steps.</h3>
          <p className="mt-5 max-w-[42ch] text-[color:var(--ink-2)]">
            Sevaks tap Add Vihar on Home; the Captain uses New Entry. One person submits each Vihar for everyone who walked.
          </p>
          <DocLink href="/documentation#recording-a-vihar">How recording works</DocLink>
        </div>
        <ol className="vs-strip -mx-4 px-4 sm:mx-0 sm:px-0 lg:col-span-8 lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible" aria-label="The four steps of a Vihar entry">
          {ENTRY_STEPS.map((st, i) => (
            <li key={st.label} className="w-[62vw] max-w-[230px] sm:w-[220px] lg:w-auto" data-reveal style={{ ['--d' as string]: i }}>
              <PhoneShot screen={st.screen} sizes="(max-width: 640px) 62vw, 200px" />
              <p className="mt-4 flex items-baseline gap-2 font-[family-name:var(--display)] text-[1.05rem] font-bold">
                <span className="vs-mono text-[0.8rem] font-medium text-[color:var(--saffron-deep)]">{i + 1}</span>{st.label}
              </p>
              <p className="mt-1 text-[0.9rem] text-[color:var(--muted)]">{st.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>

    {/* 2 · Statistics */}
    <FeatureSplit
      eyebrow="Statistics and Sankalp"
      title="See the whole year at a glance."
      body={<>
        <p>Kilometres, Vihars, Sadhu and Sadhvi Bhagwant served, your rank, your streak and the week’s consistency. Group Analytics adds the longest Vihar, the top Sevaks and a monthly calendar.</p>
        <p>Everything follows the Vihar Year, 14 October to 13 July, and a yearly Sankalp ring shows how close you are to your target.</p>
      </>}
      doc={{ href: '/documentation#dashboard-and-statistics', label: 'Read about statistics' }}
      visual={
        <div className="flex items-end justify-center gap-4 sm:gap-6">
          <PhoneShot screen={SCREENS.groupAnalytics} className="w-[48%] max-w-[260px]" sizes="(max-width: 640px) 46vw, 260px" />
          <PhoneShot screen={SCREENS.dashboard} className="w-[42%] max-w-[230px] -translate-y-10" sizes="(max-width: 640px) 40vw, 230px" />
        </div>
      }
    />

    {/* 3 · Approvals */}
    <FeatureSplit
      flip
      eyebrow="Approval workflow"
      title="The Captain approves, then it counts."
      body={<>
        <p>A Sevak’s Vihar shows as pending until the Captain approves, edits or rejects it, so every number on the dashboard has been checked.</p>
        <p>Vihars the Captain records count straight away. A rejection lets the Sevak who sent it know.</p>
      </>}
      doc={{ href: '/documentation#approvals', label: 'How approvals work' }}
      visual={<div className="flex justify-center"><PhoneShot screen={SCREENS.myVihars} className="w-[62%] max-w-[290px]" /></div>}
    />

    {/* 4 · Contacts */}
    <FeatureSplit
      eyebrow="Important contacts"
      title="Help is one tap away."
      body={<p>The Captain keeps an emergency contact list that every Sevak can see. The Sevak directory puts Call and WhatsApp next to every name, so nobody is searching for a number on the road.</p>}
      doc={{ href: '/documentation#contacts-and-notifications', label: 'Contacts and notifications' }}
      visual={<div className="flex justify-center"><PhoneShot screen={SCREENS.contacts} className="w-[62%] max-w-[290px]" /></div>}
    />

    {/* 5 · Sharing */}
    <FeatureSplit
      flip
      eyebrow="Achievement sharing"
      title="Seva worth sharing."
      body={<p>Turn your year into a Story or Square card for WhatsApp and Instagram. Every Sevak also has a Vihar Seva ID card whose QR code opens their verification page.</p>}
      doc={{ href: '/documentation#other-features', label: 'Cards and the ID card' }}
      visual={
        <div className="flex items-start justify-center gap-4 sm:gap-6">
          <PhoneShot screen={SCREENS.share} className="w-[50%] max-w-[260px]" sizes="(max-width: 640px) 48vw, 260px" />
          <div className="mt-12 w-[40%] max-w-[210px] overflow-hidden rounded-2xl border border-[color:var(--line-strong)] bg-white">
            <Shot screen={SCREENS.idCard} className="block h-auto w-full" sizes="(max-width: 640px) 40vw, 210px" />
          </div>
        </div>
      }
    />

    {/* 6 · The rest */}
    <div className="border-t border-[color:var(--line)] py-16 md:py-20">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4" data-reveal>
          <Eyebrow>And around it</Eyebrow>
          <h3 className="vs-h2 mt-4 !text-[clamp(1.9rem,3.6vw,2.9rem)]">Everything else a group needs.</h3>
        </div>
        <dl className="grid gap-x-10 sm:grid-cols-2 lg:col-span-8">
          {MORE_FEATURES.map((f, i) => (
            <div key={f.title} className="border-t border-[color:var(--line)] py-5" data-reveal style={{ ['--d' as string]: i % 2 }}>
              <dt className="font-[family-name:var(--display)] text-[1.15rem] font-bold tracking-[-0.01em]">
                <a href={f.href} className="no-underline hover:text-[color:var(--saffron-deep)]">{f.title}</a>
              </dt>
              <dd className="mt-1.5 text-[0.95rem] text-[color:var(--ink-2)]">{f.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  </Section>
);

/* ───────────── Screens gallery ───────────── */

const GALLERY: { screen: Screen; title: string }[] = [
  { screen: SCREENS.dashboard, title: 'Captain dashboard' },
  { screen: SCREENS.sevakMore, title: 'Everything in More' },
  { screen: SCREENS.alert, title: 'Announce an upcoming Vihar' },
  { screen: SCREENS.export, title: 'Reports in PDF or Excel' },
  { screen: SCREENS.vchat, title: 'VChat' },
  { screen: SCREENS.directory, title: 'Community directory' },
  { screen: SCREENS.profileRing, title: 'Profile completion' },
  { screen: SCREENS.addSevaks, title: 'Add Sevaks' },
];

const Gallery: React.FC = () => (
  <section id="screens" aria-labelledby="screens-title" className="bg-[#f4ece2] py-20 md:py-28">
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6" data-reveal>
        <div>
          <Eyebrow>Inside the app</Eyebrow>
          <h2 id="screens-title" className="vs-h2 mt-4">The real screens.</h2>
        </div>
        <p className="max-w-[40ch] text-[0.95rem] text-[color:var(--muted)]">Taken from the vSeva app. Names, numbers and photos are anonymised.</p>
      </div>
    </div>
    <ul
      className="vs-strip mt-12"
      style={{ paddingInline: 'max(1rem, calc((100vw - 1240px) / 2 + 1.5rem))', scrollPaddingInline: 'max(1rem, calc((100vw - 1240px) / 2 + 1.5rem))' }}
      tabIndex={0}
      aria-label="App screenshots, scroll sideways for more"
    >
      {GALLERY.map(g => (
        <li key={g.title} className="w-[58vw] max-w-[250px] sm:w-[250px]">
          <PhoneShot screen={g.screen} sizes="(max-width: 640px) 58vw, 250px" />
          <p className="mt-4 text-[0.95rem] font-semibold">{g.title}</p>
        </li>
      ))}
    </ul>
  </section>
);

/* ───────────── How it works ───────────── */

const FLOW = [
  { who: 'Captain', title: 'Request', body: 'The Captain taps Create Captain Account and enters the group’s details.' },
  { who: 'vSeva team', title: 'Review', body: 'Every group is verified by hand, usually within 24 to 48 hours.' },
  { who: 'Captain', title: 'Set up', body: 'The Captain signs in and adds routes, emergency contacts and Sevaks.' },
  { who: 'Sevak', title: 'Sign in', body: 'Each Sevak signs in with the username from the Captain and their mobile number.' },
  { who: 'Sevak', title: 'Record', body: 'After a Vihar, one Sevak submits it in four steps for everyone who walked.' },
  { who: 'Captain', title: 'Approve & track', body: 'The Captain approves it; stats, Sankalp and reports update for the group.' },
];

const HowItWorks: React.FC = () => (
  <Section id="how-it-works" className="py-20 md:py-28" labelledBy="how-title">
    <div className="max-w-[760px]" data-reveal>
      <Eyebrow>How it works</Eyebrow>
      <h2 id="how-title" className="vs-h2 mt-4">From the first request to the first report.</h2>
      <p className="vs-lede mt-5 max-w-[58ch]">A group joins once. After that, the work is the same every day: walk, record, approve.</p>
    </div>
    <ol className="relative mt-14 grid gap-0 lg:grid-cols-6 lg:gap-6">
      {/* the route line: across on large screens, down on small ones */}
      <span aria-hidden className="vs-route-dash absolute left-[17px] top-[16px] hidden h-[2px] lg:block" style={{ right: 'calc((100% - 7.5rem) / 6 - 17px)' }} />
      <span aria-hidden className="vs-route-dash-v absolute bottom-6 left-[16px] top-4 w-[2px] lg:hidden" />
      {FLOW.map((f, i) => (
        <li key={f.title} className="relative grid grid-cols-[34px_1fr] gap-4 pb-9 lg:block lg:pb-0" data-reveal style={{ ['--d' as string]: i }}>
          <span className="vs-stop relative z-[1]">{i + 1}</span>
          <div className="lg:mt-5">
            <p className="vs-eyebrow !text-[color:var(--muted)]">{f.who}</p>
            <p className="mt-1.5 font-[family-name:var(--display)] text-[1.25rem] font-bold tracking-[-0.01em]">{f.title}</p>
            <p className="mt-1.5 text-[0.95rem] text-[color:var(--ink-2)]">{f.body}</p>
          </div>
        </li>
      ))}
    </ol>
  </Section>
);

/* ───────────── Two onboarding paths ───────────── */

type Step = { screen: Screen; title: string; body: string; who: 'You' | 'vSeva team' | 'Your Captain' };

const GROUP_STEPS: Step[] = [
  { screen: SCREENS.login, who: 'You', title: 'Create Captain Account', body: 'On the vSeva sign-in screen, tap Create Captain Account.' },
  { screen: SCREENS.register, who: 'You', title: 'Enter your group’s details', body: 'Captain, optional Vice Captain, mobile, email, group, Sangh and address. The PIN code fills in the area.' },
  { screen: SCREENS.requestSubmitted, who: 'vSeva team', title: 'Wait for approval', body: 'We verify every group by hand, usually in 24 to 48 hours. Approve via WhatsApp speeds it up.' },
  { screen: SCREENS.dashboard, who: 'You', title: 'Sign in as Captain', body: 'Your email is your username and your mobile number is your password. Check the group details in Profile.' },
  { screen: SCREENS.addSevaks, who: 'You', title: 'Add routes and Sevaks', body: 'Add routes in Manage Routes, then each Sevak in Add Sevaks, and share their login on WhatsApp.' },
  { screen: SCREENS.entryStep1, who: 'You', title: 'Record the first Vihar', body: 'Use New Entry. Vihars you record count straight away.' },
];

const SEVAK_STEPS: Step[] = [
  { screen: SCREENS.addSevaks, who: 'Your Captain', title: 'The Captain adds you', body: 'Full name, mobile number, an optional alias and gender. vSeva makes your username from your name.' },
  { screen: SCREENS.login, who: 'You', title: 'Sign in', body: 'Use the username your Captain shares on WhatsApp. Your password is your mobile number.' },
  { screen: SCREENS.profileRing, who: 'You', title: 'Complete your profile', body: 'Blood group, age, family emergency contact, occupation and address take the ring to 100%.' },
  { screen: SCREENS.sevakHome, who: 'You', title: 'Find your Home', body: 'Your Sankalp ring and your stats, with Add Vihar right there.' },
  { screen: SCREENS.myVihars, who: 'You', title: 'Record and follow', body: 'Submit a Vihar in four steps. It counts once your Captain approves it.' },
];

const StepList: React.FC<{ steps: Step[]; dark?: boolean }> = ({ steps, dark }) => (
  <ol className={`vs-strip -mx-4 mt-10 px-4 sm:-mx-8 sm:px-8 md:mx-0 md:grid-flow-row md:grid-cols-3 md:gap-x-6 md:gap-y-10 md:overflow-visible md:px-0 ${steps.length === 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-6'}`}>
    {steps.map((st, i) => (
      <li key={st.title} className="w-[64vw] max-w-[250px] md:w-auto md:max-w-none" data-reveal style={{ ['--d' as string]: i }}>
        <PhoneShot screen={st.screen} sizes="(max-width: 768px) 64vw, 200px" />
        <p className={`mt-4 vs-mono text-[0.72rem] uppercase tracking-[0.12em] ${dark ? 'text-[#f0a37c]' : 'text-[color:var(--saffron-deep)]'}`}>
          Step {i + 1} · {st.who}
        </p>
        <p className={`mt-1.5 font-[family-name:var(--display)] text-[1.1rem] font-bold leading-snug ${dark ? 'text-white' : ''}`}>{st.title}</p>
        <p className={`mt-1.5 text-[0.9rem] leading-relaxed ${dark ? 'text-[#cdbfb2]' : 'text-[color:var(--ink-2)]'}`}>{st.body}</p>
      </li>
    ))}
  </ol>
);

const GetStarted: React.FC = () => (
  <Section id="get-started" className="py-20 md:py-28" labelledBy="get-started-title">
    <div className="max-w-[760px]" data-reveal>
      <Eyebrow>Get started</Eyebrow>
      <h2 id="get-started-title" className="vs-h2 mt-4">Two ways in: your group, and every Sevak in it.</h2>
    </div>

    {/* Path A: groups */}
    <div className="mt-12 rounded-[28px] bg-[color:var(--night)] p-6 sm:p-8 md:p-12">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end" data-reveal>
        <div className="lg:col-span-8">
          <p className="vs-eyebrow !text-[#f0a37c]">Path A · For Captains</p>
          <h3 className="vs-h2 mt-4 text-white">Bring your Vihar Seva group to vSeva.</h3>
          <p className="mt-4 max-w-[58ch] text-[#cdbfb2]">
            Bring your organization’s Vihar records, Sevak coordination and Seva progress into one organized digital platform.
            Steps marked “vSeva team” are the ones we do for you.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:col-span-4 lg:items-end">
          <a href="/contact#onboarding" className="vs-btn vs-btn-saffron">Get Your Group Onboarded <ArrowRight size={17} aria-hidden /></a>
          <a href="/login" className="text-[0.9rem] text-[#cdbfb2] underline decoration-[#f0a37c] underline-offset-4 hover:text-white">
            Ready now? Create Captain Account on the sign-in page
          </a>
        </div>
      </div>
      <StepList steps={GROUP_STEPS} dark />
    </div>

    {/* Path B: Sevaks */}
    <div className="mt-6 rounded-[28px] border border-[color:var(--line-strong)] bg-white p-6 sm:p-8 md:p-12">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end" data-reveal>
        <div className="lg:col-span-8">
          <p className="vs-eyebrow">Path B · For Sevaks</p>
          <h3 className="vs-h2 mt-4">Bring every Sevak into the journey.</h3>
          <p className="mt-4 max-w-[58ch] text-[color:var(--ink-2)]">
            Sevaks don’t sign up on their own: the Captain creates each login, so only your group’s members join your group.
          </p>
        </div>
        <div className="lg:col-span-4 lg:text-right">
          <a href="/documentation#sevak-onboarding" className="vs-btn vs-btn-primary">View the Sevak Setup Guide <BookOpen size={17} aria-hidden /></a>
        </div>
      </div>
      <StepList steps={SEVAK_STEPS} />
    </div>
  </Section>
);

/* ───────────── People ───────────── */

const People: React.FC = () => (
  <Section id="team" className="border-t border-[color:var(--line)] py-20 md:py-28" labelledBy="team-title">
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-5" data-reveal>
        <Eyebrow>The people behind vSeva</Eyebrow>
        <h2 id="team-title" className="vs-h2 mt-4 max-w-[14ch]">Built with purpose. Growing through Seva.</h2>
        <p className="vs-lede mt-5 max-w-[42ch]">vSeva was created to bring greater structure, visibility and continuity to the Vihar Seva journey.</p>
      </div>
      <div className="lg:col-span-7">
        <p className="vs-eyebrow !text-[color:var(--muted)]" data-reveal>Founders</p>
        <ul className="mt-3">
          {FOUNDERS.map((n, i) => (
            <li key={n} className="border-b border-[color:var(--line)] py-5" data-reveal style={{ ['--d' as string]: i }}>
              <span className="vs-display block text-[clamp(2.2rem,5vw,3.8rem)]">{n}</span>
            </li>
          ))}
        </ul>
        <p className="vs-eyebrow mt-12 !text-[color:var(--muted)]" data-reveal>The Team</p>
        <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
          {TEAM.map((n, i) => (
            <li key={n} className="font-[family-name:var(--display)] text-[1.5rem] font-bold tracking-[-0.015em]" data-reveal style={{ ['--d' as string]: i }}>{n}</li>
          ))}
        </ul>
      </div>
    </div>
  </Section>
);

/* ───────────── Community ───────────── */

const Community: React.FC = () => (
  <Section id="community" className="pb-20 md:pb-24" labelledBy="community-title">
    <div className="rounded-[28px] bg-[color:var(--saffron-tint)] p-6 sm:p-8 md:p-12">
      <div className="max-w-[640px]" data-reveal>
        <Eyebrow>Beyond vSeva</Eyebrow>
        <h2 id="community-title" className="vs-h2 mt-4">Explore the Jain community.</h2>
        <p className="mt-4 text-[color:var(--ink-2)]">Two free tools on this site, open to everyone without signing in.</p>
      </div>
      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {COMMUNITY_LINKS.map((l, i) => (
          <li key={l.href} data-reveal style={{ ['--d' as string]: i }}>
            <a href={l.href} className="group flex h-full items-start justify-between gap-6 rounded-2xl bg-white p-6 no-underline transition-colors hover:bg-[color:var(--paper)] md:p-8">
              <span>
                <span className="flex items-center gap-2 font-[family-name:var(--display)] text-[1.5rem] font-extrabold tracking-[-0.02em] text-[color:var(--ink)]">
                  {i === 0 ? <MapPin size={20} className="text-[color:var(--saffron)]" aria-hidden /> : <BookOpen size={20} className="text-[color:var(--saffron)]" aria-hidden />}
                  {l.title}
                </span>
                <span className="mt-2 block text-[0.95rem] text-[color:var(--ink-2)]">{l.body}</span>
              </span>
              <ArrowUpRight size={22} className="shrink-0 text-[color:var(--ink)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  </Section>
);

/* ───────────── Page ───────────── */

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => (
  <SiteShell page="home" title={PAGE_META['/'].title} description={PAGE_META['/'].description} onLogin={onGetStarted}>
    <Hero />
    <Ticker />
    <Stats />
    <Story />
    <Features />
    <Gallery />
    <HowItWorks />
    <GetStarted />
    <People />
    <Community />
  </SiteShell>
);

export default LandingPage;
