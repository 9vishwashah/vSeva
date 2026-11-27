// Per-page metadata for the public website. Used by the pages (document.title on client visits) and by
// scripts/prerender.mjs, which writes it into each page's static HTML along with the structured data.
import { CONTACT, PLAY_STORE_URL, ROUTE_FAQ, SITE_URL } from './content';
import type { SiteData } from './siteData';

export type PublicPath = '/' | '/documentation' | '/contact' | '/support-us' | '/vihar-routes' | '/leaderboard';

export const PAGE_META: Record<PublicPath, { title: string; description: string; crumb?: string }> = {
  '/': {
    title: 'vSeva – Vihar Seva app for Jain Vihar Seva groups | Android app on Google Play',
    description:
      'vSeva helps Jain Vihar Seva groups record Vihars, manage Sevaks, approve entries and follow kilometres, Sankalp and statistics. See the top Vihar Sevaks and groups, find Vihar routes, and get the Android app on Google Play.',
  },
  '/documentation': {
    title: 'vSeva Documentation – Vihar Seva app guide for Captains and Sevaks',
    description:
      'How to onboard a Vihar Seva group, add Sevaks, record a Vihar, approve entries, read statistics and Sankalp, and use contacts, alerts and reports in vSeva.',
    crumb: 'Documentation',
  },
  '/contact': {
    title: 'Contact vSeva – onboarding and support for Vihar Seva groups',
    description:
      'Reach the vSeva team on WhatsApp for group onboarding, Sevak setup or technical help, or call VJAS about websites and digital services.',
    crumb: 'Contact',
  },
  '/support-us': {
    title: 'Support vSeva – help keep the Vihar Seva platform going',
    description:
      'vSeva is built to help Vihar Seva groups organize their records. Voluntary support helps maintain and improve the platform.',
    crumb: 'Support us',
  },
  '/vihar-routes': {
    title: 'Vihar Routes – Jain Vihar route directory with distances | vSeva',
    description:
      'Find Jain Vihar routes and their distance in km: every Vihar route shared by Vihar Seva groups on vSeva, by city, with walking directions and the group Captain to contact. Free, no sign-in.',
    crumb: 'Vihar routes',
  },
  '/leaderboard': {
    title: 'Top Vihar Sevaks – Vihar Seva leaderboard | vSeva',
    description:
      'The Jain Vihar Sevaks, Sevikas and Vihar Seva groups who walk the most on vSeva: this Vihar Year and all time, by Vihars or kilometres. Find yourself on the board.',
    crumb: 'Leaderboard',
  },
};

export const canonical = (path: PublicPath) => (path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`);

const organization = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'vSeva',
  alternateName: 'vSeva - VJAS',
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/vseva-logo-full.png`, // square logo (the 1200x630 banner is for link previews)
  sameAs: [CONTACT.instagramUrl, CONTACT.youtubeUrl, PLAY_STORE_URL],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    url: `${SITE_URL}/contact`,
    telephone: '+91-9594503214',
    availableLanguage: ['English', 'Gujarati', 'Hindi'],
  },
};

const breadcrumb = (path: PublicPath) => ({
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
    { '@type': 'ListItem', position: 2, name: PAGE_META[path].crumb, item: canonical(path) },
  ],
});

const fmtKm = (k: number) => (k % 1 ? k.toFixed(1) : String(k));

