// Draws a Seva Achievement card straight onto a <canvas>: a clean graphic made for sharing (Instagram Story
// 1080x1920 or square 1080x1080), never a screenshot of the page. Drawing it ourselves (instead of html2canvas)
// keeps the output pixel-exact and identical on web and in the Android WebView, and the preview in the share
// sheet IS this same image. Loaded on demand by the share sheet, so none of it is in the startup bundle.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Footprints, Medal, Route, Target, Flame, Sunrise } from 'lucide-react';
import type { Achievement, CardIcon } from './achievements';

export type CardFormat = 'story' | 'square';
export const CARD_SIZES: Record<CardFormat, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
};

export interface CardIdentity {
  primary: string;    // Sevak name (or the Group name for a Captain's group card)
  secondary: string;  // Group name (or the Group's city on a group card), '' = none
  captain: string;    // Captain's name, shown as "Captain <name>"; '' = none
  vyLabel: string;    // "VY 2026-27"
  brandName: string;  // footer
}

export interface CardAssets {
  // opaque = the art has its own (white) background, so it is shown as a rounded app-icon tile
  logo: { img: HTMLImageElement; sx: number; sy: number; sw: number; sh: number; opaque: boolean } | null;
  icons: Partial<Record<CardIcon, HTMLImageElement>>;
  avatar: HTMLImageElement | null;
}

// The app's own palette (Tailwind saffron + the Dashboard's ink/muted text colours).
const C = {
  ink: '#241C17',
  muted: '#8A6A57',
  accent: '#DE6B38',
  deep: '#B5542A',
  soft: '#FFF0E5',
};
const FONT = 'Manrope, "Noto Sans Gujarati", "Noto Sans Devanagari", Roboto, "Segoe UI", system-ui, sans-serif';
const font = (weight: number, px: number) => `${weight} ${Math.round(px)}px ${FONT}`;

// ---------------------------------------------------------------------------------------------------------------
// Assets

const ICONS = { footprints: Footprints, medal: Medal, route: Route, target: Target, flame: Flame, sunrise: Sunrise };

function loadImage(src: string, crossOrigin = false, timeoutMs = 8000): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    img.onload = () => { window.clearTimeout(timer); resolve(img); };
    img.onerror = () => { window.clearTimeout(timer); resolve(null); };
    img.src = src;
  });
}

// The logo art has transparent padding; find the visible part so it can be sized by what you actually see.
function trimmedBounds(img: HTMLImageElement) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const full = { img, sx: 0, sy: 0, sw: w, sh: h, opaque: false };
  try {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return full;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, w, h);
    const corner = (x: number, y: number) => data[(y * w + x) * 4 + 3];
    if ([corner(0, 0), corner(w - 1, 0), corner(0, h - 1), corner(w - 1, h - 1)].every(a => a > 245)) return { ...full, opaque: true };
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 10) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return full;
    return { img, sx: x0, sy: y0, sw: x1 - x0 + 1, sh: y1 - y0 + 1, opaque: false };
  } catch {
    return full;
  }
}

// A photo from another origin can only be drawn if the server allows it; otherwise the canvas could not be
// exported at all. Check on a scratch canvas and drop the photo rather than break the card.
function canExport(img: HTMLImageElement): boolean {
  try {
    const c = document.createElement('canvas');
    c.width = 2; c.height = 2;
    const ctx = c.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, 2, 2);
    ctx.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    return false;
  }
}

async function waitForFonts() {
  if (!document.fonts?.load) return;
  const loads = [800, 700, 600].map(w => document.fonts.load(`${w} 64px Manrope`).catch(() => []));
  await Promise.race([Promise.all(loads), new Promise(r => window.setTimeout(r, 2500))]);
}

