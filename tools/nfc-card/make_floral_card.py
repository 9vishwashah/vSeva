"""
Floral double-sided Sadattva NFC card.
Size: ISO/IEC 7810 ID-1 (CR80) 85.60 x 53.98 mm, 3.18 mm corner radius, + 3 mm bleed.

Front: Sadattva wordmark between two line-art lotus rosettes (cut by the card edges).
Back:  brand blue, lotus halo around a white QR tile, "TAP · SCAN" with the NFC symbol. No personal details.

  python tools/nfc-card/make_floral_card.py                    -> tools/nfc-card/floral/
  python tools/nfc-card/make_floral_card.py --style classic    -> tools/nfc-card/classic/ (business-card dot circles)
"""
import math
import os
import sys

import qrcode
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from qrcode.constants import ERROR_CORRECT_M

HERE = os.path.dirname(os.path.abspath(__file__))
# --style floral (lotus line art) | classic (the original business-card dot circles)
STYLE = "classic" if "--style" in sys.argv and sys.argv[sys.argv.index("--style") + 1] == "classic" else "floral"
OUT = os.path.join(HERE, STYLE)
sys.path.insert(0, os.path.join(HERE, ".."))
from vcard_card import find_logo  # noqa: E402

DPI, SS = 600, 3
MM = DPI / 25.4 * SS
TRIM_W, TRIM_H, BLEED, SAFE, RADIUS = 85.60, 53.98, 3.0, 3.5, 3.18
W, H = round((TRIM_W + 2 * BLEED) * MM), round((TRIM_H + 2 * BLEED) * MM)

BLUE = (32, 27, 127)
LINE_LIGHT = (205, 202, 236)       # floral line art on white
DOT_LIGHT = (222, 220, 243)
LINE_DEEP = (72, 66, 168)          # floral line art on blue
VINE_DEEP = (58, 52, 156)          # quieter corner vines
DOT_DEEP = (52, 46, 150)
LAV = (200, 197, 238)
NAVY = (27, 25, 102)               # client's existing card back (approximated from their Canva screenshot)
NAVY_DOTS = (46, 44, 130)
FONTS = "C:/Windows/Fonts/"
QR_PAYLOAD = open(os.path.join(HERE, "..", "qr-out", "neha-shah-mecard.txt"), "rb").read()


def mm(v):
    return v * MM


def tm(v):                                         # mm from the trim edge -> px
    return (v + BLEED) * MM


# ---------------- floral primitives (all line art, echoing the logo's thin-line style) ----------------
def petal_pts(cx, cy, ang, r0, length, width, n=40, tip=1.0):
    """Pointed petal along angle `ang`, from radius r0 to r0+length. Returns closed polygon points."""
    left, right = [], []
    for i in range(n + 1):
        t = i / n
        r = r0 + t * length
        w = width * (math.sin(math.pi * t) ** 0.85) * (1 - 0.35 * t ** 3 * tip)
        a = w / max(r, 1)
        left.append((cx + r * math.cos(ang - a), cy + r * math.sin(ang - a)))
        right.append((cx + r * math.cos(ang + a), cy + r * math.sin(ang + a)))
    return left + right[::-1]


def stroke(d, pts, color, w, fill=None):
    if fill is not None:
        d.polygon(pts, fill=fill)
    d.line(pts + [pts[0]], fill=color, width=w, joint="curve")


def dot(d, x, y, r, color):
    d.ellipse([x - r, y - r, x + r, y + r], fill=color)


def dot_mandala(d, cx, cy, k, color):
    """Concentric rings of dots, the pattern from the Sadattva business card (same as the first NFC card)."""
    rings = [(0, 0, 150), (230, 46, 22), (300, 64, 14), (380, 34, 30), (470, 80, 12), (540, 96, 10), (610, 110, 9)]
    for r, n, dt in rings:
        r, dt = r * k, dt * k
        if n == 0:
            dot(d, cx, cy, dt, color)
            continue
        for i in range(n):
            a = 2 * math.pi * i / n
            dot(d, cx + r * math.cos(a), cy + r * math.sin(a), dt, color)
    for r in (170, 190):
        r *= k
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=max(1, int(8 * k)))


