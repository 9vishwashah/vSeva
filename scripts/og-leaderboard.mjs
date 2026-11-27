// Link preview for /leaderboard with the CURRENT top 3, drawn at build time (scripts/prerender.mjs calls this).
// The artwork without names is scripts/site-sources/og-leaderboard-base.png (made from og-leaderboard.html); this
// writes the period ("Leaderboard · VY 2026-27") and the three names with their Vihar counts onto the podium, using
// sharp's own text renderer with the vSeva fonts in scripts/og-fonts (TTF, from Google Fonts, SIL Open Font License),
// so no browser or extra package is needed on the build machine.
import path from 'node:path';
import sharp from 'sharp';

const FONTS = (root) => ({
  display: { file: path.join(root, 'scripts/og-fonts/BricolageGrotesque-ExtraBold.ttf'), name: 'Bricolage Grotesque 96pt SemiCondensed ExtraBold' },
  text: { file: path.join(root, 'scripts/og-fonts/Geist-SemiBold.ttf'), name: 'Geist SemiBold' },
  mono: { file: path.join(root, 'scripts/og-fonts/GeistMono-Medium.ttf'), name: 'Geist Mono Medium' },
});

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const km = (k) => (k % 1 ? k.toFixed(1) : String(k));

const textImage = async (markup, font, size, width, align = 'centre') => {
  const { data, info } = await sharp({
    text: { text: markup, font: `${font.name} ${size}`, fontfile: font.file, width, align, wrap: 'word', rgba: true, dpi: 72 },
  }).png().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
};

// The same order as the page: this Vihar Year when at least three Sevaks have Vihars in it, otherwise all time.
// Row: [name, gender, groupIndex, vyVihars, vyKm, allVihars, allKm, ...]
export function topThree(board) {
  const rank = (col, tie) => [...board.sevaks]
    .filter((s) => s[col] > 0)
    .sort((a, b) => b[col] - a[col] || b[tie] - a[tie] || b[5] - a[5] || a[0].localeCompare(b[0]))
    .slice(0, 3);
  const vy = rank(3, 4);
  if (vy.length >= 3 && board.vy?.label) return { label: board.vy.label, rows: vy.map((s) => ({ name: s[0], vihars: s[3], km: s[4] })) };
  return { label: 'All time', rows: rank(5, 6).map((s) => ({ name: s[0], vihars: s[5], km: s[6] })) };
}

// Podium places on the 1200 x 630 artwork: column centre and the y the name block must end above (bar top, or the
// crown above #1)
const SPOTS = [
  { place: 1, x: 887, bottom: 248 },
  { place: 2, x: 719, bottom: 364 },
  { place: 3, x: 1055, bottom: 414 },
];

export async function drawLeaderboardOg(board, outFile, root) {
  const fonts = FONTS(root);
  const { label, rows } = topThree(board);
  if (rows.length === 0) throw new Error('no ranked Sevaks');
  const layers = [];

  // "LEADERBOARD · VY 2026-27" under the logo
  const eyebrow = await textImage(
    `<span foreground="#A44E07" letter_spacing="3200">LEADERBOARD · ${esc(label.toUpperCase())}</span>`,
    fonts.mono, 19, 560, 'left',
  );
  layers.push({ input: eyebrow.data, left: 74, top: 146 });

  for (const spot of SPOTS) {
    const r = rows[spot.place - 1];
    if (!r) continue;
    const name = r.name.length > 26 ? `${r.name.slice(0, 25).trim()}…` : r.name;
    const nameImg = await textImage(`<span foreground="#1D1D1B">${esc(name)}</span>`, fonts.display, 31, 196);
    const count = await textImage(`<span foreground="#57534B">${r.vihars} ${r.vihars === 1 ? 'Vihar' : 'Vihars'} · ${km(r.km)} km</span>`, fonts.text, 19, 220);
    const gap = 4;
    const top = spot.bottom - (nameImg.height + gap + count.height);
    layers.push({ input: nameImg.data, left: Math.round(spot.x - nameImg.width / 2), top });
    layers.push({ input: count.data, left: Math.round(spot.x - count.width / 2), top: top + nameImg.height + gap });
  }

  await sharp(path.join(root, 'scripts/site-sources/og-leaderboard-base.png'))
    .composite(layers)
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(outFile);
  return { label, names: rows.map((r) => r.name) };
}
