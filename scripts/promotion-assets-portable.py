#!/usr/bin/env python3
"""Render the existing promotion contract without npm, Chromium or a network.

Inputs remain the website's locale registry, print copy, share manifest, approved
icon, Newsreader face and approved illustration. ReportLab writes vector QR/PDF
content; Pillow writes social PNGs. A bundled Droid Sans fallback supplies CJK.
The small QR decoder below checks payloads sampled from rendered SVG/PDF pixels;
it is a clean-render verifier, not a general camera scanner or error corrector.

Requires Python packages: reportlab, Pillow, fontTools, PyMuPDF, pypdf.
Run from any directory: python3 scripts/promotion-assets-portable.py
"""

from __future__ import annotations

import argparse
from collections import Counter
from functools import lru_cache
import hashlib
from html import escape
import io
import json
import math
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unicodedata

import fitz
from fontTools.ttLib import TTFont as FontToolsFont
from PIL import Image, ImageDraw, ImageFont, ImageOps
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, TextStringObject
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/brand"
INK = "#1E2620"
PAPER = "#F7F3EC"
FERN = "#33613F"
RULE = "#B9BCAD"
ORIGIN = "https://lilora.app"
CJK = {"ja", "ko", "zh-Hant"}
CONTEXTS = ("home", "download", "a6", "a4")
FONT_CJK = ROOT / "assets/fonts/DroidSansFallback.ttf"
FONT_LATIN = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
FONT_BOLD = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
ICON = ROOT / "assets/icon.png"
PHOTO = ROOT / "assets/images/home/window-hero-v1-640.webp"
NEWSREADER = ROOT / "assets/Newsreader-Medium.woff"


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha(*items):
    h = hashlib.sha256()
    for item in items:
        h.update(item if isinstance(item, bytes) else str(item).encode("utf-8"))
    return h.hexdigest()


def native_text(value):
    # The source's words are retained; avoid nonbreaking hyphens in print exports.
    return unicodedata.normalize("NFC", str(value)).replace("\u2011", "-").replace("\u00ad", "")


def read_print_copy():
    """Reuse the six existing literal dictionaries without importing npm modules."""
    node = os.environ.get("CODEX_PRIMARY_RUNTIME_NODE", "node")
    code = """
      import {readFileSync} from 'node:fs';
      import vm from 'node:vm';
      const source=readFileSync('scripts/promotion-assets.mjs','utf8');
      const match=source.match(/const printCopy = (\\{[\\s\\S]*?\\n\\});/);
      if(!match) throw new Error('Cannot locate the existing print-copy literal');
      const copy=vm.runInNewContext('('+match[1]+')',{extraCopies:()=>({})},{timeout:1000});
      process.stdout.write(JSON.stringify(copy));
    """
    result = subprocess.run([node, "--input-type=module", "-e", code], cwd=ROOT,
                            check=True, capture_output=True, text=True)
    copies = json.loads(result.stdout)
    for path in (ROOT / "locales").glob("*.extras.json"):
        language = path.name.removesuffix(".extras.json")
        data = load_json(path)
        if "print" in data:
            copies[language] = data["print"]
    return copies


class Fonts:
    def __init__(self, temp):
        for path in (FONT_CJK, FONT_LATIN, FONT_BOLD, NEWSREADER):
            if not path.exists():
                raise FileNotFoundError(f"Required local font is missing: {path}")
        news = FontToolsFont(NEWSREADER)
        news.flavor = None
        news_path = Path(temp) / "Newsreader-Medium.ttf"
        news.save(news_path)
        self.paths = {"Newsreader": news_path, "Body": FONT_LATIN,
                      "BodyBold": FONT_BOLD, "CJK": FONT_CJK}
        self.maps = {}
        for name, path in self.paths.items():
            pdfmetrics.registerFont(TTFont(name, str(path)))
            self.maps[name] = FontToolsFont(path).getBestCmap()

    def name(self, lang, heading=False, bold=False):
        if lang in CJK:
            return "CJK"
        return "Newsreader" if heading else "BodyBold" if bold else "Body"

    def check(self, text, name):
        absent = sorted({ch for ch in text if not ch.isspace() and ord(ch) not in self.maps[name]})
        if absent:
            raise ValueError(f"Missing glyphs in {name}: {absent!r}")

    @lru_cache(maxsize=128)
    def pil(self, name, size):
        return ImageFont.truetype(str(self.paths[name]), round(size))


