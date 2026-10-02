import React from 'react';
import { ChevronLeft } from 'lucide-react';

// Public, no-login pages required for Google Play (a privacy-policy URL and a
// web account-deletion URL). Statements here are derived from what the app
// actually collects — if a feature that touches personal data changes, update
// this file in the same change.

const LAST_UPDATED = '2 October 2026';
const CONTACT_WHATSAPP = 'https://wa.me/919594503214';
const CONTACT_EMAIL = '9vishwashah@gmail.com';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="text-lg font-extrabold text-[#241C17] mb-2">{title}</h2>
    <div className="text-sm leading-relaxed text-[#4A3F38] space-y-3">{children}</div>
  </section>
);

const Bullets: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ul className="list-disc pl-5 space-y-1.5">
    {items.map((item, i) => <li key={i}>{item}</li>)}
  </ul>
);

const Shell: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="min-h-screen bg-[#FDFBF7]">
    <header className="border-b border-orange-100 bg-white">
      <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
        <a href="/" className="w-9 h-9 rounded-full bg-[#FDFBF7] border border-orange-100 flex items-center justify-center" aria-label="Back to vSeva">
          <ChevronLeft size={16} className="text-[#241C17]" />
        </a>
        <span className="font-extrabold text-saffron-600 text-lg">vSeva</span>
      </div>
    </header>
    <main className="max-w-2xl mx-auto px-5 py-8">
      <h1 className="text-2xl font-extrabold text-[#241C17] mb-1">{title}</h1>
      <p className="text-xs text-[#8A6A57] mb-8">Last updated: {LAST_UPDATED}</p>
      {children}
      <p className="text-xs text-[#8A6A57] mt-10 pt-6 border-t border-orange-100">vSeva by VJAS · Designed by Vishwa Alpesh Shah</p>
    </main>
  </div>
);