def rosette(d, cx, cy, R, line, dots, w, bg, rot=0.0):
    """Layered lotus rosette: outer pointed petals, inner rounded petals, seed centre, dotted rings."""
    # outer dotted ring
    for i in range(72):
        a = rot + 2 * math.pi * i / 72
        dot(d, cx + R * 1.08 * math.cos(a), cy + R * 1.08 * math.sin(a), w * 1.1, dots)
    for i in range(36):
        a = rot + 2 * math.pi * (i + .5) / 36
        dot(d, cx + R * 1.18 * math.cos(a), cy + R * 1.18 * math.sin(a), w * 1.8, dots)
    # back layer: 16 long petals
    for i in range(16):
        a = rot + 2 * math.pi * (i + .5) / 16
        stroke(d, petal_pts(cx, cy, a, R * .30, R * .70, R * .16), line, w, fill=bg)
    # front layer: 16 petals with a centre vein
    for i in range(16):
        a = rot + 2 * math.pi * i / 16
        stroke(d, petal_pts(cx, cy, a, R * .26, R * .62, R * .15), line, w, fill=bg)
        d.line([(cx + R * .34 * math.cos(a), cy + R * .34 * math.sin(a)),
                (cx + R * .74 * math.cos(a), cy + R * .74 * math.sin(a))], fill=line, width=max(1, w // 2))
    # inner rounded petals
    for i in range(8):
        a = rot + 2 * math.pi * (i + .5) / 8
        stroke(d, petal_pts(cx, cy, a, R * .10, R * .26, R * .11, tip=0), line, w, fill=bg)
    # seed centre
    d.ellipse([cx - R * .12, cy - R * .12, cx + R * .12, cy + R * .12], outline=line, width=w, fill=bg)
    for i in range(8):
        a = rot + 2 * math.pi * i / 8
        dot(d, cx + R * .065 * math.cos(a), cy + R * .065 * math.sin(a), w * 1.3, line)
    dot(d, cx, cy, w * 1.5, line)


def floret(d, cx, cy, r, line, w, bg, n=5, rot=0.0):
    for i in range(n):
        a = rot + 2 * math.pi * i / n
        stroke(d, petal_pts(cx, cy, a, r * .18, r * .82, r * .30, tip=0.5), line, w, fill=bg)
    dot(d, cx, cy, r * .16, line)


def vine(d, cx, cy, R, a0, a1, line, w, bg, leaves=7):
    """Curving stem along an arc with alternating leaves and a bud at the end."""
    pts = [(cx + R * math.cos(a0 + (a1 - a0) * t / 60), cy + R * math.sin(a0 + (a1 - a0) * t / 60)) for t in range(61)]
    d.line(pts, fill=line, width=w, joint="curve")
    for k in range(1, leaves + 1):
        t = k / (leaves + 1)
        a = a0 + (a1 - a0) * t
        px, py = cx + R * math.cos(a), cy + R * math.sin(a)
        side = 1 if k % 2 else -1
        tangent = a + math.copysign(math.pi / 2, a1 - a0)
        la = tangent + side * 0.75
        size = R * 0.16 * (1 - 0.35 * abs(t - .5))
        stroke(d, petal_pts(px, py, la, 0, size, size * .32), line, w, fill=bg)
    ex, ey = pts[-1]
    floret(d, ex, ey, R * .09, line, w, bg)


# ---------------- QR + NFC symbol ----------------
def qr_image(size_px):
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, border=0)
    qr.add_data(QR_PAYLOAD)
    qr.make(fit=True)
    m = qr.get_matrix()
    n = len(m)
    img = Image.new("RGBA", (size_px, size_px), (255, 255, 255, 0))
    d = ImageDraw.Draw(img)
    mod = size_px / n
    finder = lambda r, c: (r < 7 and c < 7) or (r < 7 and c >= n - 7) or (r >= n - 7 and c < 7)
    for r in range(n):
        for c in range(n):
            if m[r][c] and not finder(r, c):
                x, y = (c + .5) * mod, (r + .5) * mod
                d.ellipse([x - mod * .46, y - mod * .46, x + mod * .46, y + mod * .46], fill=BLUE)
    for fr, fc in ((0, 0), (0, n - 7), (n - 7, 0)):
        x0, y0, s = fc * mod, fr * mod, 7 * mod
        d.rounded_rectangle([x0, y0, x0 + s, y0 + s], radius=s * .32, fill=BLUE)
        d.rounded_rectangle([x0 + mod, y0 + mod, x0 + s - mod, y0 + s - mod], radius=s * .22, fill="white")
        d.ellipse([x0 + 2 * mod, y0 + 2 * mod, x0 + s - 2 * mod, y0 + s - 2 * mod], fill=BLUE)
    return img, qr.version, n


def contactless(d, x, y, h, color, w):
    for i in range(3):
        r = h * (0.28 + 0.24 * i)
        d.arc([x - r + h * 0.1, y - r, x + r + h * 0.1, y + r], -50, 50, fill=color, width=w)


def tracked(d, x, y, text, f, fill, track):
    """Draw letter-spaced text starting at x, vertical middle at y; returns width."""
    cx = x
    for ch in text:
        d.text((cx, y), ch, font=f, fill=fill, anchor="lm")
        cx += d.textlength(ch, font=f) + track
    return cx - track - x


def text_width(d, text, f, track):
    return sum(d.textlength(c, font=f) for c in text) + track * (len(text) - 1)


def hires_logo(layer, color, scale):
    a = layer.getchannel("A")
    a = a.resize((a.width * scale, a.height * scale), Image.BICUBIC).filter(ImageFilter.GaussianBlur(scale * 0.35))
    a = a.point(lambda v: max(0, min(255, int((v - 70) * 255 / 110))))
    out = Image.new("RGBA", a.size, color + (0,))
    out.putalpha(a)
    return out


# ---------------- sides ----------------
def front(wordmark):
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    w = round(mm(0.22))
    R = mm(25)
    if STYLE == "classic":
        k = MM * 0.052                                # same dot circles as the first card / business card
        dot_mandala(d, -mm(4), H / 2, k, (234, 233, 244))
        dot_mandala(d, W + mm(4), H / 2, k, (234, 233, 244))
    else:
        rosette(d, -mm(4.5), H / 2, R, LINE_LIGHT, DOT_LIGHT, w, "white")
        rosette(d, W + mm(4.5), H / 2, R, LINE_LIGHT, DOT_LIGHT, w, "white", rot=math.pi / 16)
        # small florets scattered towards the centre band, top and bottom
        for fx, fy, r, rot in ((.36, .14, 1.6, .2), (.64, .14, 1.6, .9), (.5, .1, 1.1, .5),
                               (.36, .86, 1.6, .6), (.64, .86, 1.6, .1), (.5, .9, 1.1, .3)):
            floret(d, W * fx, H * fy, mm(r), LINE_LIGHT, w, "white", rot=rot)
    logo = hires_logo(wordmark, BLUE, 10)
    lw = mm(44)
    logo = logo.resize((round(lw), round(logo.height * lw / logo.width)), Image.LANCZOS)
    img.paste(logo, (round((W - lw) / 2), round((H - logo.height) / 2)), logo)
    return img


def back():
    # classic back matches the client's existing navy business card (dot circles centred left + right)
    img = Image.new("RGB", (W, H), NAVY if STYLE == "classic" else BLUE)
    d = ImageDraw.Draw(img)
    w = round(mm(0.22))
    tile = mm(24.5)
    cx = W / 2
    tile_top = tm((TRIM_H - (tile / MM + 7.2)) / 2)          # centre tile + caption block on the card
    cy = tile_top + tile / 2
    # lotus halo behind the tile + corner vines
    if STYLE == "classic":
        k = MM * 0.052
        dot_mandala(d, -mm(4), H / 2, k, NAVY_DOTS)
        dot_mandala(d, W + mm(4), H / 2, k, NAVY_DOTS)
    else:
        rosette(d, cx, cy, mm(30), LINE_DEEP, DOT_DEEP, w, BLUE)
        for (vx, vy, a0, a1) in ((0, 0, .15, 1.35), (W, 0, math.pi - .15, math.pi - 1.35),
                                 (0, H, -.15, -1.35), (W, H, math.pi + .15, math.pi + 1.35)):
            vine(d, vx, vy, mm(15), a0, a1, VINE_DEEP, w, BLUE)
    # white tile with soft glow
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).rounded_rectangle([cx - tile / 2, tile_top, cx + tile / 2, tile_top + tile],
                                           radius=mm(3.4), fill=(255, 255, 255, 70))
    img.paste(glow.filter(ImageFilter.GaussianBlur(mm(1.6))), (0, 0), glow.filter(ImageFilter.GaussianBlur(mm(1.6))))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([cx - tile / 2, tile_top, cx + tile / 2, tile_top + tile], radius=mm(3.4), fill="white")
    pad = mm(2.2)
    q, version, n = qr_image(round(tile - 2 * pad))
    img.paste(q, (round(cx - tile / 2 + pad), round(tile_top + pad)), q)
    # TAP · SCAN caption
    f = ImageFont.truetype(FONTS + "seguisb.ttf", round(6.2 / 72 * DPI * SS))
    label, track = "TAP · SCAN", mm(0.55)
    ic = mm(3.4)
    tw = text_width(d, label, f, track)
    total = ic + mm(1.6) + tw
    x = cx - total / 2
    ty = tile_top + tile + mm(4.4)
    contactless(d, x, ty, ic, "white", round(mm(0.38)))
    tracked(d, x + ic + mm(1.6), ty, label, f, "white", track)
    return img, version, n, (tile - 2 * pad) / MM


