import type { BrandMeta, Env } from '../types';

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
    email: '9vishwashah@gmail.com',
    demoContact: 'Alpesh Shah (9324503214)',
  },
  supportContacts: [
    { role: 'For Guide & Demo', name: 'Alpesh Shah', phone: '9324503214' },
    { role: 'For Technical Support', name: 'Vishwa Shah', phone: '9594503214' },
  ],
  instagram: { url: 'https://www.instagram.com/the.vseva/', handle: '@the.vseva' },
  operator: 'Vishwa Alpesh Shah (VJAS)',
  showsDirectoryAdmin: true,

  htmlTitle: 'vSeva - Every Step Counts',
  keywords: 'vSeva, Jain Vihar, Vihar Seva, Jainism, Vihar Tracking, VJAS, Digitize Vihar, Jain Monk Tracking',
  ogTitle: 'vSeva - Digitizing Jain Vihar Seva',
  ogDescription: 'Your Steps. Your Seva. Your Legacy. A modern platform to record and manage Jain Vihar Seva activities.',
  iconPath: '/vseva-logo-full.png',
  appleTouchIconPath: '/vseva-logo-full.png',
  ogImagePath: '/vseva-logo-full.png',
  ogImageSize: [512, 512],
  schemaLogoPath: '/vseva-og-preview.png',
  altName: 'vSeva - VJAS',
  schemaContactPath: '/#contact',
  googleVerification: 'uEEgQxlfmHsWCwjOR64dWKVt9mQteVzbpbdcr2Y3izc',
  fontsHref: 'https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Playfair+Display:wght@600;700&display=swap',
  includeAssets: ['vseva-logo.png', 'pwa-192x192.png', 'apple-touch-icon.png', 'mask-icon.svg'],
});