// The leaderboard and the routes as schema.org lists, from the same data the page shows (siteData.ts)
const leaderboardLists = (b: any): object[] => {
  if (!b?.sevaks?.length) return [];
  const groupName = (i: number) => b.groups?.[i]?.[0] || '';
  const sevaks = [...b.sevaks].sort((x: any[], y: any[]) => y[5] - x[5] || y[6] - x[6]).slice(0, 10);
  const groups = [...(b.groups || [])].filter((g: any[]) => g[4] > 0).sort((x: any[], y: any[]) => y[4] - x[4]).slice(0, 10);
  const lists: object[] = [{
    '@type': 'ItemList',
    '@id': `${SITE_URL}/#top-vihar-sevaks`,
    name: 'Top Vihar Sevaks on vSeva (all time)',
    description: 'Jain Vihar Sevaks with the most approved Vihars recorded on vSeva, across every Vihar Seva group.',
    url: `${SITE_URL}/#leaderboard`,
    numberOfItems: sevaks.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: sevaks.map((s: any[], i: number) => ({
      '@type': 'ListItem', position: i + 1, name: s[0],
      description: `${s[5]} Vihars, ${fmtKm(s[6])} km${groupName(s[2]) ? ` · ${groupName(s[2])}` : ''}`,
    })),
  }];
  if (groups.length) lists.push({
    '@type': 'ItemList',
    '@id': `${SITE_URL}/#top-vihar-seva-groups`,
    name: 'Top Vihar Seva groups on vSeva (all time)',
    description: 'Jain Vihar Seva groups with the most approved Vihars recorded on vSeva.',
    url: `${SITE_URL}/#leaderboard`,
    numberOfItems: groups.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: groups.map((g: any[], i: number) => ({
      '@type': 'ListItem', position: i + 1, name: g[0],
      description: `${g[4]} Vihars, ${fmtKm(g[5])} km${g[1] ? ` · ${g[1]}` : ''}`,
    })),
  });
  return lists;
};

const routeLists = (d: any): object[] => {
  if (!d?.routes?.length) return [];
  const routes = d.routes.slice(0, 120); // the most-shared routes first (the page itself lists every one)
  return [
    {
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}/vihar-routes#page`,
      url: `${SITE_URL}/vihar-routes`,
      name: 'Vihar route directory',
      description: `${d.stats.routes} Jain Vihar routes with distances, shared by ${d.stats.groups} Vihar Seva groups on vSeva across ${d.stats.cities} cities.`,
      dateModified: d.generatedAt,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      mainEntity: { '@id': `${SITE_URL}/vihar-routes#routes` },
    },
    {
      '@type': 'ItemList',
      '@id': `${SITE_URL}/vihar-routes#routes`,
      name: 'Jain Vihar routes and distances',
      numberOfItems: d.stats.routes,
      itemListElement: routes.map((r: any[], i: number) => ({
        '@type': 'ListItem', position: i + 1,
        name: `${r[0]} to ${r[1]}`,
        description: `${fmtKm(r[2])} km Vihar route${r[4] ? ` via ${r[4]}` : ''}${d.groups?.[r[3]?.[0]]?.c ? `, ${d.groups[r[3][0]].c}` : ''}`,
      })),
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/vihar-routes#faq`,
      mainEntity: ROUTE_FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];
};

// Only facts that are true and visible on the pages: no ratings, prices or reviews.
export const structuredData = (path: PublicPath, data: SiteData = {}) => {
  const graph: object[] = [organization];
  if (path === '/') {
    graph.push(
      // name + alternateName: what Google shows as the site name in results
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: 'vSeva', alternateName: ['vSeva App', 'vSeva Vihar Seva'], publisher: { '@id': `${SITE_URL}/#organization` }, inLanguage: 'en-IN' },
      {
        // The Android app on Google Play (the same app also runs on iPhone and in any browser as a web app)
        '@type': 'MobileApplication',
        '@id': `${SITE_URL}/#app`,
        name: 'vSeva',
        url: `${SITE_URL}/`,
        sameAs: PLAY_STORE_URL,
        installUrl: PLAY_STORE_URL,
        downloadUrl: PLAY_STORE_URL,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Android, iOS, Web',
        screenshot: `${SITE_URL}/vseva-site/screens/62-sevak-home-760.webp`,
        description: PAGE_META['/'].description,
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      ...leaderboardLists(data.leaderboard),
    );
  } else {
    graph.push(breadcrumb(path));
    if (path === '/vihar-routes') graph.push(...routeLists(data.routes));
    if (path === '/leaderboard') graph.push(...leaderboardLists(data.leaderboard));
  }
  return { '@context': 'https://schema.org', '@graph': graph };
};
