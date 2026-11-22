import type { Brand } from '../../brands/types';

// vSeva Design Core: brand-aware theme.
// Both apps (vSeva and SSG) share one palette. Only the identity comes from the existing BRAND object
// (one brand per build via VITE_BRAND, imported from '@brand'); no new brand switch is introduced.

export interface BrandIdentity {
  name: string;        // header name (short form)
  logo: string;        // header / login logo
  logoPadded: boolean; // vSeva's logo art has transparent padding and is scaled up
  statusBar: string;   // browser and Android status-bar colour (BRAND.themeColor)
}

export const brandIdentity = (b: Pick<Brand, 'shortName' | 'logo' | 'logoPadded' | 'themeColor'>): BrandIdentity => ({
  name: b.shortName,
  logo: b.logo,
  logoPadded: b.logoPadded,
  statusBar: b.themeColor,
});

// The same tokens as tailwind.config.js, for places that need raw values (charts, canvas, inline styles)
export const CORE_COLORS = {
  canvas: '#F2EEE7',
  surface: '#FBFAF7',
  sunken: '#E9E3D8',
  line: '#DDD5C7',
  ink: '#1D1D1B',
  ink2: '#57534B',
  ink3: '#6F6A60',
  brand: '#E8730C',
  brandPressed: '#CF6409',
  brandSoft: '#FCE2CC',
  brandTint: '#FFF4EA',
  brandDeep: '#A44E07',
  sky: '#9ED6DF',
  tea: '#245E55',
  lavender: '#808BC5',
  mustard: '#EAC119',
  pink: '#EAA7C7',
  seashell: '#EAE4DA',
  ok: '#1F6B5F',
  okSoft: '#D9EAE5',
  warn: '#6B5409',
  warnSoft: '#F7E9B8',
  err: '#B33A39',
  errSoft: '#F6DCDA',
  errSolid: '#C63F3E',
  info: '#1E5A66',
  infoSoft: '#DCEFF2',
} as const;

// Fonts the Design Core needs (to be added to each brand's fontsHref in Phase 2)
export const CORE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,700;12..96,75..100,800' +
  '&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500' +
  '&family=Noto+Sans+Gujarati:wght@400;500;700&family=Noto+Sans+Devanagari:wght@400;500;700&display=swap';
