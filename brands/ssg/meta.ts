import type { BrandMeta, Env } from '../types';

// Shraman Seva Group (SSG). Deployment-specific values come from the SSG Netlify
// site's environment so a number or domain change never needs a code change:
//   VITE_SITE_URL         https://<ssg domain>      (needed for link previews / canonical)
//   VITE_CONTACT_WHATSAPP digits with country code  (falls back to 919824112292)
//   VITE_CONTACT_EMAIL    support email             (falls back to 919824112292)
//   VITE_INSTAGRAM_URL    optional
export const getMeta = (env: Env): BrandMeta => {
  const siteUrl = (env.VITE_SITE_URL || '').replace(/\/+$/, '');
  const instagramUrl = env.VITE_INSTAGRAM_URL || '';
  const description =
    'Shraman Seva Group — record every Vihar, coordinate Sevaks and keep every Seva family connected, in the service of Jain Shramans.';

  return {
    id: 'ssg',
    dbBrand: 'ssg',

    name: 'Shraman Seva Group',
    shortName: 'SSG',
    slogan: 'મને સેવા શ્રમણની મળજો રે…',
    byline: 'Shraman Seva Group',
    cardCredit: null,
    designer: null,
    legalFooter: 'Shraman Seva Group',
    registerLabelKey: 'login.createCaptain',
    registration: { askSanghName: false, askGroupName: false },
    usernameHint: 'username or admin@example.com',
    examples: { username: 'e.g. Ramesh Shah', mobile: '9876543210' },
    description,
    finderName: 'SSG Derasar Finder',
    directoryName: 'Shraman Seva Group Community Directory',

    siteUrl,
    host: siteUrl.replace(/^https?:\/\//, ''),

    themeColor: '#E8730C',
    backgroundColor: '#FFF6E5',
    defaultLang: 'gu',

    contact: {
      whatsapp: (env.VITE_CONTACT_WHATSAPP || '919824112292').replace(/\D/g, ''),
      email: env.VITE_CONTACT_EMAIL || '9vishwashah@gmail.com',
      demoContact: env.VITE_DEMO_CONTACT || 'the Shraman Seva Group team',
    },
    supportContacts: [
      { role: 'For Guide & Demo', name: 'Shraman Seva Group', phone: (env.VITE_CONTACT_WHATSAPP || '919824112292').replace(/\D/g, '').slice(-10) },
      { role: 'For Technical Support', name: 'Vishwa Shah', phone: '9594503214' },
    ],
    instagram: instagramUrl ? { url: instagramUrl, handle: 'Instagram' } : null,
    operator: 'Shraman Seva Group',
    showsDirectoryAdmin: false,

    htmlTitle: 'Shraman Seva Group | શ્રમણ સેવા ગ્રુપ',
    keywords: 'Shraman Seva Group, શ્રમણ સેવા ગ્રુપ, Jain Vihar, Vihar Seva, Jain Sevak, Vihar Tracking',
    ogTitle: 'Shraman Seva Group | શ્રમણ સેવા ગ્રુપ',
    ogDescription: description,
    // Tab icon and iOS Home Screen icon use the sun-and-muni emblem: the full logo's text is unreadable at icon size.
    iconPath: '/pwa-192x192.png',
    appleTouchIconPath: '/apple-touch-icon.png',
    ogImagePath: '/ssg-og.png',
    ogImageSize: [1200, 630],
    schemaLogoPath: '/ssg-logo-full.png',
    altName: 'શ્રમણ સેવા ગ્રુપ',
    schemaContactPath: null,
    googleVerification: null,
    // Anek Gujarati: condensed-capable display face with Gujarati + Latin, matching the
    // bold uppercase headings of the reference design; Noto Sans Gujarati for body text.
    fontsHref:
      'https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400..800&family=Manrope:wght@500;600;700;800&family=Noto+Sans+Gujarati:wght@400;600;700&family=Playfair+Display:wght@600;700&display=swap',
    includeAssets: ['pwa-192x192.png', 'apple-touch-icon.png', 'ssg-logo-full.png'],
  };
};
