"""Shrinks the website's guide PDFs (public/vseva-site/*.pdf) in place: about half the size, same look.

Run after regenerating the guides (docs/platform-guide/build_guides.py):
    python scripts/compress_guides.py

Phone screenshots are re-saved as JPEG at 560 px wide (they print about 2.5 inches wide, so ~220 dpi), images
with transparency are left alone, fonts are reduced to the letters used. Needs PyMuPDF and Pillow.
Every guide download is Netlify bandwidth, so smaller files cost less.
"""
import glob
import io
import os
import sys

import fitz  # PyMuPDF
from PIL import Image

MAX_W = 560
QUALITY = 72


def compress(path: str) -> None:
    before = os.path.getsize(path)
    doc = fitz.open(path)
    done = set()
    for page in doc:
        for im in page.get_images(full=True):
            xref, smask = im[0], im[1]
            if xref in done or smask:
                continue
            done.add(xref)
            info = doc.extract_image(xref)
            img = Image.open(io.BytesIO(info['image'])).convert('RGB')
            if img.width > MAX_W:
                img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
            if buf.tell() < len(info['image']) * 0.9:
                page.replace_image(xref, stream=buf.getvalue())
    try:
        doc.subset_fonts()
    except Exception as err:  # older PyMuPDF
        print(f'  fonts not reduced: {err}')
    tmp = path + '.tmp'
    doc.save(tmp, garbage=4, deflate=True, clean=True)
    doc.close()
    if os.path.getsize(tmp) < before:
        os.replace(tmp, path)
    else:
        os.remove(tmp)
    print(f'{os.path.basename(path):36s} {before / 1e3:6.0f} KB -> {os.path.getsize(path) / 1e3:6.0f} KB')


if __name__ == '__main__':
    files = sys.argv[1:] or sorted(glob.glob(os.path.join('public', 'vseva-site', '*.pdf')))
    for f in files:
        compress(f)
