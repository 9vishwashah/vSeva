# Writing the Sadattva contact onto an NFC card

## Buy
- **NTAG215 or NTAG216** cards/stickers. NOT NTAG213: the contact (~240 bytes on the tag) won't fit its 144 bytes.
- For stickers on a phone case or metal surface, buy "anti-metal" NFC stickers.

## Write (from any Android phone or iPhone)
1. Install **NFC Tools** (wakdev), free on Play Store / App Store.
2. Write → Add a record → **Contact**, then fill in exactly:
   - Name: `Neha Shah`
   - Organization: `Sadattva`, Title: `Founder-Director`
   - Phone: `+919221757111`, Email: `conserveheritage@sadattva.in`
   - Website: `https://sadattva.in/`
   (This writes a `text/vcard` record, identical to `neha-shah-nfc.vcf` in this folder.)
3. Tap **Write** and hold the card flat on the back of the phone until it confirms.
4. Test: tap the card on a *different* Android phone with NFC on and the screen unlocked.
5. Only after testing, optionally **Other → Lock tag**. This is PERMANENT: the card can never be rewritten.

## Phone behaviour
- **Android**: tapping opens the contact app with all fields (incl. company + title) ready to save.
- **iPhone**: iPhones do not act on contact (vCard) NFC tags. iPhone users use the QR on the back
  (iPhone Camera reads it). For tap-to-save on iPhone too, write a **URL record** pointing to a hosted
  `.vcf` or contact page instead (needs the page online first).

## Printing
- `sadattva-nfc-card.pdf`: page 1 front, page 2 back, 91.6 × 60 mm incl. 3 mm bleed (trim to 85.6 × 54 mm, CR80).
- `front.png` / `back.png`: same at 600 dpi if the printer wants images.
- `print-guides.png`: red = trim line, blue = safe zone.
- Logo was enlarged from a small image; for the sharpest print, ask the client for the vector logo (AI/SVG/PDF)
  and re-run `python tools/nfc-card/make_nfc_card.py`.