export async function loadCardAssets(logoUrl: string, avatarUrl?: string | null): Promise<CardAssets> {
  const iconEntries = Object.entries(ICONS).map(async ([key, Icon]) => {
    const svg = renderToStaticMarkup(createElement(Icon, { size: 96, color: C.deep, strokeWidth: 2 }));
    const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    return [key, img] as const;
  });
  const [logoImg, avatarImg, icons] = await Promise.all([
    loadImage(logoUrl),
    avatarUrl ? loadImage(avatarUrl, true) : Promise.resolve(null),
    Promise.all(iconEntries),
    waitForFonts(),
  ]);
  const iconMap: CardAssets['icons'] = {};
  icons.forEach(([k, img]) => { if (img) iconMap[k as CardIcon] = img; });
  return {
    logo: logoImg ? trimmedBounds(logoImg) : null,
    icons: iconMap,
    avatar: avatarImg && canExport(avatarImg) ? avatarImg : null,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Text helpers (all measured, so nothing is ever clipped: long text shrinks, then wraps, then ellipsises)

type Ctx = CanvasRenderingContext2D;

function spacedWidth(ctx: Ctx, text: string, spacing: number) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width;
  return w + spacing * Math.max(0, [...text].length - 1);
}

// Letter-spaced labels are drawn glyph by glyph so the spacing is identical in every browser/WebView.
function drawSpaced(ctx: Ctx, text: string, cx: number, y: number, spacing: number) {
  let x = cx - spacedWidth(ctx, text, spacing) / 2;
  ctx.textAlign = 'left';
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = 'center';
}

function fitSize(ctx: Ctx, text: string, weight: number, start: number, min: number, maxWidth: number, spacingEm = 0) {
  let px = start;
  while (px > min) {
    ctx.font = font(weight, px);
    if (spacedWidth(ctx, text, px * spacingEm) <= maxWidth) break;
    px -= 2;
  }
  return Math.max(px, min);
}

function ellipsize(ctx: Ctx, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function wrap(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (!line || ctx.measureText(test).width <= maxWidth) line = test;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  // Too many lines: everything left over joins the last allowed line, which then ends in an ellipsis.
  if (lines.length > maxLines) lines.splice(maxLines - 1, lines.length, lines.slice(maxLines - 1).join(' ') + '…');
  return lines.map(l => ellipsize(ctx, l, maxWidth));
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------------------------------------------------------
// Hero blocks. Each returns its height; with draw=false it only measures (used to fit and centre it).

interface HeroCtx { ctx: Ctx; cx: number; maxW: number; k: number; compact: boolean }

function heroNumber(h: HeroCtx, a: Achievement & { hero: { type: 'number' } }, top: number, draw: boolean) {
  const { ctx, cx, maxW, k, compact } = h;
  let y = top;
  const valuePx = fitSize(ctx, a.hero.value, 800, (compact ? 300 : 500) * k, 110 * k, maxW);
  ctx.font = font(800, valuePx);
  const m = ctx.measureText(a.hero.value);
  const asc = m.actualBoundingBoxAscent || valuePx * 0.72;
  if (draw) { ctx.fillStyle = C.accent; ctx.fillText(a.hero.value, cx, y + asc); }
  y += asc + (m.actualBoundingBoxDescent || 0) + (compact ? 30 : 44) * k;

  const unitPx = fitSize(ctx, a.hero.unit, 800, (compact ? 36 : 50) * k, 22 * k, maxW, 0.22);
  ctx.font = font(800, unitPx);
  if (draw) { ctx.fillStyle = C.ink; drawSpaced(ctx, a.hero.unit, cx, y + unitPx * 0.74, unitPx * 0.22); }
  y += unitPx;
  return y - top;
}

function heroRing(h: HeroCtx, a: Achievement & { hero: { type: 'ring' } }, top: number, draw: boolean) {
  const { ctx, cx, maxW, k, compact } = h;
  const d = (compact ? 340 : 560) * k;
  const stroke = (compact ? 22 : 30) * k;
  const r = (d - stroke) / 2;
  const cy = top + d / 2;
  if (draw) {
    ctx.lineCap = 'round';
    ctx.lineWidth = stroke;
    ctx.strokeStyle = 'rgba(222,107,56,0.14)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    if (a.hero.progress > 0) {
      ctx.strokeStyle = C.accent;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.01, a.hero.progress));
      ctx.stroke();
    }
    const valuePx = fitSize(ctx, a.hero.value, 800, (compact ? 116 : 190) * k, 60 * k, d * 0.66);
    ctx.font = font(800, valuePx);
    ctx.fillStyle = C.ink;
    const detailPx = (compact ? 24 : 34) * k;
    ctx.fillText(a.hero.value, cx, cy + valuePx * 0.28 - detailPx * 0.5);
    ctx.font = font(700, detailPx);
    ctx.fillStyle = C.muted;
    ctx.fillText(ellipsize(ctx, a.hero.detail, d * 0.7), cx, cy + valuePx * 0.28 + detailPx * 1.05);
  }
  let y = top + d + (compact ? 30 : 48) * k;
  const unitPx = fitSize(ctx, a.hero.unit, 800, (compact ? 30 : 42) * k, 20 * k, maxW, 0.2);
  ctx.font = font(800, unitPx);
  if (draw) { ctx.fillStyle = C.ink; drawSpaced(ctx, a.hero.unit, cx, y + unitPx * 0.74, unitPx * 0.2); }
  y += unitPx;
  return y - top;
}

