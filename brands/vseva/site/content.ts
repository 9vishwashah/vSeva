// Everything the public website says that someone may need to update — numbers, links, people, contacts —
// lives here, so the pages themselves only lay it out. Every feature listed is one that exists in the app.

export const SITE_URL = 'https://vseva.vjas.in';

// Approved marketing figures (shown exactly as written; not read from the database)
export const STATS = [
  { value: '500+', label: 'Active Sevaks' },
  { value: '10+', label: 'Vihar Seva Groups' },
  { value: '1000+', label: 'Vihars Recorded' },
] as const;

export const CONTACT = {
  supportWhatsAppDisplay: '+91 95945 03214',
  supportWhatsAppUrl: 'https://wa.me/919594503214',
  vjasPhoneDisplay: '+91 93245 03214',
  vjasPhoneUrl: 'tel:+919324503214',
  email: '9vishwashah@gmail.com',
  instagramUrl: 'https://www.instagram.com/the.vseva/',
  instagramHandle: '@the.vseva',
  youtubeUrl: 'https://www.youtube.com/@VJASTECH',
} as const;

// A WhatsApp link that opens a chat with the support number and a message already typed
export const whatsappWithText = (text: string) => `${CONTACT.supportWhatsAppUrl}?text=${encodeURIComponent(text)}`;

export const ONBOARDING_MESSAGE =
  'Jai Jinendra, vSeva team.\n\nWe would like to bring our Vihar Seva group onto vSeva.\n\nGroup name: \nCaptain: \nCity: \n\nPlease guide us with the next steps.';

// Related public tools on the same site
export const COMMUNITY_LINKS = [
  {
    href: '/nearby-derasar',
    title: 'Nearby Derasar',
    body: 'Find Jain Derasars around you, up to 100 km away, and get directions in Google Maps.',
  },
  {
    href: '/directory',
    title: 'Jain Directory',
    body: 'Temples, Upashrays and Vihar groups, listed by the community. Anyone can suggest a listing.',
  },
] as const;

export const NAV = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/documentation', label: 'Documentation' },
  { href: '/#story', label: 'Our story' },
  { href: '/contact', label: 'Contact' },
  { href: '/support-us', label: 'Support us' },
] as const;

export const TICKER = [
  'Vihar records',
  'Seva statistics',
  'Sankalp progress',
  'Sevak management',
  'Captain approvals',
  'Routes and distance',
  'PDF and Excel reports',
  'Important contacts',
  'Upcoming Vihar alerts',
  'Achievement cards',
  'Community directory',
] as const;

export const FOUNDERS = ['Vishwa Alpesh Shah', 'Alpesh Shah'] as const;
export const TEAM = ['Namya Mehta', 'Aagam Jain', 'Divya Mehta'] as const;

// Support Us: put the real UPI QR image in public/vseva-site/ and set its path here (e.g. '/vseva-site/upi-qr.png').
// While it is null the page shows a labelled placeholder.
export const SUPPORT = {
  upiQrImage: null as string | null,
  upiQrAlt: 'UPI QR code to support vSeva',
};

// Screens used on the site: public/vseva-site/screens/<name>-400.webp and -760.webp (see scripts/site-images.mjs)
export type Screen = { name: string; alt: string; width: number; height: number };
const s = (name: string, alt: string, height = 1553, width = 760): Screen => ({ name, alt, width, height });

export const SCREENS = {
  sevakHome: s('62-sevak-home', 'Sevak home screen in vSeva with the My Sankalp ring and Your Stats tiles'),
  groupAnalytics: s('21-group-analytics', 'Group Analytics screen with total distance, Vihars, Group Sankalp and top Sevaks'),
  dashboard: s('10-dashboard', 'Captain dashboard with organisation stats and the weekly consistency strip'),
  login: s('01-login', 'vSeva sign-in screen with the Create Captain Account button'),
  register: s('02-register', 'Create Captain Account form asking for the Captain and group details'),
  requestSubmitted: s('request-submitted', 'Request Submitted screen: every organisation is verified manually within 24 to 48 hours', 1623, 750),
  addSevaks: s('23-add-sevaks', 'Add New Sevak form with full name, mobile number, alias and gender'),
  entryStep1: s('30-entry-step1', 'New Vihar Entry, step 1: date and Vihar session'),
  entryStep2: s('33-entry-step2-filled', 'New Vihar Entry, step 2: Sadhubhagwan count and the From and To route'),
  entryStep3: s('35-entry-step3-selected', 'New Vihar Entry, step 3: Sevaks who walked, wheelchair and car Seva'),
  entryStep4: s('36-entry-step4', 'New Vihar Entry, step 4: instructions, notes and Submit Entry'),
  myVihars: s('64-my-vihars', 'My Vihars list showing an entry pending Captain approval'),
  contacts: s('69-sevak-contacts', 'Important Contacts with the emergency list and the Sevak contact directory'),
  share: s('52-share', 'Share your Seva sheet with Story and Square achievement cards'),
  idCard: s('42-idcard', 'Vihar Seva ID card with a QR code for verification (QR blurred)', 1026),
  alert: s('50-alert-vihar', 'Announce Upcoming Vihar form for alerting every Sevak'),
  export: s('51-export', 'Export configuration with date range, report type, columns, PDF and Excel'),
  vchat: s('24-vchat', 'VChat list with your group chat and followed groups'),
  directory: s('05-directory', 'vSeva Directory of temples, Upashrays and Vihar groups'),
  profileRing: s('43-profile-ring', 'Profile and Settings with the 100% profile completion ring'),
  completePrompt: s('45-complete-prompt', 'Kindly Complete Your Profile prompt with Later and Complete Now', 466, 575),
  sevakMore: s('65-sevak-more', 'More menu for Sevaks: Add Vihar, Group Analytics, VChat, Contacts and more'),
} satisfies Record<string, Screen>;