def wrap(text, measure, width, cjk=False):
    """Wrap CJK characters while keeping Korean words and Latin names together."""
    text = native_text(text)
    if cjk:
        # Japanese/Chinese wrap between characters; embedded Latin names and
        # space-separated Korean words should retain their ordinary boundaries.
        word = r"A-Za-z0-9\u00C0-\u024F\uAC00-\uD7A3"
        tokens = re.findall(rf"[{word}]+(?:[’'.:/_-][{word}]+)*[ \t]*|.", text)
    else:
        tokens = re.findall(r"\S+\s*", text)
    lines, line = [], ""
    closing = set("、。，．！？：；）］｝〉》」』】〕…,.!?;:)")
    opening = set("（［｛〈《「『【〔(")
    for token in tokens:
        trial = line + token
        if measure(trial.rstrip()) <= width or not line:
            line = trial
        else:
            if token[0] in closing:
                # Keep punctuation with the preceding CJK character or whole
                # Latin/Korean word; a colon must not split "PictureThis".
                prior = line.rstrip()
                ending = re.search(r"[A-Za-z0-9\u00C0-\u024F\uAC00-\uD7A3]+$|.$", prior)
                previous = ending[0] if ending else prior
                if len(prior) > len(previous):
                    lines.append(prior[:-len(previous)].rstrip())
                    line = previous + token
                else:
                    line = prior + token
            elif line.rstrip()[-1:] in opening:
                previous = line.rstrip()[-1]
                lines.append(line.rstrip()[:-1])
                line = previous + token.lstrip()
            else:
                lines.append(line.rstrip())
                line = token.lstrip()
        # Unusually long URLs/words must fit too, without adding visible hyphens.
        while measure(line.rstrip()) > width:
            cut = len(line) - 1
            while cut > 1 and measure(line[:cut]) > width:
                cut -= 1
            lines.append(line[:cut].rstrip())
            line = line[cut:].lstrip()
    if line.strip():
        lines.append(line.rstrip())
    return lines or [""]


def qr_matrix(url):
    code = QrCodeWidget(url, barLevel="M", barBorder=4)
    code.qr.make()
    return [[bool(cell) for cell in row] for row in code.qr.modules]


def qr_svg(matrix, title):
    n = len(matrix) + 8
    commands = []
    for row, cells in enumerate(matrix):
        for col, dark in enumerate(cells):
            if dark:
                commands.append(f"M{col+4},{row+4}h1v1h-1z")
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{n*8}" height="{n*8}" '
            f'viewBox="0 0 {n} {n}" shape-rendering="crispEdges"><title>{escape(title)}</title>'
            f'<rect width="{n}" height="{n}" fill="{PAPER}"/>'
            f'<path fill="{INK}" d="{"".join(commands)}"/></svg>\n')


# ISO/IEC 18004 Model 2 level-M block sizes, versions 1-10. URLs in this
# collection use a subset of these. Values are total/data codewords per block.
QR_M_BLOCKS = {
    1: [(26, 16)], 2: [(44, 28)], 3: [(70, 44)], 4: [(50, 32)] * 2,
    5: [(67, 43)] * 2, 6: [(43, 27)] * 4, 7: [(49, 31)] * 4,
    8: [(60, 38)] * 2 + [(61, 39)] * 2,
    9: [(58, 36)] * 3 + [(59, 37)] * 2,
    10: [(69, 43)] * 4 + [(70, 44)],
}
QR_ALIGNMENT = {1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
                6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42],
                9: [6, 26, 46], 10: [6, 28, 50]}