function heroSummary(h: HeroCtx, a: Achievement & { hero: { type: 'summary' } }, top: number, draw: boolean) {
  const { ctx, cx, maxW, k, compact } = h;
  let y = top;
  const titlePx = (compact ? 30 : 40) * k;
  ctx.font = font(800, titlePx);
  if (draw) { ctx.fillStyle = C.accent; drawSpaced(ctx, a.hero.title, cx, y + titlePx * 0.74, titlePx * 0.24); }
  y += titlePx + (compact ? 14 : 22) * k;

  const periodPx = fitSize(ctx, a.hero.period, 800, (compact ? 104 : 150) * k, 60 * k, maxW);
  ctx.font = font(800, periodPx);
  if (draw) { ctx.fillStyle = C.ink; ctx.fillText(a.hero.period, cx, y + periodPx * 0.74); }
  y += periodPx * 0.8 + (compact ? 40 : 76) * k;

  // 2 x 2 grid with hairlines between cells
  const colW = maxW / 2;
  const valueStart = (compact ? 64 : 96) * k;
  const labelPx = (compact ? 22 : 30) * k;
  const rowH = valueStart * 0.78 + (compact ? 14 : 20) * k + labelPx;
  const rowGap = (compact ? 30 : 56) * k;
  const stats = a.hero.stats.slice(0, 4);
  const valuePx = Math.min(...stats.map(s => fitSize(ctx, s.value, 800, valueStart, 36 * k, colW - 40 * k)));
  if (draw) {
    stats.forEach((s, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = cx - maxW / 2 + colW * col + colW / 2;
      const ry = y + row * (rowH + rowGap);
      ctx.font = font(800, valuePx);
      ctx.fillStyle = C.ink;
      ctx.fillText(s.value, x, ry + valuePx * 0.76);
      ctx.font = font(700, labelPx);
      ctx.fillStyle = C.muted;
      ctx.fillText(ellipsize(ctx, s.label, colW - 30 * k), x, ry + valueStart * 0.78 + (compact ? 14 : 20) * k + labelPx * 0.8);
    });
    ctx.strokeStyle = 'rgba(222,107,56,0.18)';
    ctx.lineWidth = 2 * k;
    ctx.beginPath();
    ctx.moveTo(cx, y); ctx.lineTo(cx, y + rowH * 2 + rowGap);
    ctx.moveTo(cx - maxW / 2 + 30 * k, y + rowH + rowGap / 2); ctx.lineTo(cx + maxW / 2 - 30 * k, y + rowH + rowGap / 2);
    ctx.stroke();
  }
  y += rowH * 2 + rowGap;

  if (a.hero.footnote) {
    const fnPx = (compact ? 24 : 32) * k;
    y += (compact ? 26 : 44) * k;
    ctx.font = font(700, fnPx);
    if (draw) { ctx.fillStyle = C.deep; ctx.fillText(a.hero.footnote, cx, y + fnPx * 0.76); }
    y += fnPx;
  }
  return y - top;
}

function layoutHero(h: HeroCtx, a: Achievement, top: number, draw: boolean, captionLines: string[], captionPx: number) {
  let height: number;
  if (a.hero.type === 'number') height = heroNumber(h, a as any, top, draw);
  else if (a.hero.type === 'ring') height = heroRing(h, a as any, top, draw);
  else height = heroSummary(h, a as any, top, draw);

  if (captionLines.length) {
    const lh = captionPx * 1.32;
    let y = top + height + (h.compact ? 26 : 46) * h.k;
    h.ctx.font = font(600, captionPx);
    captionLines.forEach(line => {
      if (draw) { h.ctx.fillStyle = C.muted; h.ctx.fillText(line, h.cx, y + captionPx * 0.8); }
      y += lh;
    });
    height = y - top;
  }
  return height;
}

// ---------------------------------------------------------------------------------------------------------------

