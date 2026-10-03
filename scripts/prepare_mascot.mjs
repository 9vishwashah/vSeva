// Cuts the SSG mascot sprite sheet (checkerboard baked in, no alpha) into transparent poses.
//   node scripts/prepare_mascot.mjs <sprite-sheet.webp>
// Output: brands/ssg/assets/mascot/*.webp (committed — builds never run this).
//
// Method: the "transparency" is a two-tone grey checkerboard. Flood-fill from the image
// border through checker-coloured pixels only; the figures' own dark outline stops the fill,
// so white robes/hair inside the outline are kept. Edges are then eroded 1px and feathered.

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
if (!src) { console.error('usage: prepare_mascot.mjs <sprite-sheet>'); process.exit(2); }
const outDir = path.resolve(import.meta.dirname, '../brands/ssg/assets/mascot');
fs.mkdirSync(outDir, { recursive: true });

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const idx = (x, y) => (y * W + x) * 4;

// A pixel is "checker" if it is neutral grey and close to one of the two checker tones.
const TONES = [133, 140, 195, 200];
const isChecker = (i) => {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  if (Math.max(r, g, b) - Math.min(r, g, b) > 9) return false;
  const v = (r + g + b) / 3;
  return TONES.some((t) => Math.abs(v - t) <= 16);
};

const bg = new Uint8Array(W * H);
const stack = [];
const push = (x, y) => {
  const p = y * W + x;
  if (!bg[p] && isChecker(p * 4)) { bg[p] = 1; stack.push(p); }
};
for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
while (stack.length) {
  const p = stack.pop();
  const x = p % W, y = (p / W) | 0;
  if (x > 0) push(x - 1, y);
  if (x < W - 1) push(x + 1, y);
  if (y > 0) push(x, y - 1);
  if (y < H - 1) push(x, y + 1);
}

// alpha: 0 for background; erode 1px into the figure to drop checker-coloured fringe
const alpha = new Uint8Array(W * H);
for (let p = 0; p < W * H; p++) alpha[p] = bg[p] ? 0 : 255;
const eroded = Uint8Array.from(alpha);
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  const p = y * W + x;
  if (alpha[p] && (!alpha[p - 1] || !alpha[p + 1] || !alpha[p - W] || !alpha[p + W])) eroded[p] = 0;
}
const rgba = Buffer.from(data);
for (let p = 0; p < W * H; p++) rgba[p * 4 + 3] = eroded[p];

// feather the edge slightly via a blurred alpha
const { data: blurred, info: bi } = await sharp(Buffer.from(eroded), { raw: { width: W, height: H, channels: 1 } }).blur(0.8).raw().toBuffer({ resolveWithObject: true });
for (let p = 0; p < W * H; p++) rgba[p * 4 + 3] = blurred[p * bi.channels];


// Drop stray specks: keep only connected opaque regions of real size.
const A = (p) => rgba[p * 4 + 3];
const label = new Int32Array(W * H);
const regions = [];
for (let p0 = 0; p0 < W * H; p0++) {
  if (label[p0] || A(p0) < 40) continue;
  const id = regions.length + 1, st = [p0]; label[p0] = id;
  let area = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
  while (st.length) {
    const p = st.pop(); area++;
    const x = p % W, y = (p / W) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    for (const q of [p - 1, p + 1, p - W, p + W]) {
      if (q >= 0 && q < W * H && !label[q] && A(q) >= 40 && Math.abs((q % W) - x) <= 1) { label[q] = id; st.push(q); }
    }
  }
  regions.push({ id, area, x0, y0, x1, y1 });
}
const keep = new Set(regions.filter((r) => r.area > 2500).map((r) => r.id));
for (let p = 0; p < W * H; p++) if (!keep.has(label[p])) rgba[p * 4 + 3] = 0;
console.log('regions kept:', keep.size, 'of', regions.length);

// Poses used by the landing page (1-based, row-major in the 5x2 sheet):
//   walkA=2, walkB=3 (strides, facing right — mirrored in CSS), wave=1, namaste=5
const POSES = { walkA: 2, walkB: 3, wave: 1, namaste: 5 };
const cellW = W / 5, cellH = H / 2;
const boxes = {};
for (const [name, n] of Object.entries(POSES)) {
  const col = (n - 1) % 5, row = Math.floor((n - 1) / 5);
  // the kept region whose centre falls in this grid cell (largest wins) — never neighbouring slivers
  const cands = regions.filter((r) => keep.has(r.id)).filter((r) => {
    const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
    return cx >= col * cellW && cx < (col + 1) * cellW && cy >= row * cellH && cy < (row + 1) * cellH;
  }).sort((p, q) => q.area - p.area);
  const r = cands[0];
  if (!r) throw new Error('no figure found for pose ' + name);
  boxes[name] = { id: r.id, x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, w: r.x1 - r.x0 + 1, h: r.y1 - r.y0 + 1 };
}
// One common canvas so frames swap without jumping: bottom-centre aligned, same scale.
const CW = Math.max(...Object.values(boxes).map((b) => b.w));
const CH = Math.max(...Object.values(boxes).map((b) => b.h));
console.log("boxes", JSON.stringify(boxes));
const OUT_H = 420; // px tall in the file (shown at ~110–230 css px)
for (const [name, b] of Object.entries(boxes)) {
  // copy the pose's pixels onto the shared canvas, bottom-centre aligned
  const canvas = Buffer.alloc(CW * CH * 4);
  const ox = Math.round((CW - b.w) / 2), oy = CH - b.h;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const from = ((b.y0 + y) * W + (b.x0 + x)) * 4, to = ((oy + y) * CW + (ox + x)) * 4;
    if (label[from / 4] !== b.id) continue;
    canvas[to] = rgba[from]; canvas[to + 1] = rgba[from + 1]; canvas[to + 2] = rgba[from + 2]; canvas[to + 3] = rgba[from + 3];
  }
  const out = await sharp(canvas, { raw: { width: CW, height: CH, channels: 4 } })
    .resize({ height: OUT_H })
    .webp({ quality: 82, alphaQuality: 90 })
    .toBuffer();
  fs.writeFileSync(path.join(outDir, name + '.webp'), out);
  console.log(name, b.w + 'x' + b.h, (out.length / 1024).toFixed(0) + 'KB');
}
console.log('canvas', CW + 'x' + CH, '-> aspect (w/h)', (CW / CH).toFixed(3));
