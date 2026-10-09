import { BRAND } from '@brand';
import type { AreaRoute } from '../types';

// Google Maps' "Share" button copies text like "Check out this route https://maps.app.goo.gl/xyz", so take
// the first https link out of whatever was pasted. Returns null when there is none.
export function extractMapsUrl(pasted: string): string | null {
  const match = (pasted || '').match(/https:\/\/[^\s<>"']+/i);
  return match ? match[0].replace(/[),.;]+$/, '') : null;
}

export const formatRoute = (r: Pick<AreaRoute, 'from_name' | 'to_name' | 'via'>) =>
  r.via ? `${r.from_name} → ${r.to_name} (via ${r.via})` : `${r.from_name} → ${r.to_name}`;

// The message a Captain sends to the Vihar group on WhatsApp for one route.
export function routeWhatsAppMessage(r: AreaRoute, groupName?: string): string {
  const lines = [
    '*Vihar Route*',
    '',
    `*From:* ${r.from_name}`,
    `*To:* ${r.to_name}`,
  ];
  if (r.via) lines.push(`*Via:* ${r.via}`);
  if (r.distance_km) lines.push(`*Distance:* ${r.distance_km} km`);
  if (r.maps_url) lines.push('', `*Route map:* ${r.maps_url}`);
  lines.push('', groupName ? `${groupName} · ${BRAND.name}` : BRAND.name);
  return lines.join('\n');
}