export const PrivacyPolicy: React.FC = () => (
  <Shell title="Privacy Policy">
    <Section title="About vSeva">
      <p>
        vSeva is a platform that helps Jain Vihar Seva groups record Vihar journeys, coordinate Sevaks, track distance and
        participation, and keep volunteers safe. It is built and operated by Vishwa Alpesh Shah (VJAS) and is available as a website
        (vseva.vjas.in) and an Android app. This policy explains what information vSeva handles, why, and the choices you have.
      </p>
      <p>
        Accounts work in two ways: a Captain registers a group, and the Captain then creates accounts for that group's Sevaks. Sevaks
        do not sign themselves up.
      </p>
    </Section>

    <Section title="Information we collect">
      <Bullets items={[
        <><strong>Account and profile details</strong> — full name, username (login ID), password (stored only in hashed form by our authentication provider; we cannot read it), mobile number, gender, age, blood group, emergency contact number, address, and an optional profile photo. Some of these are entered by your Captain, some by you.</>,
        <><strong>Group registration details</strong> — group and sangh name, Captain and Vice-Captain names, address, city, PIN code, mobile number and email, supplied when a group asks to join.</>,
        <><strong>Seva activity</strong> — Vihar entries (date, route, distance, participants, notes), approval status, statistics, yearly goals, and incident reports you file.</>,
        <><strong>Messages</strong> — posts you publish in Channel to your organisation or its followers.</>,
        <><strong>SOS alerts</strong> — when you trigger SOS: the time, an optional note, and your device's precise location if you have allowed location access.</>,
        <><strong>Location</strong> — approximate or precise location, only at the moment you use SOS or "Find nearby Derasar". vSeva does not track your location in the background.</>,
        <><strong>Notification and device data</strong> — a push-notification token / subscription ID, your last-login time, and standard technical data (such as IP address and browser or app version) handled by our hosting and notification providers.</>,
        <><strong>Directory contributions</strong> — details and photos of temples or places submitted to the public Directory, plus the contributor's name and optional mobile number.</>,
      ]} />
      <p>
        vSeva does not use advertising IDs, advertising networks, or analytics/tracking SDKs. It does not access your contacts, SMS,
        microphone, or files beyond the photos you choose to upload.
      </p>
    </Section>

    <Section title="How we use it">
      <Bullets items={[
        'To run the app: sign you in, show your organisation\'s Vihar records, statistics and leaderboards, and generate reports and exports.',
        'To let Captains review and approve Vihar entries and manage their Sevaks.',
        'To send notifications you are meant to receive (Vihar alerts, approvals, messages, and SOS alerts).',
        'To keep Sevaks safe: SOS alerts and the emergency ID card exist so that help can reach the right person quickly.',
        'To secure the service, prevent abuse, and fix problems.',
      ]} />
      <p>We do not sell your personal information and we do not use it for advertising.</p>
    </Section>

    <Section title="Who can see your information">
      <Bullets items={[
        <><strong>Your Captain and Vice-Captain</strong> can see the profile details of Sevaks in their group, including contact and emergency details, and receive SOS alerts from the group.</>,
        <><strong>Other Sevaks in your group</strong> can see your name and participation in Vihars, and appear in group rankings and leaderboards.</>,
        <><strong>The emergency ID card and QR code.</strong> Each Sevak's ID card carries a QR code that opens a public page — viewable by anyone who scans it or has the link, without logging in — showing name, gender, blood group, mobile number, emergency contact number and address. This is intentional, so a bystander can help in an emergency. Optional fields (blood group, emergency number, address) that you leave blank are not shown.</>,
        <><strong>The Directory</strong> is public by design: approved temple/place listings, their photos and contact details can be seen by anyone.</>,
        <><strong>Channel posts</strong> are visible to the organisation that posted them and to organisations that follow it.</>,
      ]} />
    </Section>

    <Section title="Service providers that process data for us">
      <Bullets items={[
        'Supabase — database, sign-in and file storage (servers in Singapore).',
        'Netlify — website hosting and the server functions the app calls.',
        'OneSignal and Google Firebase Cloud Messaging — delivery of push notifications.',
        'Google Maps Platform (Places) — finding nearby temples; our server sends it the coordinates you searched from.',
        'OpenFreeMap / OpenStreetMap — map tiles, and place-name lookup for map links; they receive your IP address and requested map area.',
        'Google Fonts — web fonts; receives your IP address.',
      ]} />
      <p>These providers handle data only to provide their service to vSeva.</p>
    </Section>

    <Section title="How long we keep it">
      <p>
        Account and Vihar records are kept while your account and your organisation are active. Notifications and old Channel messages
        are cleaned up automatically from time to time. When an account is deleted (see below), its profile information is removed.
      </p>
    </Section>

    <Section title="Security">
      <p>
        Data is sent over HTTPS, passwords are stored hashed, and access to each organisation's data is restricted by role and
        organisation using database-level access rules. No system is perfectly secure, so please use a strong password and keep it private.
      </p>
    </Section>

    <Section title="Your choices">
      <Bullets items={[
        'View and update your details in Profile & Settings, or ask your Captain to update them.',
        'Turn notifications on or off in Profile & Settings or your device settings.',
        'Allow or deny location in your device settings at any time. SOS still works without it (it is sent without a location); finding nearby temples needs it.',
        <>Ask us to delete your account and data — see <a className="text-saffron-600 underline" href="/delete-account">how to request deletion</a>.</>,
      ]} />
    </Section>

    <Section title="Children">
      <p>vSeva is intended for adults (18 and over) and is not directed at children.</p>
    </Section>

    <Section title="Changes to this policy">
      <p>If we change this policy we will update the date above, and tell users in the app if the change is significant.</p>
    </Section>

    <Section title="Contact">
      <p>
        Questions or requests about your data: email{' '}
        <a className="text-saffron-600 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or message us on{' '}
        <a className="text-saffron-600 underline" href={CONTACT_WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp (+91 95945 03214)</a>.
      </p>
    </Section>
  </Shell>
);

export const DeleteAccount: React.FC = () => {
  const requestLink = `${CONTACT_WHATSAPP}?text=${encodeURIComponent('Hello vSeva team, I would like to request deletion of my vSeva account.\n\nName: \nUsername / login ID: \nGroup (Vihar Seva Group): ')}`;
  return (
    <Shell title="Delete your vSeva account">
      <Section title="How to request deletion">
        <p>You can ask for your account and personal data to be deleted at any time, in either of these ways:</p>
        <Bullets items={[
          <><strong>Sevaks:</strong> ask your Captain to delete you from the <em>Add Sevaks</em> screen. This deletes your login and profile.</>,
          <><strong>Anyone (Sevaks, Captains, Directory contributors):</strong> send us a request by email or WhatsApp with your name, your username or login ID, and your group name. We will confirm it is you and complete the deletion within 30 days.</>,
        ]} />
        <a
          href={requestLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 px-5 py-3 rounded-xl bg-saffron-600 text-white font-bold text-sm"
        >
          Request deletion on WhatsApp
        </a>
        <p className="pt-1">Or email <a className="text-saffron-600 underline" href={`mailto:${CONTACT_EMAIL}?subject=vSeva%20account%20deletion%20request`}>{CONTACT_EMAIL}</a>.</p>
        <p className="pt-2">Captains: deleting a Captain account affects the whole group, so we will contact you first to transfer or close the group.</p>
      </Section>

      <Section title="What gets deleted">
        <Bullets items={[
          'Your login, and your profile: name, mobile number, gender, age, blood group, emergency contact, address.',
          'Your profile photo, on request.',
          'Your push-notification registration and notifications.',
          'Your emergency ID card page stops working.',
        ]} />
      </Section>

      <Section title="What may be kept">
        <Bullets items={[
          'Vihar records your group has logged. If you took part in a Vihar, the record may still list your username as a participant so that your group\'s distance and history stay accurate; it no longer links to a profile or contact details.',
          'Information we are required to keep by law, or need to keep to prevent abuse.',
        ]} />
      </Section>

      <p className="text-sm text-[#4A3F38]">
        See the full <a className="text-saffron-600 underline" href="/privacy">Privacy Policy</a> for details on what vSeva collects.
      </p>
    </Shell>
  );
};
