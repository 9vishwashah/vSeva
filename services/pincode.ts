// India PIN code lookup (api.postalpincode.in, India Post data) turned into the fields a person expects.
// The raw data needs care: one PIN lists several post offices (the first is often a small non-delivery
// office, not the area's name), there is no "city" field, and some districts are outdated.

export interface PinDetails {
  state: string;
  district: string;
  city: string;
  town: string;
  /** every area/post office for this PIN, delivery offices first (for suggestions) */
  areas: string[];
}

interface PostOffice { Name: string; BranchType: string; DeliveryStatus: string; Block: string; Division: string; District: string; State: string }

// "Vashi (Thane)" -> "Vashi", "Palghar H.O" -> "Palghar"
const cleanName = (s: string) => s.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+(S\.?O|B\.?O|H\.?O|G\.?P\.?O)\.?$/i, '').replace(/\s+/g, ' ').trim();
const valid = (s?: string) => !!s && s.trim() !== '' && s.trim().toUpperCase() !== 'NA';

// India Post still files some new districts under their parent district. Palghar was carved out of Thane in 2014.
const PALGHAR_TALUKAS = ['palghar', 'vasai', 'dahanu', 'jawhar', 'mokhada', 'talasari', 'vikramgad', 'wada', 'boisar', 'virar', 'nalasopara', 'safale', 'manor'];
function correctDistrict(state: string, district: string, hints: string[]): string {
  if (/^maharashtra$/i.test(state) && /^thane$/i.test(district) && hints.some(h => PALGHAR_TALUKAS.includes(h.toLowerCase()))) return 'Palghar';
  return district;
}

// India Post division names are not city names: "New Mumbai" is Navi Mumbai, "Thane West" is Thane.
const CITY_ALIASES: Record<string, string> = { 'new mumbai': 'Navi Mumbai', 'bombay': 'Mumbai', 'calcutta': 'Kolkata', 'madras': 'Chennai', 'bangalore': 'Bengaluru', 'ahmadabad': 'Ahmedabad' };
function cityFromDivision(division: string): string {
  const base = division.replace(/\b(East|West|North|South|Central|City|Moffusil|Mofussil|Rural|Urban|Division)\b/gi, '').replace(/\s+/g, ' ').trim();
  return CITY_ALIASES[base.toLowerCase()] || base;
}

export async function lookupPin(pin: string): Promise<PinDetails | null> {
  if (!/^[1-9]\d{5}$/.test(pin)) return null;
  const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
  const data = await res.json();
  const offices: PostOffice[] = data?.[0]?.Status === 'Success' ? data[0].PostOffice || [] : [];
  if (!offices.length) return null;

  // A head post office names the main area of its PIN; otherwise the delivery office does; else the first listed.
  const primary = offices.find(o => /^head post office$/i.test(o.BranchType.trim()))
    || offices.find(o => o.DeliveryStatus === 'Delivery')
    || offices[0];
  const state = primary.State;
  const town = cleanName(primary.Name);
  const city = (valid(primary.Block) ? cityFromDivision(cleanName(primary.Block)) : cityFromDivision(primary.Division)) || primary.District;
  const district = correctDistrict(state, primary.District, [primary.Block, town, city].filter(valid) as string[]);
  const areas = Array.from(new Set(
    [...offices].sort((a, b) => Number(b.DeliveryStatus === 'Delivery') - Number(a.DeliveryStatus === 'Delivery')).map(o => cleanName(o.Name)),
  ));
  return { state, district, city, town, areas };
}