def decode_clean_qr(matrix):
    """Independent format/unmask/deinterleave/byte decoder for clean rendered QRs."""
    n = len(matrix)
    version = (n - 17) // 4
    if version not in QR_M_BLOCKS or n != 17 + version * 4:
        raise AssertionError(f"Unsupported QR size {n}")
    coords = [(i, 8) if i < 6 else (i + 1, 8) if i < 8 else (n - 15 + i, 8)
              for i in range(15)]
    observed = sum(int(matrix[r][c]) << i for i, (r, c) in enumerate(coords))
    matches = []
    for value in range(32):
        remainder = value << 10
        while remainder.bit_length() >= 11:
            remainder ^= 0x537 << (remainder.bit_length() - 11)
        code = ((value << 10) | remainder) ^ 0x5412
        if code == observed:
            matches.append(value)
    if len(matches) != 1 or matches[0] >> 3 != 0:
        raise AssertionError("Rendered QR format bits are not intact at level M")
    mask = matches[0] & 7
    reserved = [[False] * n for _ in range(n)]

    def reserve(top, left, height, width):
        for r in range(top, top + height):
            for c in range(left, left + width):
                reserved[r][c] = True

    reserve(0, 0, 9, 9)
    reserve(0, n - 8, 9, 8)
    reserve(n - 8, 0, 8, 9)
    for index in range(n):
        reserved[6][index] = reserved[index][6] = True
    for r in QR_ALIGNMENT[version]:
        for c in QR_ALIGNMENT[version]:
            if (r, c) in ((6, 6), (6, n - 7), (n - 7, 6)):
                continue
            reserve(r - 2, c - 2, 5, 5)
    if version >= 7:
        reserve(0, n - 11, 6, 3)
        reserve(n - 11, 0, 3, 6)

    def masked(r, c):
        return ((r+c) % 2 == 0, r % 2 == 0, c % 3 == 0,
                (r+c) % 3 == 0, (r//2+c//3) % 2 == 0,
                (r*c) % 2+(r*c) % 3 == 0,
                ((r*c) % 2+(r*c) % 3) % 2 == 0,
                ((r*c) % 3+(r+c) % 2) % 2 == 0)[mask]

    bits = []
    right, upward = n - 1, True
    while right > 0:
        if right == 6:
            right -= 1
        rows = range(n - 1, -1, -1) if upward else range(n)
        for r in rows:
            for c in (right, right - 1):
                if not reserved[r][c]:
                    bits.append(int(matrix[r][c]) ^ int(masked(r, c)))
        right -= 2
        upward = not upward
    codewords = [sum(bit << (7-i) for i, bit in enumerate(bits[k:k+8]))
                 for k in range(0, len(bits)-7, 8)]
    specs = QR_M_BLOCKS[version]
    blocks = [bytearray(data) for _, data in specs]
    index = 0
    for offset in range(max(data for _, data in specs)):
        for block in blocks:
            if offset < len(block):
                block[offset] = codewords[index]
                index += 1
    payload = b"".join(blocks)
    stream = "".join(f"{byte:08b}" for byte in payload)
    position = 0

    def take(count):
        nonlocal position
        value = int(stream[position:position+count], 2)
        position += count
        return value

    output = bytearray()
    while position + 4 <= len(stream):
        mode = take(4)
        if mode == 0:
            break
        if mode != 4:
            raise AssertionError(f"Unexpected non-byte URL segment {mode}")
        count = take(8 if version < 10 else 16)
        output.extend(take(8) for _ in range(count))
    return output.decode("utf-8")


def sample_qr(image, modules):
    image = image.convert("RGB")
    cells = modules + 8
    matrix = []
    for row in range(cells):
        values = []
        for col in range(cells):
            x = min(image.width - 1, int((col + .5) * image.width / cells))
            y = min(image.height - 1, int((row + .5) * image.height / cells))
            rgb = image.getpixel((x, y))
            dark = sum(rgb) / 3 < 130
            if row < 4 or col < 4 or row >= cells - 4 or col >= cells - 4:
                if dark:
                    raise AssertionError("QR quiet zone contains dark pixels")
            else:
                values.append(dark)
        if 4 <= row < cells - 4:
            matrix.append(values)
    return matrix


def verify_svg(path, expected, modules):
    source = fitz.open(stream=path.read_bytes(), filetype="svg")
    pdf = fitz.open(stream=source.convert_to_pdf(), filetype="pdf")
    pix = pdf[0].get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    result = decode_clean_qr(sample_qr(image, modules))
    if result != expected:
        raise AssertionError(f"Rendered SVG decoded incorrectly: {path}: {result}")
    source.close()
    pdf.close()
    return result


def draw_qr(pdf, matrix, x, top, size, page_height):
    cell = size / (len(matrix) + 8)
    pdf.setFillColor(colors.HexColor(PAPER))
    pdf.rect(x, page_height-top-size, size, size, stroke=0, fill=1)
    pdf.setFillColor(colors.HexColor(INK))
    path = pdf.beginPath()
    for r, row in enumerate(matrix):
        for c, dark in enumerate(row):
            if dark:
                path.rect(x+(c+4)*cell, page_height-top-(r+5)*cell, cell, cell)
    pdf.drawPath(path, stroke=0, fill=1)


def pdf_lines(text, font, size, width, cjk):
    return wrap(text, lambda s: pdfmetrics.stringWidth(s, font, size), width, cjk)


def make_print_plan(lang, copy, compact, fonts):
    width, height = ((105*mm, 148*mm) if compact else (210*mm, 297*mm))
    margin = (8 if compact else 19)*mm
    available = width - 2*margin
    qr_size = (30 if compact else 48)*mm
    bodyfont = fonts.name(lang)
    titlefont = fonts.name(lang, heading=True)
    for scale in (1, .96, .92, .88, .84, .80):
        footer_size = 7 if compact else 10
        footer = pdf_lines(copy["languages"], bodyfont, footer_size, available, lang in CJK)
        footer_height = len(footer)*footer_size*1.4
        closing_top = height-margin-footer_height-(3 if compact else 7)*mm-qr_size
        elements = []
        top = margin
        brand_height = (8 if compact else 12)*mm
        elements.append(("brand", top, brand_height))
        top += brand_height + (5 if compact else 11)*mm

        def block(key, size, leading, heading=False, bold=False, gap=0):
            nonlocal top
            top += gap
            name = titlefont if heading else fonts.name(lang, bold=bold)
            size = max(8.5 if compact else 10, size*scale)
            lines = pdf_lines(copy[key], name, size, available, lang in CJK)
            elements.append(("text", top, lines, name, size, leading*size, key))
            top += len(lines)*leading*size

        block("title", 22 if compact else 46, 1.08, heading=True)
        block("shortPitch" if compact else "pitch", 9.5 if compact else 16, 1.43,
              gap=(2 if compact else 6)*mm)
        if not compact:
            image_height = (42 - (1-scale)*55)*mm
            top += 8*mm
            elements.append(("image", top, image_height))
            top += image_height
            block("free", 11, 1.45, gap=5*mm)
        top += (3 if compact else 8)*mm
        elements.append(("rule", top))
        top += (2 if compact else 6)*mm
        block("status", 8.5 if compact else 14, 1.4, bold=True)
        if not compact:
            block("follow", 14, 1.4, gap=1*mm)
        if compact:
            image_height = (33 - (1-scale)*45)*mm
            top += 4*mm
            elements.append(("image", top, image_height))
            top += image_height
        if top + 3*mm <= closing_top:
            gap = (4 if compact else 10)*mm
            right_width = available-qr_size-gap
            scan_size = (15 if compact else 26)*scale
            scan = pdf_lines(copy["scan"], titlefont, scan_size, right_width, lang in CJK)
            url_size = 8 if compact else 12
            return dict(width=width, height=height, margin=margin, available=available,
                        elements=elements, closing_top=closing_top, qr_size=qr_size,
                        footer=footer, footer_size=footer_size, footer_height=footer_height,
                        scan=scan, scan_size=scan_size, titlefont=titlefont,
                        bodyfont=bodyfont, right_width=right_width, gap=gap,
                        url_size=url_size, scale=scale)
    raise ValueError(f"Print copy cannot fit without clipping: {lang}/{'a6' if compact else 'a4'}")


def render_print(path, lang, tag, prefix, copy, compact, fonts, matrix, qrurl, photo, icon):
    plan = make_print_plan(lang, copy, compact, fonts)
    width, height, margin = (plan[k] for k in ("width", "height", "margin"))
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(width, height), pageCompression=1, invariant=1)
    pdf.setTitle(copy["title"])
    pdf.setAuthor("Lilora - Umut OREN")
    pdf.setSubject(copy["status"])
    pdf.setCreator("Lilora offline promotion renderer")
    pdf.setFillColor(colors.HexColor(PAPER))
    pdf.rect(0, 0, width, height, stroke=0, fill=1)

    def draw_lines(lines, x, top, name, size, leading):
        pdf.setFont(name, size)
        pdf.setFillColor(colors.HexColor(INK))
        ascent = pdfmetrics.getAscent(name)*size/1000
        for line in lines:
            fonts.check(line, name)
            if x+pdfmetrics.stringWidth(line, name, size) > width-margin+.1:
                raise AssertionError(f"Text exceeds page width: {path}: {line}")
            pdf.drawString(x, height-top-ascent, line)
            top += leading

    for element in plan["elements"]:
        kind, top = element[:2]
        if kind == "brand":
            size = element[2]
            pdf.drawImage(ImageReader(icon), margin, height-top-size, size, size)
            draw_lines(["lilora"], margin+size+(2.5 if compact else 4)*mm, top-1,
                       "Newsreader", 24 if compact else 36, size)
        elif kind == "text":
            _, _, lines, name, size, leading, _ = element
            draw_lines(lines, margin, top, name, size, leading)
        elif kind == "rule":
            pdf.setStrokeColor(colors.HexColor(RULE))
            pdf.setLineWidth(.6)
            pdf.line(margin, height-top, width-margin, height-top)
        elif kind == "image":
            image_height = element[2]
            target = (round(plan["available"]*3), round(image_height*3))
            crop = ImageOps.fit(photo, target, method=Image.Resampling.LANCZOS, centering=(.5, .58))
            jpeg = io.BytesIO()
            crop.save(jpeg, format="JPEG", quality=90)
            pdf.drawImage(ImageReader(io.BytesIO(jpeg.getvalue())), margin,
                          height-top-image_height, plan["available"], image_height)
    top, qrsize = plan["closing_top"], plan["qr_size"]
    draw_qr(pdf, matrix, margin, top, qrsize, height)
    pdf.linkURL(qrurl, (margin, height-top-qrsize, margin+qrsize, height-top), relative=0)
    x = margin+qrsize+plan["gap"]
    address = "lilora.app"+prefix+"download/"
    addresses = pdf_lines(address, "Body", plan["url_size"], plan["right_width"], False)
    block_height = len(plan["scan"])*plan["scan_size"]*1.15+3*mm+len(addresses)*plan["url_size"]*1.35
    if block_height > qrsize:
        raise AssertionError(f"QR caption too tall: {path}")
    caption_top = top+(qrsize-block_height)/2
    draw_lines(plan["scan"], x, caption_top, plan["titlefont"], plan["scan_size"], plan["scan_size"]*1.15)
    address_top = caption_top+len(plan["scan"])*plan["scan_size"]*1.15+3*mm
    draw_lines(addresses, x, address_top, "Body", plan["url_size"], plan["url_size"]*1.35)
    pdf.linkURL(ORIGIN+prefix+"download/", (x, height-address_top-len(addresses)*plan["url_size"]*1.35,
                width-margin, height-address_top), relative=0)
    draw_lines(plan["footer"], margin, height-margin-plan["footer_height"], plan["bodyfont"],
               plan["footer_size"], plan["footer_size"]*1.4)
    pdf.showPage()
    pdf.save()
    writer = PdfWriter(clone_from=io.BytesIO(buffer.getvalue()))
    writer.root_object[NameObject("/Lang")] = TextStringObject(tag)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as handle:
        writer.write(handle)
    return plan


