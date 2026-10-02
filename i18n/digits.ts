import { Lang } from './translations';

// Devanagari (Hindi) and Gujarati digit blocks, 0-9 respectively.
const DIGIT_MAPS: Partial<Record<Lang, string[]>> = {
  hi: ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'],
  gu: ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'],
};

// Converts any ASCII 0-9 digits inside a number/string to the given
// language's native script digits. Leaves '.', '-', and everything else
// untouched, so decimals, negative values, and units (e.g. "12.5 km") still
// read correctly after conversion.
export function toLocaleDigits(value: number | string, lang: Lang): string {
  const str = String(value);
  const map = DIGIT_MAPS[lang];
  if (!map) return str;
  return str.replace(/[0-9]/g, d => map[Number(d)]);
}
