"""
Branded, vertical (phone-screen) contact card with a styled vCard QR.

  python tools/vcard_card.py --vcf tools/qr-out/neha-shah.vcf --brand-art path/to/business-card.png \
      --name "Neha Shah" --subtitle "Founder-Director" \
      --line phone="+91 92217 57111" --line mail=conserveheritage@sadattva.in --line insta=@sadattva \
      --out tools/qr-out/neha-shah-card

--brand-art is the white business-card image: the wordmark and temple icon are cut out of it
automatically (any pixel darker than the light mandala counts as logo ink).

Scannability: error correction H (30% recoverable) pays for the centre badge; dot modules,
rounded finder eyes, dark-on-white contrast and a 4-module quiet zone are kept for iOS + Android.
"""
import argparse
import os

import qrcode
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from qrcode.constants import ERROR_CORRECT_H, ERROR_CORRECT_Q, ERROR_CORRECT_M
EC = {'H': ERROR_CORRECT_H, 'Q': ERROR_CORRECT_Q, 'M': ERROR_CORRECT_M}

BLUE = (32, 27, 127)          # sampled from the Sadattva wordmark
TINT = (234, 233, 244)        # mandala lavender
MUTED = (96, 94, 140)
FONTS = "C:/Windows/Fonts/"
W, H = 1440, 2560             # 9:16 phone screen; drawn at 2x then downsampled
SS = 2


def font(name, size):
    return ImageFont.truetype(FONTS + name, size * SS)


def ink_cutout(img, box, color=BLUE):
    """Crop `box` and turn dark ink into a clean single-colour transparent layer."""
    crop = img.convert("L").crop(box)
    alpha = crop.point(lambda v: 0 if v > 215 else min(255, int((215 - v) * 255 / 150)))
    bbox = alpha.getbbox()
    alpha = alpha.crop(bbox)
    layer = Image.new("RGBA", alpha.size, color + (0,))
    layer.putalpha(alpha)
    return layer


def find_logo(art):
    g = art.convert("L")
    w, h = g.size
    px = g.load()
    pts = [(x, y) for y in range(0, h, 1) for x in range(0, w, 1) if px[x, y] < 150]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    full = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
    # temple icon = the columns in the lower band with lots of ink (the arrow line is thin)
    y0 = full[1] + int((full[3] - full[1]) * 0.6)
    heavy = [sum(1 for y in range(y0, full[3]) if px[x, y] < 150) > 5
             for x in range(full[0], full[2])]
    runs, start = [], None                  # contiguous heavy column runs; arrowheads are short ones
    for i, h_ in enumerate(heavy + [False]):
        if h_ and start is None:
            start = i
        elif not h_ and start is not None:
            runs.append((start, i)); start = None
    s, e = max(runs, key=lambda r: r[1] - r[0])
    x1, x2 = full[0] + s, full[0] + e
    top = y0
    for y in range(full[3] - 1, y0, -1):    # walk up from the base until a blank row: drops letter tails
        if not any(px[x, y] < 150 for x in range(x1, x2)):
            top = y + 1
            break
    icon = (x1, top, x2, full[3])
    return ink_cutout(art, full), ink_cutout(art, icon)


def mandala(d, cx, cy, scale):
    """Concentric rings of dots, echoing the business-card pattern."""
    rings = [(0, 0, 150), (230, 46, 22), (300, 64, 14), (380, 34, 30), (470, 80, 12),
             (540, 96, 10), (610, 110, 9)]
    import math
    for r, n, dot in rings:
        r, dot = r * scale, dot * scale
        if n == 0:
            d.ellipse([cx - dot, cy - dot, cx + dot, cy + dot], fill=TINT)
            continue
        for i in range(n):
            a = 2 * math.pi * i / n
            x, y = cx + r * math.cos(a), cy + r * math.sin(a)
            d.ellipse([x - dot, y - dot, x + dot, y + dot], fill=TINT)
    for r in (170, 190):
        r *= scale
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=TINT, width=int(8 * scale))


def draw_qr(data, size, badge_icon, ec='H'):
    qr = qrcode.QRCode(error_correction=EC[ec], border=4)
    qr.add_data(data)
    qr.make(fit=True)
    m = qr.get_matrix()                     # includes the 4-module border
    n = len(m)
    core = n - 8
    mod = size / n
    img = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)

    def in_finder(r, c):
        r, c = r - 4, c - 4
        return (r < 7 and c < 7) or (r < 7 and c >= core - 7) or (r >= core - 7 and c < 7)

    badge = core * (0.26 if ec == 'H' else 0.22)                    # badge diameter in modules
    mid = n / 2
    def in_badge(r, c):
        return (r + 0.5 - mid) ** 2 + (c + 0.5 - mid) ** 2 <= (badge / 2 + 0.6) ** 2

    dot = mod * 0.46
    for r in range(n):
        for c in range(n):
            if m[r][c] and not in_finder(r, c) and not in_badge(r, c):
                x, y = (c + 0.5) * mod, (r + 0.5) * mod
                d.ellipse([x - dot, y - dot, x + dot, y + dot], fill=BLUE)

    for fr, fc in ((4, 4), (4, 4 + core - 7), (4 + core - 7, 4)):
        x0, y0 = fc * mod, fr * mod
        s = 7 * mod
        d.rounded_rectangle([x0, y0, x0 + s, y0 + s], radius=s * 0.32, fill=BLUE)
        d.rounded_rectangle([x0 + mod, y0 + mod, x0 + s - mod, y0 + s - mod],
                            radius=s * 0.22, fill="white")
        d.ellipse([x0 + 2 * mod, y0 + 2 * mod, x0 + s - 2 * mod, y0 + s - 2 * mod], fill=BLUE)

    # centre badge: white disc, blue ring, temple icon
    R = badge / 2 * mod
    cx = cy = size / 2
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill="white", outline=BLUE, width=int(mod * 0.55))
    icon = badge_icon.copy()
    iw = int(R * 1.35)
    icon = icon.resize((iw, int(icon.height * iw / icon.width)), Image.LANCZOS)
    img.alpha_composite(icon, (int(cx - icon.width / 2), int(cy - icon.height / 2)))
    return img, qr.version


