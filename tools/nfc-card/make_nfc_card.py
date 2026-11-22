"""
Print-ready, double-sided Sadattva NFC card (CR80: 85.6 x 54 mm).

Outputs (in this folder):
  front.png / back.png   600 dpi, 3 mm bleed on every side (91.6 x 60 mm), RGB
  sadattva-nfc-card.pdf  the two sides as PDF pages at exact bleed size (what print shops want)
  preview.png            both sides trimmed with rounded corners, for approval
  print-guides.png       both sides with trim (red) and safe-zone (blue) lines

  python tools/nfc-card/make_nfc_card.py
"""
import math
import os
import sys

import qrcode
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from qrcode.constants import ERROR_CORRECT_M

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
from vcard_card import find_logo  # noqa: E402

DPI, SS = 600, 2                       # final dpi, supersampling factor for smooth circles
MM = DPI / 25.4 * SS                   # pixels per mm while drawing
TRIM_W, TRIM_H, BLEED, SAFE = 85.6, 54.0, 3.0, 3.5
W, H = round((TRIM_W + 2 * BLEED) * MM), round((TRIM_H + 2 * BLEED) * MM)

BLUE = (32, 27, 127)
TINT = (234, 233, 244)                 # lavender pattern on white
DEEP = (46, 41, 140)                   # pattern on blue
LAV = (196, 193, 234)                  # secondary text on blue
FONTS = "C:/Windows/Fonts/"

NAME, TITLE = "Neha Shah", "Founder-Director"
ROWS = [("phone", "+91 92217 57111"), ("mail", "conserveheritage@sadattva.in"), ("insta", "@sadattva")]
QR_PAYLOAD = open(os.path.join(HERE, "..", "qr-out", "neha-shah-mecard.txt"), "rb").read()


def mm(v):                              # mm from the bleed edge -> px
    return v * MM


def tm(v):                              # mm from the TRIM edge -> px
    return (v + BLEED) * MM


def font(name, pt):
    return ImageFont.truetype(FONTS + name, round(pt / 72 * DPI * SS))


def hires_logo(layer, color, scale):
    """Upscale a small logo cut-out and re-sharpen its edges so it prints crisply."""
    a = layer.getchannel("A")
    a = a.resize((a.width * scale, a.height * scale), Image.BICUBIC).filter(ImageFilter.GaussianBlur(scale * 0.35))
    a = a.point(lambda v: max(0, min(255, int((v - 70) * 255 / 110))))
    out = Image.new("RGBA", a.size, color + (0,))
    out.putalpha(a)
    return out


def mandala(d, cx, cy, k, color):
    rings = [(0, 0, 150), (230, 46, 22), (300, 64, 14), (380, 34, 30), (470, 80, 12), (540, 96, 10), (610, 110, 9)]
    for r, n, dot in rings:
        r, dot = r * k, dot * k
        if n == 0:
            d.ellipse([cx - dot, cy - dot, cx + dot, cy + dot], fill=color)
            continue
        for i in range(n):
            a = 2 * math.pi * i / n
            x, y = cx + r * math.cos(a), cy + r * math.sin(a)
            d.ellipse([x - dot, y - dot, x + dot, y + dot], fill=color)
    for r in (170, 190):
        r *= k
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=max(1, int(8 * k)))


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
    """Three arcs: the universal 'tap here' NFC symbol, left edge at x, vertical centre y."""
    for i in range(3):
        r = h * (0.28 + 0.24 * i)
        d.arc([x - r + h * 0.1, y - r, x + r + h * 0.1, y + r], -50, 50, fill=color, width=w)


def insta(d, x, y, s, color):
    w = max(2, int(s * 0.11))
    d.rounded_rectangle([x, y, x + s, y + s], radius=s * 0.3, outline=color, width=w)
    r = s * 0.23
    d.ellipse([x + s / 2 - r, y + s / 2 - r, x + s / 2 + r, y + s / 2 + r], outline=color, width=w)
    d.ellipse([x + s * .70, y + s * .17, x + s * .83, y + s * .30], fill=color)


def front(wordmark):
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    k = MM * 0.052                                   # mandala scale, echoing the business card
    mandala(d, mm(0) - mm(4), H / 2, k, TINT)
    mandala(d, W + mm(4), H / 2, k, TINT)
    logo = hires_logo(wordmark, BLUE, 8)
    lw = mm(46)
    logo = logo.resize((round(lw), round(logo.height * lw / logo.width)), Image.LANCZOS)
    img.paste(logo, (round((W - lw) / 2), round(H / 2 - logo.height / 2 - mm(1.5))), logo)
    # small tap hint under the logo
    f = font("segoeui.ttf", 5.6)
    label = "TAP  ·  SCAN  ·  SAVE"
    tw = d.textlength(label, font=f)
    d.text(((W - tw) / 2, H / 2 + logo.height / 2 + mm(1.8)), label, font=f, fill=(120, 117, 170))
    return img


