# vSeva App Guide & User Manual

The external guide for Vihar Seva groups, Captains and Sevaks.

| File | What it is |
|---|---|
| `vSeva App Guide & User Manual.pdf` | Final PDF in a phone-shaped page size (135 × 240 mm, 9:16), 21 pages, about 3.5 MB, so it can be shared on WhatsApp |
| `guide.html` | Editable source: every page, its text and its layout |
| `assets/vjas-logo.jpg` | VJAS logo for the footer (copied from `SSG/VJAS.jpeg`) |
| `assets/vseva-logo.png` | Official vSeva logo (copied from `assets/vseva-logo-removebg-preview.png`) |
| `assets/screens/*.jpg` | Real app screenshots used in the guide (anonymised, 760 px wide) |
| `assets/qr-vseva-site.svg` | QR code for https://vseva.vjas.in (decoded and verified) |
| `assets/qr-instagram.png` | Instagram QR with the vSeva logo, supplied by the owner (decodes to https://www.instagram.com/the.vseva) |
| `CONTENT_AUDIT.md` | What was verified in the app, what was left out, and the open points |

## Editing and regenerating

1. Edit `guide.html`. Each page is a `<section class="page">`; the colours and fonts are the CSS tokens at the top of the file.
2. Preview it by opening `guide.html` in Chrome.
3. Regenerate the PDF from this folder:

```bash
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=15000 --print-to-pdf="vSeva App Guide & User Manual.pdf" "file:///C:/Users/Admin/Desktop/VISHWA/vSeva/vSeva/docs/platform-guide/guide.html"
```

The fonts (Schibsted Grotesk, Instrument Sans, JetBrains Mono) load from Google Fonts, so regenerate while online; Chrome embeds them in the PDF.

## Screenshots

The screenshots were taken from the vSeva Android app on an emulator, signed in to a real group. Before each capture, the names and phone numbers on screen were replaced inside the app (members became "Sevak A", "Sevak B"…; the Captain became "Captain Name"; numbers became "98XXX XXXXX"; emails became "yourgroup@email.com"), and profile photos and the ID-card QR were blurred. No data in the app was changed, and no entry was submitted.

To retake a screen, sign in on the emulator, capture it, then resize it to 760 px wide as JPEG (quality 86) into `assets/screens/` with the same file name.