def insta_icon(d, x, y, s, color):
    d.rounded_rectangle([x, y, x + s, y + s], radius=s * 0.3, outline=color, width=max(2, int(s * 0.1)))
    r = s * 0.24
    d.ellipse([x + s / 2 - r, y + s / 2 - r, x + s / 2 + r, y + s / 2 + r], outline=color,
              width=max(2, int(s * 0.1)))
    d.ellipse([x + s * 0.72, y + s * 0.18, x + s * 0.84, y + s * 0.30], fill=color)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vcf", required=True)
    ap.add_argument("--brand-art", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--subtitle", default="")
    ap.add_argument("--line", action="append", default=[], help="kind=text; kind is phone|mail|insta")
    ap.add_argument("--out", required=True)
    ap.add_argument("--ec", default="H", choices=list(EC), help="error correction; Q = less dense")
    a = ap.parse_args()

    data = open(a.vcf, "rb").read()
    wordmark, temple = find_logo(Image.open(a.brand_art))

    cw, ch = W * SS, H * SS
    card = Image.new("RGBA", (cw, ch), (255, 255, 255, 255))
    d = ImageDraw.Draw(card)
    mandala(d, cw + 150 * SS, -20 * SS, 1.15 * SS)     # top-right corner, bleeding off edge
    mandala(d, -150 * SS, ch + 20 * SS, 1.15 * SS)     # bottom-left corner

    # wordmark
    lw = 760 * SS
    logo = wordmark.resize((lw, int(wordmark.height * lw / wordmark.width)), Image.LANCZOS)
    card.alpha_composite(logo, ((cw - lw) // 2, 190 * SS))
    y = 190 * SS + logo.height + 110 * SS

    def centred(text, f, fill, y):
        tw = d.textlength(text, font=f)
        d.text(((cw - tw) / 2, y), text, font=f, fill=fill)

    centred(a.name, font("seguisb.ttf", 92), BLUE, y)
    y += 128 * SS
    if a.subtitle:
        centred(a.subtitle.upper(), font("segoeui.ttf", 38), MUTED, y)
        y += 100 * SS

    # QR panel with soft shadow
    pw, pad = 1060 * SS, 70 * SS
    px0, py0 = (cw - pw) // 2, y
    shadow = Image.new("RGBA", card.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([px0, py0 + 24 * SS, px0 + pw, py0 + pw + 24 * SS],
                                             radius=80 * SS, fill=BLUE + (46,))
    card.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(40 * SS)))
    d.rounded_rectangle([px0, py0, px0 + pw, py0 + pw], radius=80 * SS, fill="white",
                        outline=(214, 212, 236), width=3 * SS)
    qimg, version = draw_qr(data, pw - 2 * pad, temple, a.ec)
    card.alpha_composite(qimg, (px0 + pad, py0 + pad))
    y = py0 + pw + 80 * SS

    # "scan to save" pill
    f = font("seguisb.ttf", 40)
    label = "Scan to save contact"
    tw = d.textlength(label, font=f)
    bw, bh = tw + 120 * SS, 100 * SS
    d.rounded_rectangle([(cw - bw) / 2, y, (cw + bw) / 2, y + bh], radius=bh / 2, fill=BLUE)
    d.text(((cw - tw) / 2, y + bh / 2), label, font=f, fill="white", anchor="lm")
    y += bh + 90 * SS

    # contact lines with icons
    ficon = ImageFont.truetype(FONTS + "segmdl2.ttf", 44 * SS)
    ftxt = font("segoeui.ttf", 44)
    glyph = {"phone": "\uE717", "mail": "\uE715"}
    rows = [l.split("=", 1) for l in a.line]
    widest = max(d.textlength(t, font=ftxt) for _, t in rows) if rows else 0
    x0 = (cw - (widest + 90 * SS)) / 2
    for kind, text in rows:
        cy = y + 30 * SS
        if kind == "insta":
            insta_icon(d, x0 + 2 * SS, cy - 22 * SS, 44 * SS, BLUE)
        else:
            d.text((x0, cy), glyph[kind], font=ficon, fill=BLUE, anchor="lm")
        d.text((x0 + 90 * SS, cy), text, font=ftxt, fill=(40, 38, 80), anchor="lm")
        y += 84 * SS

    final = card.convert("RGB").resize((W, H), Image.LANCZOS)
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    final.save(a.out + ".png", optimize=True)
    # standalone square QR too (for print / pasting elsewhere)
    qimg.convert("RGB").resize((1200, 1200), Image.LANCZOS).save(a.out + "-qr.png", optimize=True)
    print(f"Saved {a.out}.png ({W}x{H}) and {a.out}-qr.png — QR version {version}, EC={a.ec}")


if __name__ == "__main__":
    main()