def back(temple):
    img = Image.new("RGB", (W, H), BLUE)
    d = ImageDraw.Draw(img)
    mandala(d, W + mm(2), -mm(2), MM * 0.05, DEEP)
    mandala(d, -mm(6), H + mm(6), MM * 0.04, DEEP)

    x0 = tm(SAFE + 1.5)
    DY = 4.2                                          # centres both columns vertically
    # temple mark above the name
    t = hires_logo(temple, (255, 255, 255), 8)
    tw_ = mm(11)
    t = t.resize((round(tw_), round(t.height * tw_ / t.width)), Image.LANCZOS)
    img.paste(t, (round(x0), round(tm(SAFE + 2.2 + DY))), t)

    y = tm(SAFE + 2.2 + DY) + t.height + mm(2.6)
    d.text((x0, y), NAME, font=font("seguisb.ttf", 13), fill="white")
    y += mm(6.6)
    ft = font("segoeui.ttf", 6.4)
    d.text((x0, y), "  ".join(TITLE.upper()).replace("   ", "   "), font=ft, fill=LAV) if False else \
        d.text((x0, y), TITLE.upper(), font=ft, fill=LAV)
    y += mm(4.4)
    d.line([x0, y, x0 + mm(10), y], fill=LAV, width=round(mm(0.25)))
    y += mm(3.2)

    fi = ImageFont.truetype(FONTS + "segmdl2.ttf", round(6.6 / 72 * DPI * SS))
    fr = font("segoeui.ttf", 7)
    glyph = {"phone": "\uE717", "mail": "\uE715"}
    for kind, text in ROWS:
        cy = y + mm(1.6)
        if kind == "insta":
            s = mm(2.5)
            insta(d, x0, cy - s / 2, s, "white")
        else:
            d.text((x0, cy), glyph[kind], font=fi, fill="white", anchor="lm")
        d.text((x0 + mm(4.4), cy), text, font=fr, fill="white", anchor="lm")
        y += mm(4.3)

    # QR tile on the right, inside the safe zone
    tile = mm(25)
    tx = tm(TRIM_W - SAFE - 1) - tile
    ty = tm(SAFE + 4.5 + DY)
    d.rounded_rectangle([tx, ty, tx + tile, ty + tile], radius=mm(3.2), fill="white")
    pad = mm(2.2)                                     # white margin = quiet zone (>= 2 modules)
    q, version, n = qr_image(round(tile - 2 * pad))
    img.paste(q, (round(tx + pad), round(ty + pad)), q)
    # tap / scan caption under the tile
    cy = ty + tile + mm(3.6)
    fc = font("seguisb.ttf", 6)
    cap = "Tap or scan"
    cw = d.textlength(cap, font=fc)
    ic = mm(3.2)
    total = ic + mm(1.2) + cw
    cx = tx + (tile - total) / 2
    contactless(d, cx, cy, ic, "white", round(mm(0.35)))
    d.text((cx + ic + mm(1.2), cy), cap, font=fc, fill="white", anchor="lm")
    return img, version, n, (tile - 2 * pad) / MM


def finish(img):
    return img.resize((W // SS, H // SS), Image.LANCZOS)


def trimmed(img, radius_mm=3.18):
    b = round(BLEED * DPI / 25.4)
    c = img.crop((b, b, img.width - b, img.height - b))
    mask = Image.new("L", c.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, c.width - 1, c.height - 1], radius=round(radius_mm * DPI / 25.4), fill=255)
    out = Image.new("RGBA", c.size, (0, 0, 0, 0))
    out.paste(c, (0, 0), mask)
    return out


def guides(img):
    g = img.copy()
    d = ImageDraw.Draw(g)
    px = DPI / 25.4
    for inset, col in ((BLEED, (230, 40, 40)), (BLEED + SAFE, (40, 120, 230))):
        o = inset * px
        d.rectangle([o, o, g.width - o, g.height - o], outline=col, width=4)
    return g


def main():
    wordmark, temple = find_logo(Image.open(os.path.join(HERE, "..", "qr-out", "sadattva-brand.png")))
    f = finish(front(wordmark))
    b_raw, version, n, qr_mm = back(temple)
    b = finish(b_raw)
    for name, im in (("front", f), ("back", b)):
        im.save(os.path.join(HERE, f"{name}.png"), dpi=(DPI, DPI), optimize=True)

    # PDF at exact physical size (bleed included)
    from reportlab.lib.units import mm as rmm
    from reportlab.pdfgen import canvas
    pdf = canvas.Canvas(os.path.join(HERE, "sadattva-nfc-card.pdf"),
                        pagesize=((TRIM_W + 2 * BLEED) * rmm, (TRIM_H + 2 * BLEED) * rmm))
    for name in ("front", "back"):
        pdf.drawImage(os.path.join(HERE, f"{name}.png"), 0, 0, (TRIM_W + 2 * BLEED) * rmm, (TRIM_H + 2 * BLEED) * rmm)
        pdf.showPage()
    pdf.save()

    # approval preview + guides
    tf, tb = trimmed(f), trimmed(b)
    gap = 120
    pv = Image.new("RGB", (tf.width * 2 + gap * 3, tf.height + gap * 2), (238, 237, 244))
    pv.paste(tf, (gap, gap), tf)
    pv.paste(tb, (tf.width + gap * 2, gap), tb)
    pv.save(os.path.join(HERE, "preview.png"), optimize=True)
    gf, gb = guides(f), guides(b)
    gv = Image.new("RGB", (gf.width * 2 + 60, gf.height), "white")
    gv.paste(gf, (0, 0))
    gv.paste(gb, (gf.width + 60, 0))
    gv.save(os.path.join(HERE, "print-guides.png"), optimize=True)

    print(f"front/back {f.size} px @ {DPI} dpi = {TRIM_W + 2 * BLEED} x {TRIM_H + 2 * BLEED} mm with bleed")
    print(f"QR: version {version}, {n} modules, {qr_mm:.1f} mm wide -> {qr_mm / n:.2f} mm per module")


if __name__ == "__main__":
    main()