def verify_pdf(path, plan, matrix, qrurl, copy, compact, review_dir):
    document = fitz.open(path)
    if len(document) != 1:
        raise AssertionError(f"PDF is not one page: {path}")
    page = document[0]
    if abs(page.rect.width-plan["width"]) > .01 or abs(page.rect.height-plan["height"]) > .01:
        raise AssertionError(f"Incorrect PDF page size: {path}")
    normalize = lambda value: re.sub(r"\s+", "", native_text(value))
    extracted = normalize(page.get_text())
    keys = ["title", "shortPitch" if compact else "pitch", "status", "scan", "languages"]
    if not compact:
        keys += ["free", "follow"]
    for key in keys:
        if normalize(copy[key]) not in extracted:
            raise AssertionError(f"Missing translated PDF text: {path}: {key}")
    x, y, size = plan["margin"], plan["closing_top"], plan["qr_size"]
    pix = page.get_pixmap(matrix=fitz.Matrix(4, 4), clip=fitz.Rect(x, y, x+size, y+size), alpha=False)
    crop = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    decoded = decode_clean_qr(sample_qr(crop, len(matrix)))
    if decoded != qrurl:
        raise AssertionError(f"Rendered PDF QR decoded incorrectly: {path}: {decoded}")
    if review_dir:
        review_dir.mkdir(parents=True, exist_ok=True)
        scale = 800/page.rect.height
        page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False).save(review_dir/(path.stem+".png"))
    document.close()
    return decoded


