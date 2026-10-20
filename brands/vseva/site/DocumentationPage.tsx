import React, { useEffect, useState } from 'react';
import { Download, Youtube } from 'lucide-react';
import { CONTACT, SCREENS, type Screen } from './content';
import { PageIntro, Section, Shot, SiteShell } from './ui';
import { PAGE_META } from './seo';

// Public user guide. Every instruction here was checked against the app; nothing is hidden behind tabs,
// so the whole guide is in the page's HTML.

const TOC = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'organization', label: 'Understanding the organization' },
  { id: 'group-onboarding', label: 'Organization onboarding' },
  { id: 'sevak-onboarding', label: 'Sevak onboarding' },
  { id: 'recording-a-vihar', label: 'Recording a Vihar' },
  { id: 'approvals', label: 'Approvals and entry status' },
  { id: 'dashboard-and-statistics', label: 'Dashboard and statistics' },
  { id: 'captain-workflows', label: 'Captain workflows' },
  { id: 'contacts-and-notifications', label: 'Contacts and notifications' },
  { id: 'other-features', label: 'Other features' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'faq', label: 'FAQ' },
];

const UI: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="vs-ui">{children}</span>;

const Figure: React.FC<{ screen: Screen; caption: string }> = ({ screen, caption }) => (
  <figure className="my-6 max-w-[260px]">
    <div className="overflow-hidden rounded-[22px] border border-[color:var(--line-strong)] bg-white">
      <Shot screen={screen} className="block h-auto w-full" sizes="260px" />
    </div>
    <figcaption className="mt-2 text-[0.85rem] text-[color:var(--muted)]">{caption}</figcaption>
  </figure>
);

const FigureRow: React.FC<{ items: { screen: Screen; caption: string }[] }> = ({ items }) => (
  <div className="my-6 grid max-w-[68ch] grid-cols-2 gap-4 sm:grid-cols-3">
    {items.map(it => (
      <figure key={it.caption}>
        <div className="aspect-[760/1553] overflow-hidden rounded-[18px] border border-[color:var(--line-strong)] bg-white">
          <Shot screen={it.screen} className="block h-full w-full object-cover object-top" sizes="(max-width: 640px) 45vw, 210px" />
        </div>
        <figcaption className="mt-2 text-[0.8rem] text-[color:var(--muted)]">{it.caption}</figcaption>
      </figure>
    ))}
  </div>
);

// Highlights the section being read in the contents list
const useActiveSection = () => {
  const [active, setActive] = useState('introduction');
  useEffect(() => {
    const heads = TOC.map(t => document.getElementById(t.id)).filter(Boolean) as HTMLElement[];
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-80px 0px -70% 0px' });
    heads.forEach(h => io.observe(h));
    return () => io.disconnect();
  }, []);
  return active;
};

