"""
Contact QR generator — scan with iPhone Camera, Android Camera or Google Lens
and the phone offers "Add to Contacts".

Usage:
  python tools/vcard_qr.py --first Vishwa --last Shah --phone "+91 98765 43210" \
      --email you@example.com --org vSeva --url https://vseva.in --out my-contact

  Outputs <out>.png (QR, print-ready), <out>.txt (the exact QR payload, feed it to
  vcard_card.py --vcf) and <out>.vcf (vCard file, for sharing on WhatsApp/email).

  --format mecard (default): the QR holds a MECARD. Tested Nov 2026: Google Lens offers
  "Add contact" for MECARD but NOT for our vCard 3.0, while Android Camera and iPhone Camera
  read both. MECARD has no TITLE field, so title goes into NOTE as "Title - Org".
  --format vcard: the QR holds the vCard instead (richer fields, Lens won't save it).

Compatibility choices (why it works on both platforms):
  * vCard 3.0 — iOS ignores/garbles many 4.0 cards; 3.0 is read everywhere.
  * N and FN both present — iOS needs N, Android shows FN.
  * CRLF line endings, UTF-8 bytes, CHARSET=UTF-8 only on non-ASCII fields
    (older Android contact apps need it for Hindi/Gujarati names).
  * Phone in +91 international form so it dials correctly from anywhere.
  * No PHOTO — embedding an image makes the QR too dense to scan.
  * Error correction M + 4-module quiet zone + large modules = scans off paper/screens.
"""
import argparse
import sys

import qrcode
from qrcode.constants import ERROR_CORRECT_M


def esc(value: str) -> str:
    """Escape text per RFC 2426 (backslash, comma, semicolon, newline)."""
    return (value.replace("\\", "\\\\").replace(",", "\\,")
                 .replace(";", "\\;").replace("\r\n", "\\n").replace("\n", "\\n"))


def prop(name: str, value: str, params: str = "") -> str:
    if any(ord(c) > 127 for c in value):
        params += ";CHARSET=UTF-8"
    return f"{name}{params}:{value}"


def mecard_esc(value: str) -> str:
    # Lens/iOS handle ':' and ',' fine unescaped; only ';' and '\' would break fields.
    return value.replace("\\", "\\\\").replace(";", "\\;")


def build_mecard(a) -> str:
    first = " ".join(p for p in [a.prefix, a.first, a.middle] if p)
    parts = [f"N:{mecard_esc(a.last.replace(',', ' '))},{mecard_esc(first.replace(',', ' '))}"
             if a.last else f"N:{mecard_esc(first)}"]
    if a.org:
        parts.append(f"ORG:{mecard_esc(a.org)}")
    for p in (a.phone or []) + (a.work_phone or []):
        parts.append(f"TEL:{p.replace(' ', '')}")
    for e in a.email or []:
        parts.append(f"EMAIL:{e}")
    urls = ([a.url] if a.url else []) + (
        [f"https://www.instagram.com/{a.instagram.lstrip('@')}"] if a.instagram else [])
    parts += [f"URL:{u}" for u in urls]
    if a.address:
        parts.append("ADR:" + mecard_esc(", ".join(x.strip() for x in a.address.split("|") if x.strip())))
    note = " - ".join(x for x in [a.title, a.org if a.title else ""] if x)
    if a.note:
        note = f"{note} - {a.note}" if note else a.note
    if note:
        parts.append(f"NOTE:{mecard_esc(note)}")
    return "MECARD:" + ";".join(parts) + ";;"


def build_vcard(a) -> str:
    full = " ".join(p for p in [a.prefix, a.first, a.middle, a.last] if p)
    lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        prop("N", ";".join(esc(x or "") for x in [a.last, a.first, a.middle, a.prefix, ""])),
        prop("FN", esc(full)),
    ]
    if a.org:
        lines.append(prop("ORG", esc(a.org)))
    if a.title:
        lines.append(prop("TITLE", esc(a.title)))
    for p in a.phone or []:
        lines.append(f"TEL;TYPE=CELL:{p.replace(' ', '')}")
    for p in a.work_phone or []:
        lines.append(f"TEL;TYPE=WORK,VOICE:{p.replace(' ', '')}")
    for e in a.email or []:
        lines.append(f"EMAIL;TYPE=INTERNET:{e}")
    if a.url:
        lines.append(f"URL:{a.url}")
    if a.instagram:
        handle = a.instagram.lstrip("@")
        # iOS shows X-SOCIALPROFILE as an Instagram field; Android ignores it, so also add a URL.
        lines.append(f"X-SOCIALPROFILE;TYPE=instagram:https://www.instagram.com/{handle}")
        lines.append(f"URL;TYPE=Instagram:https://www.instagram.com/{handle}")
    if a.address:
        # ADR: PO box;extended;street;city;region;postal code;country
        street, city, region, pin, country = (a.address.split("|") + [""] * 5)[:5]
        val = ";".join(["", ""] + [esc(x.strip()) for x in (street, city, region, pin, country)])
        lines.append(prop("ADR", val, ";TYPE=WORK"))
    if a.note:
        lines.append(prop("NOTE", esc(a.note)))
    lines.append("END:VCARD")
    return "\r\n".join(lines) + "\r\n"


def main():
    ap = argparse.ArgumentParser(description="Make a vCard QR code")
    ap.add_argument("--first", required=True)
    ap.add_argument("--last", default="")
    ap.add_argument("--middle", default="")
    ap.add_argument("--prefix", default="", help="e.g. Dr.")
    ap.add_argument("--org", default="")
    ap.add_argument("--title", default="")
    ap.add_argument("--phone", action="append", help="mobile, repeatable, e.g. +919876543210")
    ap.add_argument("--work-phone", action="append")
    ap.add_argument("--email", action="append")
    ap.add_argument("--url", default="")
    ap.add_argument("--instagram", default="", help="handle, e.g. @sadattva")
    ap.add_argument("--address", default="", help='"street|city|state|pincode|country"')
    ap.add_argument("--note", default="")
    ap.add_argument("--out", default="contact", help="output file name without extension")
    ap.add_argument("--format", default="mecard", choices=["mecard", "vcard"],
                    help="what the QR holds (mecard works with Google Lens)")
    ap.add_argument("--box", type=int, default=20, help="pixels per QR module (default 20)")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")  # Windows console can't print Indic names otherwise

    vcard = build_vcard(a)
    card = build_mecard(a) if a.format == "mecard" else vcard
    data = card.encode("utf-8")
    if len(data) > 900:
        print(f"Warning: {len(data)} bytes — QR will be dense. Drop note/address if it scans poorly.",
              file=sys.stderr)

    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=a.box, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    qr.make_image(fill_color="black", back_color="white").save(f"{a.out}.png")
    with open(f"{a.out}.txt", "wb") as f:
        f.write(data)
    with open(f"{a.out}.vcf", "wb") as f:
        f.write(vcard.encode("utf-8"))

    print(card)
    print(f"Saved {a.out}.png ({a.format}, QR version {qr.version}, {len(data)} bytes), "
          f"{a.out}.txt and {a.out}.vcf")


if __name__ == "__main__":
    main()