def finish(img):
    return img.resize((round(W / SS), round(H / SS)), Image.LANCZOS)


def trimmed(img):
    b = round(BLEED * DPI / 25.4)
    c = img.crop((b, b, img.width - b, img.height - b))
    mask = Image.new("L", c.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, c.width - 1, c.height - 1], radius=round(RADIUS * DPI / 25.4), fill=255)
    out = Image.new("RGBA", c.size, (0, 0, 0, 0))
    out.paste(c, (0, 0), mask)
    return out


def guides(img):
    g = img.copy()
    d = ImageDraw.Draw(g)
    px = DPI / 25.4
    for inset, col in ((BLEED, (230, 40, 40)), (BLEED + SAFE, (40, 160, 230))):
        o = inset * px
        d.rounded_rectangle([o, o, g.width - o, g.height - o], radius=max(1, (RADIUS - (inset - BLEED)) * px) if inset == BLEED else 2,
                            outline=col, width=4)
    return g


def main():
    os.makedirs(OUT, exist_ok=True)
    # 512 px logo from the client (sharper than the business-card cut-out; has no ® mark)
    wordmark, _ = find_logo(Image.open(os.path.join(HERE, "..", "qr-out", "sadattva-logo-512.png")))
    f = finish(front(wordmark))
    braw, version, n, qr_mm = back()
    b = finish(braw)
    for name, im in (("front", f), ("back", b)):
        im.save(os.path.join(OUT, f"{name}.png"), dpi=(DPI, DPI), optimize=True)

    from reportlab.lib.units import mm as rmm
    from reportlab.pdfgen import canvas
    size = ((TRIM_W + 2 * BLEED) * rmm, (TRIM_H + 2 * BLEED) * rmm)
    pdf = canvas.Canvas(os.path.join(OUT, f"sadattva-nfc-card-{STYLE}.pdf"), pagesize=size)
    pdf.setTitle(f"Sadattva NFC card ({STYLE})")
    for name in ("front", "back"):
        pdf.drawImage(os.path.join(OUT, f"{name}.png"), 0, 0, *size)
        pdf.showPage()
    pdf.save()

    tf, tb = trimmed(f), trimmed(b)
    gap = 120
    pv = Image.new("RGB", (tf.width * 2 + gap * 3, tf.height + gap * 2), (238, 237, 244))
    for i, im in enumerate((tf, tb)):
        sh = Image.new("RGBA", pv.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle([gap + i * (tf.width + gap), gap + 18, gap + i * (tf.width + gap) + tf.width,
                                              gap + 18 + tf.height], radius=75, fill=(20, 18, 60, 60))
        sh = sh.filter(ImageFilter.GaussianBlur(28))
        pv.paste(sh, (0, 0), sh)
        pv.paste(im, (gap + i * (tf.width + gap), gap), im)
    pv.save(os.path.join(OUT, "preview.png"), optimize=True)
    gf, gb = guides(f), guides(b)
    gv = Image.new("RGB", (gf.width * 2 + 60, gf.height), "white")
    gv.paste(gf, (0, 0))
    gv.paste(gb, (gf.width + 60, 0))
    gv.save(os.path.join(OUT, "print-guides.png"), optimize=True)
    print(f"{f.size} px @ {DPI} dpi = {TRIM_W + 2 * BLEED:.2f} x {TRIM_H + 2 * BLEED:.2f} mm incl. bleed")
    print(f"QR v{version}, {n} modules, {qr_mm:.1f} mm -> {qr_mm / n:.2f} mm/module")


if __name__ == "__main__":
    main()