const DocumentationPage: React.FC = () => {
  const active = useActiveSection();
  const meta = PAGE_META['/documentation'];

  return (
    <SiteShell page="docs" title={meta.title} description={meta.description}>
      <PageIntro
        crumb="Documentation"
        eyebrow="Documentation · App guide"
        title={<>How vSeva works<span className="vs-accent">.</span></>}
        lede="A complete guide for Vihar Seva groups, Captains and Sevaks: getting your group on, adding Sevaks, recording Vihars, approvals, statistics and everything around them."
      />

      <Section className="pb-16">
        <div className="grid gap-10 lg:grid-cols-[250px_1fr] lg:gap-16">
          {/* Contents: a sticky list on large screens, a collapsible list on phones (works without JavaScript) */}
          <aside className="lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
            <details className="rounded-2xl border border-[color:var(--line-strong)] bg-white p-4 lg:hidden">
              <summary className="cursor-pointer font-semibold">On this page</summary>
              <nav aria-label="Documentation contents" className="vs-toc mt-3 border-l border-[color:var(--line)]">
                {TOC.map(t => <a key={t.id} href={`#${t.id}`}>{t.label}</a>)}
              </nav>
            </details>
            <div className="hidden lg:block">
              <p className="vs-eyebrow !text-[color:var(--muted)]">On this page</p>
              <nav aria-label="Documentation contents" className="vs-toc mt-4 border-l border-[color:var(--line)]">
                {TOC.map(t => <a key={t.id} href={`#${t.id}`} aria-current={active === t.id ? 'true' : undefined}>{t.label}</a>)}
              </nav>
              <div className="mt-8 space-y-3 text-[0.9rem]">
                <a href="/vseva-site/vSeva-App-Guide.pdf" className="vs-link inline-flex items-center gap-2" download>
                  <Download size={15} aria-hidden /> App Guide (PDF)
                </a>
                <a href={CONTACT.youtubeUrl} target="_blank" rel="noopener noreferrer" className="vs-link flex items-center gap-2">
                  <Youtube size={15} aria-hidden /> Video guides on YouTube
                </a>
              </div>
            </div>
          </aside>

          <article className="vs-doc min-w-0">
            <h2 id="introduction">Introduction</h2>
            <p>
              <strong>vSeva</strong> is an app for Jain Vihar Seva groups. Sevaks record each Vihar in a minute, and the Captain sees
              the whole group: who served, which routes, how many kilometres, and how the year is going.
            </p>
            <p>It serves three kinds of people:</p>
            <ul>
              <li><strong>Vihar Seva groups</strong> that want one organized record of their Seva instead of scattered messages and forms.</li>
              <li><strong>Captains</strong> who look after the group: members, routes, contacts, approvals and reports.</li>
              <li><strong>Sevaks</strong> who walk, record their Vihars and follow their own progress and Sankalp.</li>
            </ul>
            <p>
              vSeva works as an app on Android phones and in any browser at <a className="vs-link" href="/">vseva.vjas.in</a>.
              On an iPhone, open the site in Safari and use <UI>Share</UI> → <UI>Add to Home Screen</UI>. The app is available in
              English, ગુજરાતી and हिंदी: tap <UI>EN</UI> at the top of any screen to switch.
            </p>

            <h2 id="organization">Understanding the organization</h2>
            <p>
              Each group has <strong>one Captain account</strong> and any number of <strong>Sevak accounts</strong>. The Vice Captain is
              named in the group’s details and contacts; it is not a separate account type.
            </p>
            <table>
              <thead><tr><th scope="col">Action</th><th scope="col">Captain</th><th scope="col">Sevak</th></tr></thead>
              <tbody>
                <tr><td>Record a Vihar</td><td>Counts at once</td><td>Counts after approval</td></tr>
                <tr><td>Approve entries</td><td>Yes</td><td>No</td></tr>
                <tr><td>Edit or delete entries</td><td>Yes</td><td>No</td></tr>
                <tr><td>Statistics</td><td>Whole group</td><td>Own, plus Group Analytics</td></tr>
                <tr><td>Sevaks, routes, contacts</td><td>Manages</td><td>Views contacts</td></tr>
                <tr><td>Upcoming Vihar alert</td><td>Sends</td><td>Receives</td></tr>
                <tr><td>Sankalp</td><td>Group Sankalp; can lock</td><td>Own Sankalp</td></tr>
                <tr><td>Post in VChat</td><td>Always</td><td>If allowed</td></tr>
                <tr><td>Export reports</td><td>Yes</td><td>No</td></tr>
              </tbody>
            </table>
            <p>
              <strong>Captain responsibilities:</strong> keep the group details current, add Sevaks, maintain routes and emergency
              contacts, review submitted Vihars, send upcoming Vihar alerts and export reports.
            </p>
            <p>
              <strong>Sevak responsibilities:</strong> complete your profile, record the Vihars you walk (one Sevak submits each Vihar
              for everyone on it), and keep an eye on your Sankalp.
            </p>

            <h2 id="group-onboarding">Organization onboarding</h2>
            <p>A group starts with its Captain. The vSeva team reviews every new group before its account is created.</p>
            <ol>
              <li>Open <a className="vs-link" href="/login">the vSeva sign-in screen</a> and tap <UI>Create Captain Account</UI>.</li>
              <li>
                Fill in the Captain’s name, an optional Vice Captain, the Captain’s mobile number and email, the Vihar Seva group and
                Sangh names, and the address. Entering the PIN code fills in the town, city, district and state.
              </li>
              <li>
                Submit. The request is verified by hand, usually within <strong>24 to 48 hours</strong>. Tap <UI>Approve via WhatsApp</UI>{' '}
                to send the details to the team and speed it up.
              </li>
              <li>Once approved, the Captain signs in with their <strong>email as username</strong> and <strong>mobile number as password</strong>.</li>
              <li>Tap your photo → <UI>Profile &amp; Settings</UI>, check the group details and the names, then <UI>Save Changes</UI>.</li>
              <li>In Profile &amp; Settings, <UI>Edit</UI> the <strong>Group Sankalp</strong>: the number of Vihars the group aims for this year.</li>
              <li>Go to <UI>More</UI> → <UI>Manage Routes</UI> and add your routes: From, To, kilometres and an optional Via.</li>
              <li>Go to <UI>More</UI> → <UI>Add Sevaks</UI> and add your members (see the next section).</li>
              <li>Go to <UI>More</UI> → <UI>Contacts</UI> and add the emergency contacts every Sevak should see.</li>
            </ol>
            <FigureRow items={[
              { screen: SCREENS.register, caption: 'Create Captain Account' },
              { screen: SCREENS.requestSubmitted, caption: 'Request submitted, waiting for review' },
              { screen: SCREENS.dashboard, caption: 'The Captain’s Statistics home' },
            ]} />
            <p className="vs-note">
              <strong>Steps the vSeva team does:</strong> verifying the request and creating the Captain account. Everything after that,
              the group does itself. Need a hand? <a className="vs-link" href="/contact#onboarding">Contact us for onboarding help</a>.
            </p>

            <h2 id="sevak-onboarding">Sevak onboarding</h2>
            <p>Sevaks don’t register themselves. The Captain creates each Sevak’s login, so only your group’s members join your group.</p>
            <h3>For the Captain: adding a Sevak</h3>
            <ol>
              <li>Go to <UI>More</UI> → <UI>Add Sevaks</UI>.</li>
              <li>Enter the <strong>full name</strong> and <strong>mobile number</strong>, an optional <strong>alias</strong> (other names the Sevak is known by), and choose the <strong>gender</strong>.</li>
              <li>Tap <UI>Create Sevak Account</UI>. vSeva makes the username from the name; the password is the mobile number.</li>
              <li>Share the login shown on screen with the Sevak on WhatsApp in one tap.</li>
            </ol>
            <Figure screen={SCREENS.addSevaks} caption="Add New Sevak" />
            <h3>For the Sevak: your first sign-in</h3>
            <ol>
              <li>Open the vSeva app on Android, or <strong>vseva.vjas.in</strong> in your browser.</li>
              <li>Sign in with the <strong>username</strong> from your Captain and your <strong>mobile number</strong> as the password.</li>
              <li>
                vSeva asks you to <strong>complete your profile</strong>. Six details take it to 100%: blood group, age, family emergency
                contact name, family emergency number, occupation (if <em>Other</em>, add the details) and address. The ring around
                your photo shows how complete you are.
              </li>
              <li>Tap your photo → <UI>Profile &amp; Settings</UI> to check your group and Captain, fill <strong>Your Details</strong> and tap <UI>Save Changes</UI>.</li>
            </ol>
            <FigureRow items={[
              { screen: SCREENS.login, caption: 'Sign in' },
              { screen: SCREENS.profileRing, caption: 'The profile ring at 100%' },
              { screen: SCREENS.sevakHome, caption: 'Your Home' },
            ]} />
            <h3>Finding your way</h3>
            <table>
              <thead><tr><th scope="col">Where</th><th scope="col">What you find</th></tr></thead>
              <tbody>
                <tr><td>Home</td><td>Your Sankalp ring, your stats and the Add Vihar button</td></tr>
                <tr><td>My Vihars</td><td>Every Vihar you were part of</td></tr>
                <tr><td>More</td><td>Add Vihar, Group Analytics, VChat, Contacts, Notifications, Incidents</td></tr>
                <tr><td>Your photo</td><td>Profile, Sankalp, ID card, password and notifications</td></tr>
              </tbody>
            </table>
            <p>The Captain’s bottom bar has Statistics, View Entries, New Entry, More and the Captain’s photo.</p>

            <h2 id="recording-a-vihar">Recording a Vihar</h2>
            <p>Sevaks tap <UI>Add Vihar</UI> on Home; the Captain taps <UI>New Entry</UI>. It is the same four-step form for both.</p>
            <ol>
              <li><strong>Date &amp; Type.</strong> The date (today by default) and the Vihar Session: Morning or Evening.</li>
              <li><strong>Vihar Of &amp; Route.</strong> Tap Sadhubhagwan and/or Sadhvijibhagwan and enter how many. Pick <strong>From</strong> and <strong>To</strong>; the distance comes from your group’s routes.</li>
              <li><strong>Seva Requirements.</strong> Add every Sevak who walked (at least one). Answer Wheelchair and Car Seva (Updhi); if Yes, choose who.</li>
              <li><strong>Instructions &amp; Review.</strong> Optionally add the Samuday and notes, then tap <UI>Submit Entry</UI>.</li>
            </ol>
            <FigureRow items={[
              { screen: SCREENS.entryStep1, caption: '1 · Date & Type' },
              { screen: SCREENS.entryStep2, caption: '2 · Vihar Of & Route' },
              { screen: SCREENS.entryStep4, caption: '4 · Instructions & Review' },
            ]} />
            <p className="vs-note"><strong>One Vihar, one entry.</strong> One Sevak submits each Vihar for everyone who walked. Others should not submit it again.</p>

            <h2 id="approvals">Approvals and entry status</h2>
            <p>
              A Vihar recorded by a <strong>Sevak</strong> shows in My Vihars as <em>Pending captain approval</em> until the Captain
              decides. It is counted in statistics only once approved.
            </p>
            <p>
              The <strong>Captain</strong> opens <UI>More</UI> → <UI>Pending Approvals</UI>, opens the entry and chooses{' '}
              <UI>Approve</UI>, <UI>Edit Entry</UI> or <UI>Reject</UI>. A rejection notifies the Sevak who submitted it. Vihars the
              Captain records count at once, and everyone on them is notified.
            </p>
            <Figure screen={SCREENS.myVihars} caption="My Vihars with an entry pending Captain approval" />

            <h2 id="dashboard-and-statistics">Dashboard and statistics</h2>
            <p>Statistics count approved Vihars in the selected <strong>Vihar Year</strong>. Change the year with the <UI>VY</UI> menu to see earlier years.</p>
            <table>
              <thead><tr><th scope="col">Tile</th><th scope="col">Meaning</th></tr></thead>
              <tbody>
                <tr><td>Total KM</td><td>Kilometres walked</td></tr>
                <tr><td>Vihars</td><td>Number of Vihars</td></tr>
                <tr><td>Sadhu / Sadhvi</td><td>Bhagwant served</td></tr>
                <tr><td>Co-Sevak</td><td>Who you walk with most</td></tr>
                <tr><td>Rank in Org</td><td>By Vihars, then kilometres</td></tr>
                <tr><td>Day Streak</td><td>Days in a row</td></tr>
                <tr><td>Total Sevaks</td><td>Members, male and female</td></tr>
                <tr><td>Active Sevaks</td><td>Did a Vihar this year</td></tr>
                <tr><td>Consistency</td><td>This week, day by day</td></tr>
              </tbody>
            </table>
            <p><UI>More</UI> → <UI>Group Analytics</UI> shows group totals, the longest Vihar, the top Sevaks and Sevikas, the last seven days and a monthly calendar.</p>
            <h3>Vihar Year and Sankalp</h3>
            <p>A Vihar Year runs from <strong>14 October to 13 July</strong>; the months between are Chaturmas.</p>
            <ul>
              <li><strong>My Sankalp</strong> is your Vihar target for the year. It starts at 5; change it in Profile → My Sankalp → <UI>Edit</UI>. The ring on Home shows your progress.</li>
              <li><strong>Group Sankalp</strong> is set by the Captain for the whole group. The Captain can turn off <em>Allow Sevaks to edit their Sankalp</em> to lock everyone’s target.</li>
            </ul>
            <Figure screen={SCREENS.groupAnalytics} caption="Group Analytics" />

            <h2 id="captain-workflows">Captain workflows</h2>
            <table>
              <thead><tr><th scope="col">To…</th><th scope="col">Go to</th></tr></thead>
              <tbody>
                <tr><td>Approve entries</td><td>More → Pending Approvals</td></tr>
                <tr><td>Record a Vihar</td><td>New Entry</td></tr>
                <tr><td>Edit or delete entries</td><td>View Entries</td></tr>
                <tr><td>Alert an upcoming Vihar</td><td>Statistics → Alert Vihar</td></tr>
                <tr><td>Manage members</td><td>More → Add Sevaks</td></tr>
                <tr><td>Manage routes</td><td>More → Manage Routes</td></tr>
                <tr><td>Manage contacts</td><td>More → Contacts</td></tr>
                <tr><td>See group analytics</td><td>More → Group Analytics</td></tr>
                <tr><td>Export reports</td><td>Statistics → Export</td></tr>
                <tr><td>Follow up incidents</td><td>More → Incidents</td></tr>
              </tbody>
            </table>
            <h3>Upcoming Vihar alerts</h3>
            <p>
              Announce the date, time, route, Sadhu and Sadhvi Bhagwant, wheelchair and car Seva needs, police security and an
              emergency contact. Everyone in the group is notified, and Sevaks tap <UI>I’m Interested</UI>.
            </p>
            <h3>Reports</h3>
            <p>Statistics → <UI>Export</UI>: choose a date range, the report type and the columns, then download a <strong>PDF</strong> or <strong>Excel</strong> file. The member list can be exported from Add Sevaks.</p>
            <h3>Sevak management</h3>
            <p>Add Sevaks lists every member with their last Vihar, lets the Captain edit details or reset a password, and shows what each Sevak still has to fill in their profile.</p>
            <FigureRow items={[
              { screen: SCREENS.alert, caption: 'Announce Upcoming Vihar' },
              { screen: SCREENS.export, caption: 'Export configuration' },
            ]} />

            <h2 id="contacts-and-notifications">Contacts and notifications</h2>
            <ul>
              <li><strong>Emergency contacts</strong> are added by the Captain in More → Contacts and shown to every Sevak.</li>
              <li><strong>Sevak contact directory:</strong> search a name, then tap <UI>Call</UI> or <UI>WhatsApp</UI>.</li>
              <li><strong>Notifications:</strong> the bell shows your alerts; tap one to open the right screen.</li>
            </ul>
            <p>You are notified when:</p>
            <ul>
              <li>an upcoming Vihar is announced;</li>
              <li>your Captain records a Vihar with you in it;</li>
              <li>a submission is not approved, or one is waiting for the Captain;</li>
              <li>there is a new VChat message;</li>
              <li>you have had no Vihar for several days.</li>
            </ul>
            <p>For alerts on your phone: Profile → <UI>Push Notifications</UI>, and allow notifications for vSeva in your phone’s settings.</p>
            <Figure screen={SCREENS.contacts} caption="Important Contacts" />

            <h2 id="other-features">Other features</h2>
            <h3>Sharing your Seva</h3>
            <p>Each Vihar card in My Vihars or View Entries has <UI>Save</UI> and <UI>WhatsApp</UI>. The share button next to Your Stats makes a Story or Square card to save or share on WhatsApp or Instagram.</p>
            <h3>Vihar Seva ID card</h3>
            <p>Profile → <UI>Vihar Seva ID Card</UI> shows your card with a QR code. Scanning it opens your verification page with your emergency details. Tap <UI>Download PNG</UI> to save it, then print or share it.</p>
            <h3>VChat</h3>
            <p>Your group’s own chat. The Captain can follow other groups so members can read their updates, and can choose whether Sevaks may post. Messages are kept for 30 days.</p>
            <h3>Incidents</h3>
            <p>Sevaks can report an incident from More → Incidents, with a photo or video. The Captain sees the reports and updates their status.</p>
            <h3>Community Directory and Nearby Derasar</h3>
            <p>
              The <a className="vs-link" href="/directory">Jain Directory</a> is a public list of Vihar groups, temples and Upashrays; anyone
              can suggest a listing, which is reviewed before it appears. <a className="vs-link" href="/nearby-derasar">Nearby Derasar</a>{' '}
              finds Derasars near you, up to 100 km away, with directions in Google Maps.
            </p>
            <FigureRow items={[
              { screen: SCREENS.share, caption: 'Share your Seva' },
              { screen: SCREENS.vchat, caption: 'VChat' },
              { screen: SCREENS.directory, caption: 'Community Directory' },
            ]} />

            <h2 id="troubleshooting">Troubleshooting</h2>
            <h3>I can’t sign in</h3>
            <p>Use the username from your Captain and your mobile number as the password. Still stuck? Tap <UI>Forgot Password?</UI> and enter your username: your Captain is notified and resets it to your mobile number. Captains get a reset link by email.</p>
            <h3>“Your session has ended”</h3>
            <p>Sign in again. Nothing you saved is lost.</p>
            <h3>My Vihar isn’t in my stats</h3>
            <p>It is probably still pending. Check My Vihars, and remind your Captain. Please don’t submit it again.</p>
            <h3>My numbers changed</h3>
            <p>Check the Vihar Year in the VY menu: statistics only count the selected year.</p>
            <h3>A route is missing</h3>
            <p>Ask your Captain to add it in More → Manage Routes.</p>
            <h3>Save or Export does nothing</h3>
            <p>In the app, choose where to send the file in the share sheet. On the web, check your Downloads.</p>
            <h3>No notifications</h3>
            <p>Profile → Push Notifications → Enable, and allow vSeva in your phone’s settings.</p>
            <h3>I can’t see a menu item</h3>
            <p>Some tools are for the Captain only: approvals, editing entries, exports, Add Sevaks, routes and contacts.</p>

            <h2 id="faq">FAQ</h2>
            <details>
              <summary>Can a Sevak sign up on their own?</summary>
              <p>No. The Captain adds every Sevak, and vSeva creates the login. This keeps each group’s members to the people the Captain knows.</p>
            </details>
            <details>
              <summary>How long does group approval take?</summary>
              <p>Every group is verified by hand, usually within 24 to 48 hours. Tapping Approve via WhatsApp after you submit speeds it up.</p>
            </details>
            <details>
              <summary>Is there an iPhone app?</summary>
              <p>vSeva works in Safari on iPhone. Open vseva.vjas.in in Safari, tap Share, then Add to Home Screen to keep it on your home screen.</p>
            </details>
            <details>
              <summary>Why does my Vihar need approval?</summary>
              <p>So every number in the group’s statistics has been checked by the Captain. Vihars the Captain records count straight away.</p>
            </details>
            <details>
              <summary>What is the Vihar Year?</summary>
              <p>14 October to 13 July. Statistics and Sankalp follow it, and you can look back at earlier years from the VY menu.</p>
            </details>
            <details>
              <summary>Which languages does vSeva support?</summary>
              <p>English, Gujarati and Hindi. Tap EN at the top of any screen to switch.</p>
            </details>
            <details>
              <summary>Who can see my phone number?</summary>
              <p>Members of your own group see the Sevak contact directory so they can call or message each other. Your ID card’s verification page shows your emergency details.</p>
            </details>

            <div className="mt-14 rounded-2xl bg-[color:var(--night)] p-6 text-[#f3e9de] sm:p-8">
              <p className="font-[family-name:var(--display)] text-[1.5rem] font-extrabold tracking-[-0.02em] !text-white">Still have a question?</p>
              <p className="!text-[#cdbfb2]">Message the vSeva team on WhatsApp, or watch the step-by-step videos on YouTube.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href="/contact" className="vs-btn vs-btn-saffron">Contact us</a>
                <a href={CONTACT.youtubeUrl} target="_blank" rel="noopener noreferrer" className="vs-btn vs-btn-light"><Youtube size={16} aria-hidden /> Watch on YouTube</a>
                <a href="/vseva-site/vSeva-App-Guide.pdf" className="vs-btn border border-white/25 text-white hover:border-white/60" download><Download size={16} aria-hidden /> App Guide PDF</a>
              </div>
            </div>
          </article>
        </div>
      </Section>
    </SiteShell>
  );
};

export default DocumentationPage;