def render_social(path, entry, fonts, base):
    lang, title = entry["lang"], native_text(entry["title"])
    name = fonts.name(lang, heading=True)
    fonts.check(title, name)
    # The 790 px copy column and 410 px illustration preserve the existing design.
    text_width, box_top, box_bottom = 662, 192, 516
    largest = 68 if lang in CJK else 76
    for size in range(largest, 35, -1):
        font = fonts.pil(name, size)
        lines = wrap(title, font.getlength, text_width, lang in CJK)
        leading = round(size*(1.22 if lang in CJK else 1.12))
        height = len(lines)*leading
        if height <= box_bottom-box_top:
            break
    else:
        raise ValueError(f"Social title cannot fit: {entry}")
    image = base.copy()
    draw = ImageDraw.Draw(image)
    top = box_top+(box_bottom-box_top-height)/2
    for line in lines:
        if font.getlength(line) > text_width+.5:
            raise AssertionError(f"Social text overflows: {path}")
        draw.text((64, round(top)), line, font=font, fill=INK, anchor="lt")
        top += leading
    path.parent.mkdir(parents=True, exist_ok=True)
    # Publish complete PNG bytes atomically so readers cannot observe a partial
    # stream while a long image batch is being rendered.
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, suffix=".tmp", delete=False) as output:
        output.write(buffer.getvalue())
        temporary = Path(output.name)
    os.replace(temporary, path)
    return {"font": name, "fontSize": size, "lines": len(lines)}