export function renderAchievementCard(
  canvas: HTMLCanvasElement,
  a: Achievement,
  who: CardIdentity,
  assets: CardAssets,
  format: CardFormat,
  scale = 1,
) {
  const { w: W0, h: H0 } = CARD_SIZES[format];
  const W = Math.round(W0 * scale), H = Math.round(H0 * scale);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  const s = scale;
  const compact = format === 'square';
  const cx = W / 2;
  const pad = (compact ? 72 : 88) * s;
  const maxW = W - pad * 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Background: warm ivory, lighter towards the bottom
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#FFF1E4');
  bg.addColorStop(0.55, '#FFF8F1');
  bg.addColorStop(1, '#FFFCF8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ---- Top: logo + badge
  let y = (compact ? 60 : 108) * s;
  if (assets.logo?.opaque) {
    const { img, sx, sy, sw, sh } = assets.logo;
    const t = (compact ? 96 : 150) * s;
    ctx.save();
    ctx.shadowColor = 'rgba(181,84,42,0.18)';
    ctx.shadowBlur = 24 * s;
    ctx.shadowOffsetY = 8 * s;
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, cx - t / 2, y, t, t, t * 0.26);
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, cx - t / 2, y, t, t, t * 0.26);
    ctx.clip();
    const side = Math.min(sw, sh);
    ctx.drawImage(img, sx + (sw - side) / 2, sy + (sh - side) / 2, side, side, cx - t / 2, y, t, t);
    ctx.restore();
    y += t;
  } else if (assets.logo) {
    const { img, sx, sy, sw, sh } = assets.logo;
    const lh = (compact ? 84 : 128) * s;
    const lw = Math.min(lh * (sw / sh), maxW * 0.6);
    const realH = lw * (sh / sw);
    ctx.drawImage(img, sx, sy, sw, sh, cx - lw / 2, y, lw, realH);
    y += realH;
  }
  y += (compact ? 30 : 56) * s;
  const badgeH = (compact ? 54 : 72) * s;
  const badgePx = (compact ? 21 : 27) * s;
  ctx.font = font(800, badgePx);
  const badgeTextW = spacedWidth(ctx, a.badge, badgePx * 0.2);
  const iconSize = badgeH * 0.5;
  const badgeW = badgeTextW + iconSize + badgeH * 0.42 + badgeH * 0.9;
  ctx.fillStyle = C.soft;
  roundRect(ctx, cx - badgeW / 2, y, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(222,107,56,0.22)';
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  const icon = assets.icons[a.icon];
  const contentX = cx - badgeW / 2 + badgeH * 0.45;
  if (icon) ctx.drawImage(icon, contentX, y + (badgeH - iconSize) / 2, iconSize, iconSize);
  ctx.fillStyle = C.deep;
  drawSpaced(ctx, a.badge, contentX + iconSize + badgeH * 0.42 + badgeTextW / 2, y + badgeH / 2 + badgePx * 0.36, badgePx * 0.2);
  const topEnd = y + badgeH;

  // ---- Bottom (measured upwards): footer, Vihar Year, Captain, group, name, photo
  let b = H - (compact ? 52 : 84) * s;
  const footerPx = (compact ? 20 : 26) * s;
  ctx.font = font(700, footerPx);
  ctx.fillStyle = 'rgba(138,106,87,0.75)';
  ctx.fillText(ellipsize(ctx, who.brandName, maxW), cx, b);
  b -= footerPx + (compact ? 34 : 60) * s;

  const vyPx = (compact ? 20 : 26) * s;
  const vyH = (compact ? 44 : 56) * s;
  ctx.font = font(800, vyPx);
  const vyW = spacedWidth(ctx, who.vyLabel, vyPx * 0.12) + vyH * 0.9;
  ctx.fillStyle = C.ink;
  roundRect(ctx, cx - vyW / 2, b - vyH, vyW, vyH, vyH / 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  drawSpaced(ctx, who.vyLabel, cx, b - vyH / 2 + vyPx * 0.36, vyPx * 0.12);
  b -= vyH + (compact ? 22 : 34) * s;

  const secPx = (compact ? 27 : 36) * s;
  if (who.captain) {
    // "Captain" in the muted label colour, the name in the brand's deep saffron
    const capPx = secPx * 0.94;
    const label = 'Captain ';
    ctx.font = font(600, capPx);
    const labelW = ctx.measureText(label).width;
    ctx.font = font(800, capPx);
    const name = ellipsize(ctx, who.captain, maxW - labelW);
    const nameW = ctx.measureText(name).width;
    const x0 = cx - (labelW + nameW) / 2;
    ctx.textAlign = 'left';
    ctx.font = font(600, capPx);
    ctx.fillStyle = C.muted;
    ctx.fillText(label, x0, b);
    ctx.font = font(800, capPx);
    ctx.fillStyle = C.deep;
    ctx.fillText(name, x0 + labelW, b);
    ctx.textAlign = 'center';
    b -= capPx * 1.35;
  }
  ctx.font = font(600, secPx);
  const secLines = who.secondary ? wrap(ctx, who.secondary, maxW, compact ? 1 : 2) : [];
  ctx.fillStyle = C.muted;
  for (let i = secLines.length - 1; i >= 0; i--) {
    ctx.fillText(secLines[i], cx, b);
    b -= secPx * 1.3;
  }
  if (secLines.length) b -= (compact ? 2 : 6) * s;

  // A long name first shrinks a little, then wraps onto a second line (only then is it shortened).
  const namePx = fitSize(ctx, who.primary, 800, (compact ? 46 : 64) * s, (compact ? 38 : 52) * s, maxW);
  ctx.font = font(800, namePx);
  ctx.fillStyle = C.ink;
  const nameLines = wrap(ctx, who.primary, maxW, compact ? 1 : 2);
  for (let i = nameLines.length - 1; i >= 0; i--) {
    ctx.fillText(nameLines[i], cx, b);
    b -= i > 0 ? namePx * 1.12 : namePx;
  }

  if (assets.avatar) {
    const d = (compact ? 132 : 210) * s;
    b -= (compact ? 18 : 30) * s;
    const ay = b - d;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, ay + d / 2, d / 2 + (compact ? 7 : 10) * s, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.lineWidth = 4 * s; ctx.strokeStyle = 'rgba(222,107,56,0.45)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, ay + d / 2, d / 2, 0, Math.PI * 2); ctx.clip();
    const img = assets.avatar;
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, cx - d / 2, ay, d, d);
    ctx.restore();
    b = ay - (compact ? 6 : 8) * s;
  }

  // short divider between the achievement and the person
  b -= (compact ? 30 : 52) * s;
  ctx.fillStyle = 'rgba(222,107,56,0.4)';
  roundRect(ctx, cx - 36 * s, b - 4 * s, 72 * s, 4 * s, 2 * s);
  ctx.fill();
  const bottomStart = b - 4 * s;

  // ---- Hero, centred in the space between, shrunk if it would not fit
  const avail = bottomStart - topEnd - (compact ? 40 : 90) * s;
  let k = s;
  let captionPx = (compact ? 32 : 46) * s;
  let captionLines: string[] = [];
  let heroH = 0;
  const h: HeroCtx = { ctx, cx, maxW, k, compact };
  const captionBase = a.hero.type === 'summary' ? (compact ? 28 : 40) : (compact ? 32 : 46);
  for (let i = 0; i < 8; i++) {
    h.k = k;
    captionPx = captionBase * k;
    ctx.font = font(600, captionPx);
    captionLines = wrap(ctx, a.caption, maxW * 0.9, 2);
    heroH = layoutHero(h, a, 0, false, captionLines, captionPx);
    if (heroH <= avail) break;
    k *= 0.92;
  }
  const heroTop = topEnd + (bottomStart - topEnd - heroH) / 2;

  // Soft glow + a dotted Vihar route behind the hero (drawn first so they stay underneath)
  const glowY = heroTop + heroH * 0.42;
  const glow = ctx.createRadialGradient(cx, glowY, 0, cx, glowY, W * 0.7);
  glow.addColorStop(0, 'rgba(255,153,71,0.16)');
  glow.addColorStop(1, 'rgba(255,153,71,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  // (not on the summary card, where it would run through the numbers)
  if (a.hero.type !== 'summary') {
  ctx.save();
  ctx.setLineDash([0.1, 26 * s]);
  ctx.lineCap = 'round';
  ctx.lineWidth = 9 * s;
  ctx.strokeStyle = 'rgba(222,107,56,0.16)';
  ctx.beginPath();
  ctx.moveTo(-40 * s, heroTop + heroH * 1.16);
  ctx.bezierCurveTo(W * 0.36, heroTop + heroH * 1.02, W * 0.74, heroTop + heroH * 0.98, W + 40 * s, heroTop + heroH * 0.3);
  ctx.stroke();
  ctx.restore();
  }

  layoutHero(h, a, heroTop, true, captionLines, captionPx);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not create the image'))), 'image/png');
  });
}
