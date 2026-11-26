import type { BrandMeta, Env } from '../types';
import accountBadges from './accountBadges.json';

// vSeva — the original product. Values here reproduce what was previously
// hard-coded in index.html / vite.config.ts / the UI, so a vSeva build is
// unchanged by the white-label work.
export const getMeta = (_env: Env): BrandMeta => ({
  id: 'vseva',
  dbBrand: null,

  name: 'vSeva',
  shortName: 'vSeva',
  slogan: 'Every Step Counts',
  byline: 'vSeva by VJAS',
  cardCredit: 'by VJAS',
  designer: { name: 'Vishwa Alpesh Shah', org: 'VJAS' },
  legalFooter: 'vSeva by VJAS · Designed by Vishwa Alpesh Shah',
  registerLabelKey: 'login.createCaptain',
  registration: { askSanghName: true, askGroupName: true },
  usernameHint: 'name@vsevak or admin@example.com',
  examples: { username: 'e.g. Vishwa Shah', mobile: '9594503214' },
  registrationExamples: { captain: 'Vijay Mehta', viceCaptain: 'Mukesh Duggad', mobile: '9594503214', email: 'contact@vjas.in', pin: '400703', town: 'Vashi', city: 'Navi Mumbai', district: 'Thane', state: 'Maharashtra' },
  description: 'Your Steps. Your Seva. Your Legacy. Digitizing Jain Vihar Seva activities.',
  finderName: 'vSeva Finder',
  directoryName: 'VSeva Community Directory',

  siteUrl: 'https://vseva.vjas.in',
  host: 'vseva.vjas.in',

  themeColor: '#EA580C',
  backgroundColor: '#FDFBF7',
  defaultLang: 'en',

  contact: {
    whatsapp: '919594503214',
    email: 'contact@vjas.in',
    demoContact: 'Alpesh Shah (9324503214)',
  },
  supportContacts: [
    { role: 'For Guide & Demo', name: 'Alpesh Shah', phone: '9324503214' },
    { role: 'For Technical Support', name: 'Vishwa Shah', phone: '9594503214' },
  ],
  sevakViharPreferences: false,
  viharEntryPhoto: false,
  viharEntryExtras: false,
  // username -> title (verified tick). Also read by the public leaderboard builder (netlify/functions/route-directory.js).
  accountBadges,
  instagram: { url: 'https://www.instagram.com/vseva.app', handle: '@vseva.app' },
  playStoreUrl: 'https://play.google.com/store/apps/details?id=in.vjas.vseva&pcampaignid=web_share',
  docsUrl: 'https://vseva.vjas.in/documentation',
  operator: 'Vishwa Alpesh Shah (VJAS)',
  showsDirectoryAdmin: true,

  htmlTitle: 'vSeva - Every Step Counts',
  keywords: 'vSeva, Jain Vihar, Vihar Seva, Jainism, Vihar Tracking, VJAS, Digitize Vihar, Jain Monk Tracking',
  ogTitle: 'vSeva - Digitizing Jain Vihar Seva',
  ogDescription: 'Your Steps. Your Seva. Your Legacy. A modern platform to record and manage Jain Vihar Seva activities.',
  // small copies of vseva-logo-full.png (286 KB): the icon is fetched on every page view
  iconPath: '/vseva-icon-192.png',
  appleTouchIconPath: '/vseva-icon-180.png',
  ogImagePath: '/vseva-og.jpg',
  ogImageSize: [1200, 630],
  schemaLogoPath: '/vseva-og-preview.png',
  altName: 'vSeva - VJAS',
  schemaContactPath: '/#contact',
  googleVerification: 'uEEgQxlfmHsWCwjOR64dWKVt9mQteVzbpbdcr2Y3izc',
  // Design Core fonts (components/core/theme.ts); the public website loads its own faces
  fontsHref: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,700;12..96,75..100,800&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Noto+Sans+Gujarati:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap',
  includeAssets: ['vseva-logo.png', 'pwa-192x192.png', 'apple-touch-icon.png', 'mask-icon.svg'],
});
