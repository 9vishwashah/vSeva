// Everything that differs between white-labelled deployments of this app.
//
// One build = one brand, chosen with VITE_BRAND. vite.config.ts aliases `@brand`
// to brands/<id>/, so application code does `import { BRAND } from '@brand'` and
// never hard-codes a product name, logo, contact or link. The same data
// (`BrandMeta`, in brands/<id>/meta.ts) also feeds index.html, the PWA manifest,
// robots/sitemap — so the page title, link previews and installed-app name can
// never disagree with what the UI says.
export type BrandId = 'vseva' | 'ssg';

export interface BrandMeta {
  id: BrandId;
  // Value stored in organizations.brand / registration_requests.brand.
  // null is the original product (vSeva) — existing rows have no brand.
  dbBrand: string | null;

  name: string;          // "vSeva" / "Shraman Seva Group"
  shortName: string;     // compact label for tight spaces
  slogan: string;        // one-line tagline
  byline: string;        // footer / PDF credit line
  cardCredit: string | null; // small line under the name on shareable cards (null = none)
  // "Designed by …" credit shown in app footers; null = no credit line.
  designer: { name: string; org: string } | null;
  legalFooter: string;   // credit line at the foot of the privacy / deletion pages
  // Which translation key labels the "create an account" link on the login screen.
  registerLabelKey: 'login.registerOrg' | 'login.createCaptain';
  usernameHint: string;  // placeholder on the forgot-password field
  examples: { username: string; mobile: string }; // placeholder text on Login / Register
  description: string;   // default meta description
  finderName: string;    // the public "nearby Derasar" tool
  directoryName: string; // the public community directory

  // Absolute origin of THIS deployment, no trailing slash ('' if not set at build time).
  siteUrl: string;
  host: string;          // display form of siteUrl, e.g. "vseva.vjas.in"

  themeColor: string;
  backgroundColor: string;
  defaultLang: 'en' | 'gu' | 'hi';

  contact: {
    whatsapp: string;    // digits only, with country code
    email: string;
    demoContact: string; // named in the Captain approval message
  };
  instagram: { url: string; handle: string } | null;
  operator: string;      // who runs the service, for the legal pages
  // Show the shared Directory moderation panel inside Super Admin
  // (platform-owner scope only, whatever this says).
  showsDirectoryAdmin: boolean;

  // Document head / PWA
  htmlTitle: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  iconPath: string;      // favicon / notification icon, served from public/
  appleTouchIconPath: string; // iOS Home Screen icon, served from public/
  ogImagePath: string;   // link-preview image, served from public/
  ogImageSize: [number, number];
  schemaLogoPath: string; // logo named in the schema.org Organization block
  altName: string | null; // schema.org alternateName
  schemaContactPath: string | null; // schema.org ContactPoint url (path), if the site has a contact section
  googleVerification: string | null;
  fontsHref: string;     // Google Fonts stylesheet
  includeAssets: string[]; // public/ files the service worker should precache
}

// BrandMeta + the artwork that has to be imported through the bundler.
export interface Brand extends BrandMeta {
  logo: string;      // small mark for headers/icons
  logoFull: string;  // large logo for landing/login
  // The vSeva artwork has transparent padding that the UI compensates for with a
  // CSS scale; brands with tightly cropped art set this false.
  logoPadded: boolean;
}

export type Env = Record<string, string | undefined>;
