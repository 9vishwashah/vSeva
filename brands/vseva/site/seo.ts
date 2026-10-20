// Per-page metadata for the public website. Used by the pages (document.title on client visits) and by
// scripts/prerender.mjs, which writes it into each page's static HTML along with the structured data.
import { CONTACT, SITE_URL } from './content';

export type PublicPath = '/' | '/documentation' | '/contact' | '/support-us';

export const PAGE_META: Record<PublicPath, { title: string; description: string; crumb?: string }> = {
  '/': {
    title: 'vSeva – Vihar Seva management app for Jain Vihar Seva groups',
    description:
      'vSeva helps Jain Vihar Seva groups record Vihars, manage Sevaks, approve entries and follow kilometres, Sankalp and statistics through the Vihar Year.',
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
};

export const canonical = (path: PublicPath) => (path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`);

const organization = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'vSeva',
  alternateName: 'vSeva - VJAS',
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/vseva-og-preview.png`,
  sameAs: [CONTACT.instagramUrl, CONTACT.youtubeUrl],
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

// Only facts that are true and visible on the pages: no ratings, prices or reviews.
export const structuredData = (path: PublicPath) => {
  const graph: object[] = [organization];
  if (path === '/') {
    graph.push(
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: 'vSeva', publisher: { '@id': `${SITE_URL}/#organization` }, inLanguage: 'en-IN' },
      {
        '@type': 'SoftwareApplication',
        name: 'vSeva',
        url: `${SITE_URL}/`,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Android, Web',
        description: PAGE_META['/'].description,
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    );
  } else {
    graph.push(breadcrumb(path));
  }
  return { '@context': 'https://schema.org', '@graph': graph };
};