def verify_export_set(definitions, copies):
    """Read-only verification also accepts retained original Chromium exports."""
    prefixes = {entry["code"]: entry["path"] for entry in definitions}
    qr_entries = load_json(OUT/"qr/manifest.json")
    expected_contexts = {(lang, context) for lang in prefixes for context in CONTEXTS}
    assert len(qr_entries) == len(expected_contexts)
    assert {(e["lang"], e["context"]) for e in qr_entries} == expected_contexts
    qr_by_context = {}
    for entry in qr_entries:
        lang, context = entry["lang"], entry["context"]
        expected = f"{ORIGIN}{prefixes[lang]}download/?utm_source=qr&utm_medium={context}&utm_campaign=prelaunch"
        assert entry["url"] == expected
        path = ROOT/entry["file"].lstrip("/")
        viewbox = re.search(r'viewBox="0 0 (\d+) \d+"', path.read_text())
        assert viewbox and int(viewbox[1])-8 == entry["modules"]
        assert entry["quietZone"] == 4 and entry["errorCorrection"] == "M"
        verify_svg(path, expected, entry["modules"])
        qr_by_context[lang, context] = entry
    print_entries = load_json(OUT/"print/manifest.json")
    expected_prints = {(lang, format) for lang in prefixes for format in ("a6", "a4")}
    assert len(print_entries) == len(expected_prints)
    assert {(e["lang"], e["format"]) for e in print_entries} == expected_prints
    normalize = lambda value: re.sub(r"\s+", "", native_text(value))
    for entry in print_entries:
        lang, format = entry["lang"], entry["format"]
        qr = qr_by_context[lang, format]
        assert entry["qrUrl"] == qr["url"]
        path = ROOT/entry["file"].lstrip("/")
        with fitz.open(path) as document:
            assert len(document) == 1, path
            page = document[0]
            expected_mm = [105, 148] if format == "a6" else [210, 297]
            assert entry["pageMillimetres"] == expected_mm
            for actual, millimetres in zip([page.rect.width, page.rect.height], expected_mm):
                # Chromium rounds media boxes to pixels; the print contract allows <1pt.
                assert abs(actual-millimetres*mm) < 1, path
            keys = ["title", "shortPitch" if format == "a6" else "pitch", "status", "scan", "languages"]
            if format == "a4":
                keys += ["free", "follow"]
            text = normalize(page.get_text())
            assert all(normalize(copies[lang][key]) in text for key in keys), path
            links = [link for link in page.get_links() if link.get("uri") == qr["url"]]
            assert len(links) == 1, path
            pix = page.get_pixmap(matrix=fitz.Matrix(4, 4), clip=links[0]["from"], alpha=False)
            pixels = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            assert decode_clean_qr(sample_qr(pixels, qr["modules"])) == qr["url"], path
    share = load_json(OUT/"share-manifest.json")
    assert {e["lang"] for e in share["defaults"]} == set(prefixes)
    assert len(share["defaults"]) == len(prefixes)
    assert len(share["pages"]) == len(load_json(ROOT/"editorial/routes.json"))+1
    for entry in share["defaults"]+share["pages"]:
        assert entry["lang"] in prefixes
        with Image.open(ROOT/entry["image"].lstrip("/")) as image:
            image.load()
            assert image.size == (1200, 630), entry["image"]
    with Image.open(ROOT/"assets/apple-touch-icon.png") as image:
        image.load()
        assert image.size == (180, 180)
    return {"qrSvgDecoded": len(qr_entries), "pdfTextAndQrVerified": len(print_entries),
            "pngFullyDecoded": len(share["defaults"])+len(share["pages"]), "icon": 1}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", default="qr,print,share,icon", help="Comma-separated output groups")
    parser.add_argument("--force", action="store_true", help="Re-render cached outputs")
    parser.add_argument("--verify-only", action="store_true", help="Read-only validation of all current exports, including retained originals")
    parser.add_argument("--review-dir", type=Path, help="Save PNG previews of print pages outside published outputs")
    args = parser.parse_args()
    groups = set(args.only.split(","))
    if groups - {"qr", "print", "share", "icon"}:
        parser.error("Unknown output group")
    registry = load_json(ROOT/"config/languages.json")
    definitions = registry["languages"]
    copies = read_print_copy()
    for definition in definitions:
        if definition["code"] not in copies:
            raise ValueError(f"Missing translated print copy: {definition['code']}")
    if args.verify_only:
        print(json.dumps(verify_export_set(definitions, copies)), flush=True)
        return
    cache_path = OUT/"asset-fingerprints.json"
    cache = load_json(cache_path) if cache_path.exists() else {}
    version = sha(Path(__file__).read_bytes(), NEWSREADER.read_bytes(), FONT_CJK.read_bytes(),
                  FONT_LATIN.read_bytes(), FONT_BOLD.read_bytes(), ICON.read_bytes(), PHOTO.read_bytes())
    counts = Counter()
    report = {"renderer": "promotion-assets-portable.py", "languages": [d["code"] for d in definitions],
              "networkRequests": 0, "qrDecodedFromRenderedPixels": [], "pdfs": [], "social": []}

    def needs(path, fingerprint):
        relative = path.relative_to(ROOT).as_posix()
        previous = cache.get(relative)
        cache[relative] = fingerprint
        return args.force or not path.exists() or previous != fingerprint

    with tempfile.TemporaryDirectory(prefix="lilora-promotion-") as temp:
        fonts = Fonts(temp)
        icon = Image.open(ICON).convert("RGB")
        photo = Image.open(PHOTO).convert("RGB")
        qr_manifest = []
        matrices = {}
        for definition in definitions:
            lang, prefix = definition["code"], definition["path"]
            for context in CONTEXTS:
                url = f"{ORIGIN}{prefix}download/?utm_source=qr&utm_medium={context}&utm_campaign=prelaunch"
                matrix = qr_matrix(url)
                matrices[lang, context] = (matrix, url)
                path = OUT/"qr"/f"{lang}-{context}.svg"
                if "qr" in groups:
                    if needs(path, sha(version, url, copies[lang]["scan"])):
                        path.parent.mkdir(parents=True, exist_ok=True)
                        path.write_text(qr_svg(matrix, copies[lang]["scan"]), encoding="utf-8")
                        counts["written"] += 1
                    decoded = verify_svg(path, url, len(matrix))
                    report["qrDecodedFromRenderedPixels"].append({"file": str(path.relative_to(ROOT)), "url": decoded})
                    counts["qr"] += 1
                qr_manifest.append(dict(lang=lang, context=context, file="/"+path.relative_to(ROOT).as_posix(),
                                        url=url, modules=len(matrix), quietZone=4, foreground=INK,
                                        background=PAPER, errorCorrection="M"))
        if "qr" in groups:
            save_json(OUT/"qr/manifest.json", qr_manifest)
            print(f"QR SVGs: {counts['qr']}; all payloads decoded from rendered pixels.", flush=True)
        if "icon" in groups:
            path = ROOT/"assets/apple-touch-icon.png"
            if needs(path, sha(version, "icon180")):
                icon.resize((180, 180), Image.Resampling.LANCZOS).save(path, "PNG", optimize=True)
                counts["written"] += 1
        if "print" in groups:
            manifest = []
            for definition in definitions:
                lang, prefix, tag = definition["code"], definition["path"], definition["tag"]
                copy = {key: native_text(value) for key, value in copies[lang].items()}
                for format in ("a6", "a4"):
                    compact = format == "a6"
                    matrix, url = matrices[lang, format]
                    path = OUT/"print"/f"lilora-{lang}-{format}.pdf"
                    fingerprint = sha(version, lang, format, url, json.dumps(copy, ensure_ascii=False))
                    if needs(path, fingerprint):
                        plan = render_print(path, lang, tag, prefix, copy, compact, fonts, matrix, url, photo, icon)
                        counts["written"] += 1
                    else:
                        plan = make_print_plan(lang, copy, compact, fonts)
                    decoded = verify_pdf(path, plan, matrix, url, copy, compact, args.review_dir)
                    manifest.append(dict(lang=lang, format=format, file="/"+path.relative_to(ROOT).as_posix(),
                                         pageMillimetres=[105, 148] if compact else [210, 297],
                                         qrMillimetres=30 if compact else 48, qrUrl=url, status="prelaunch"))
                    report["pdfs"].append({"file": str(path.relative_to(ROOT)), "pages": 1,
                                            "textVerified": True, "decodedQrUrl": decoded,
                                            "layoutScale": plan["scale"]})
                    counts["pdf"] += 1
                print(f"Print PDFs: {lang} A6/A4 text, dimensions and rendered QR verified.", flush=True)
            save_json(OUT/"print/manifest.json", manifest)
        if "share" in groups:
            share = load_json(OUT/"share-manifest.json")
            expected = {d["code"] for d in definitions}
            if {entry["lang"] for entry in share["defaults"]} != expected:
                raise ValueError("Share manifest is stale; run the page build for every locale first")
            base = Image.new("RGB", (1200, 630), PAPER)
            crop = ImageOps.fit(photo, (410, 630), Image.Resampling.LANCZOS, centering=(.6, .5))
            base.paste(crop, (790, 0))
            base.paste(icon.resize((64, 64), Image.Resampling.LANCZOS), (64, 64))
            draw = ImageDraw.Draw(base)
            draw.text((143, 69), "lilora", font=fonts.pil("Newsreader", 50), fill=INK, anchor="lt")
            draw.text((64, 557), "lilora.app", font=fonts.pil("Body", 23), fill=FERN, anchor="lt")
            draw.line((790, 0, 790, 629), fill="#D8D6C9", width=1)
            entries = share["defaults"] + share["pages"]
            for index, entry in enumerate(entries, 1):
                path = ROOT/entry["image"].lstrip("/")
                if not path.is_relative_to(OUT/"share"):
                    raise ValueError(f"Unexpected share destination: {path}")
                fingerprint = sha(version, json.dumps(entry, ensure_ascii=False, sort_keys=True))
                detail = None
                if needs(path, fingerprint):
                    detail = render_social(path, entry, fonts, base)
                    counts["written"] += 1
                with Image.open(path) as image:
                    image.load()
                    if image.size != (1200, 630):
                        raise AssertionError(f"Incorrect social image dimensions: {path}")
                report["social"].append({"file": str(path.relative_to(ROOT)), "lang": entry["lang"],
                                          "title": entry["title"], **(detail or {})})
                counts["share"] += 1
                if index % 50 == 0 or index == len(entries):
                    print(f"Social PNGs: {index}/{len(entries)} complete.", flush=True)
        save_json(cache_path, cache)
        report["counts"] = dict(counts)
        save_json(OUT/"portable-render-report.json", report)
        print(json.dumps(dict(counts)), flush=True)


if __name__ == "__main__":
    main()
