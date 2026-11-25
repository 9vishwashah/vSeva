"""Fit poster-style images onto portrait CR80 NFC cards (53.98 x 85.60 mm) with 3 mm bleed.

Usage: python tools/nfc-card/make_fun_cards.py IMG1 IMG2 ...
Writes tools/nfc-card/fun/card-N.png (600 dpi), preview.png and fun-nfc-cards.pdf (one card per page).
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm as RL_MM

TRIM_W, TRIM_H, BLEED, RADIUS, DPI = 53.98, 85.60, 3.0, 3.18, 600
px = lambda v: round(v / 25.4 * DPI)
W, H = px(TRIM_W + 2 * BLEED), px(TRIM_H + 2 * BLEED)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fun")


def extract(im):
    """If the poster sits on a dark backdrop (e.g. a phone wallpaper), crop to the light card
    and paint its rounded black corners with the card colour. Returns (image, background rgb)."""
    a = np.asarray(im).astype(int)
    L = a.mean(2)
    if L[:8, :8].mean() < 60:  # dark backdrop
        ys, xs = np.where(L > 150)
        inset = int((xs.max() - xs.min()) * 0.025)  # drop the card's own anti-aliased edge
        im = im.crop((xs.min() + inset, ys.min() + inset, xs.max() + 1 - inset, ys.max() + 1 - inset))
        a = np.asarray(im).astype(int)
        h, w = a.shape[:2]
        bg = tuple(int(v) for v in np.median(a[h // 2 - 20:h // 2 + 20, 4:14].reshape(-1, 3), 0))
        # paint only the dark pixels outside the card's rounded-corner arcs
        r = int(w * 0.07)
        yy, xx = np.mgrid[0:h, 0:w]
        dx = np.maximum(np.maximum(r - xx, xx - (w - 1 - r)), 0)
        dy = np.maximum(np.maximum(r - yy, yy - (h - 1 - r)), 0)
        a[(dx ** 2 + dy ** 2 > (r - 2) ** 2) & (a.mean(2) < 170)] = bg
        return Image.fromarray(a.astype("uint8")), bg, True
    else:
        bg = tuple(int(v) for v in np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3)]), 0))
    return im, bg, False


def make_card(path):
    im, bg, grain = extract(Image.open(path).convert("RGB"))
    # fit inside the trim (keeps the poster's own margins), centre it; the rest of the card and the
    # bleed are filled with the poster's paper colour
    tw = px(TRIM_W)
    th = round(im.height * tw / im.width)
    if th > px(TRIM_H):
        th = px(TRIM_H)
        tw = round(im.width * th / im.height)
    art = im.resize((tw, th), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2))
    if grain:  # textured paper: match its grain and feather the join so no seam shows
        a = np.asarray(art).astype(float)
        patch = a[th // 2:th // 2 + 200, 8:60]
        noise = np.random.default_rng(1).normal(0, patch.std(axis=(0, 1)).mean(), (H, W, 1))
        base = np.clip(np.array(bg, float) + noise, 0, 255).astype("uint8")
        card = Image.fromarray(base).filter(ImageFilter.GaussianBlur(1.2))
        f = px(0.6)
        mask = Image.new("L", (tw, th), 0)
        ImageDraw.Draw(mask).rectangle((f, f, tw - 1 - f, th - 1 - f), fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(f / 2))
    else:
        card, mask = Image.new("RGB", (W, H), bg), None
    card.paste(art, ((W - tw) // 2, (H - th) // 2), mask)
    return card


def main(paths):
    os.makedirs(OUT, exist_ok=True)
    cards = [make_card(p) for p in paths]
    pdf = canvas.Canvas(os.path.join(OUT, "fun-nfc-cards.pdf"),
                        pagesize=((TRIM_W + 2 * BLEED) * RL_MM, (TRIM_H + 2 * BLEED) * RL_MM))
    for i, c in enumerate(cards, 1):
        f = os.path.join(OUT, f"card-{i}.png")
        c.save(f, dpi=(DPI, DPI))
        pdf.drawImage(f, 0, 0, (TRIM_W + 2 * BLEED) * RL_MM, (TRIM_H + 2 * BLEED) * RL_MM)
        pdf.showPage()
    pdf.save()

    # preview: trimmed cards with rounded corners side by side
    b, rr = px(BLEED), px(RADIUS)
    tw, th = px(TRIM_W), px(TRIM_H)
    gap = 120
    prev = Image.new("RGB", (len(cards) * (tw + gap) + gap, th + 2 * gap), (24, 24, 28))
    mask = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, tw - 1, th - 1), rr, fill=255)
    for i, c in enumerate(cards):
        prev.paste(c.crop((b, b, b + tw, b + th)), (gap + i * (tw + gap), gap), mask)
    prev.resize((prev.width // 2, prev.height // 2), Image.LANCZOS).save(os.path.join(OUT, "preview.png"))
    print(f"{len(cards)} cards, {W}x{H}px @ {DPI} dpi = {TRIM_W + 2 * BLEED:.2f} x {TRIM_H + 2 * BLEED:.2f} mm incl. bleed")


if __name__ == "__main__":
    main(sys.argv[1:])
