#!/usr/bin/env python3
"""Re-crop cut-off images (< 60px height) from original PDFs using bbox from problems.json."""

import json
import os
import glob
from PIL import Image, ImageOps
import fitz  # PyMuPDF

DPI = 150
SCALE = DPI / 72
HEADER_IGNORE = 50
FOOTER_IGNORE = 80
PADDING = 10
GAP_TOLERANCE = 120  # px gap to detect 확인사항 box separation
EXTRA_Y = 0.25       # extra page fraction to include before trimming

# ------- examId → original PDF path -------
SUBJECT_MAP = {
    'g1': '고1- 공통',
    'g2': '고2 - 공통',
    'g3-stats': '고3 - 확률과 통계',
    'g3-geom': '고3-기하',
    'g3-calc': '고3-미적분',
}

TYPE_MAP = {
    'academic': '학평',
    'mock': '모평',
    'csat': '수능',
}

# Special folder name overrides (examId → folder name inside subject dir)
SPECIAL_FOLDER = {
    'g3-geom-academic-2026-03': '2026-3월 학평-기하',
    'g3-stats-academic-2023-03': '2023 학평',   # no month in dir name
}


SPECIAL_PDF = {
    'g3-geom-academic-2026-03': 'data/exam/원본/고3-기하/2026-3월 학평-기하/2026-3월 학평 - 기하 - 문제.pdf',
}


def exam_id_to_pdf(exam_id: str) -> str:
    """Return path to 문제.pdf for the given examId."""
    if exam_id in SPECIAL_PDF:
        return SPECIAL_PDF[exam_id]

    if exam_id in SPECIAL_FOLDER:
        # Determine subject
        for prefix, subject in SUBJECT_MAP.items():
            if exam_id.startswith(prefix):
                folder = SPECIAL_FOLDER[exam_id]
                return f"data/exam/원본/{subject}/{folder}/문제.pdf"

    # Parse examId: g{grade}-{subject}-{type}-{year}(-{month})
    parts = exam_id.split('-')
    # grade part
    if parts[0] == 'g1':
        subject_key = 'g1'
        rest = parts[1:]
    elif parts[0] == 'g2':
        subject_key = 'g2'
        rest = parts[1:]
    else:  # g3
        subject_key = f'g3-{parts[1]}'
        rest = parts[2:]

    # rest[0] = type (academic/mock/csat), rest[1] = year, rest[2] = month (optional)
    exam_type = rest[0]
    year = rest[1]
    month = rest[2] if len(rest) > 2 else None

    subject_dir = SUBJECT_MAP[subject_key]
    type_str = TYPE_MAP[exam_type]

    if exam_type == 'csat':
        folder = f"{year} {type_str}"
    else:
        folder = f"{year} {int(month)}월 {type_str}"

    return f"data/exam/원본/{subject_dir}/{folder}/문제.pdf"


def first_content_block(gray_img, header_ignore=HEADER_IGNORE, footer_ignore=FOOTER_IGNORE, gap_tolerance=GAP_TOLERANCE):
    """Return (y_start, y_end) of first contiguous content block in img."""
    w, h = gray_img.size
    if h <= header_ignore + footer_ignore:
        inverted = ImageOps.invert(gray_img)
        bb = inverted.getbbox()
        if bb:
            return bb[1], bb[3]
        return 0, h

    inner = gray_img.crop((0, header_ignore, w, h - footer_ignore))
    inverted = ImageOps.invert(inner)

    # Row-wise: is there any non-white pixel?
    pixels = list(inverted.getdata())
    iw, ih = inner.size
    row_has_content = []
    for row in range(ih):
        row_pixels = pixels[row * iw:(row + 1) * iw]
        row_has_content.append(any(p > 240 for p in row_pixels))

    # Find first content row
    first_content = None
    for i, has in enumerate(row_has_content):
        if has:
            first_content = i
            break
    if first_content is None:
        return 0, h

    # Find end of first block (stop at gap >= GAP_TOLERANCE)
    last_content = first_content
    gap = 0
    for i in range(first_content, ih):
        if row_has_content[i]:
            last_content = i
            gap = 0
        else:
            gap += 1
            if gap >= gap_tolerance:
                break

    y_start = max(0, first_content + header_ignore - PADDING)
    y_end = min(h, last_content + header_ignore + PADDING)
    return y_start, y_end


def recrop_from_pdf(pdf_path: str, page_num: int, bbox: dict, output_path: str):
    """Re-crop a problem from PDF with extended bbox and smart trimming."""
    doc = fitz.open(pdf_path)
    page = doc[page_num - 1]  # 0-indexed
    page_rect = page.rect
    pw = page_rect.width
    ph = page_rect.height

    col = bbox.get('column', 'left')
    y_start_frac = bbox['yStart']
    y_end_frac = min(1.0, bbox['yEnd'] + EXTRA_Y)

    # Column x bounds
    if col == 'left':
        x0, x1 = 0, pw * 0.5
    elif col == 'right':
        x0, x1 = pw * 0.5, pw
    else:  # full
        x0, x1 = 0, pw

    y0 = ph * y_start_frac
    y1 = ph * y_end_frac

    clip = fitz.Rect(x0, y0, x1, y1)
    mat = fitz.Matrix(SCALE, SCALE)
    pix = page.get_pixmap(matrix=mat, clip=clip)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    gray = img.convert('L')

    ys, ye = first_content_block(gray)
    w = img.width
    cropped = img.crop((0, ys, w, ye))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cropped.save(output_path, 'webp', quality=85)
    doc.close()
    return cropped.size


FORCE_LIST = [
    "assets/exam/g1-academic-2025-03/problems/25.webp",
    "assets/exam/g2-academic-2024-03/problems/2.webp",
    "assets/exam/g2-academic-2024-03/problems/23.webp",
    "assets/exam/g2-academic-2025-03/problems/22.webp",
    "assets/exam/g2-academic-2025-03/problems/23.webp",
    "assets/exam/g2-academic-2025-03/problems/4.webp",
    "assets/exam/g2-academic-2025-03/problems/7.webp",
    "assets/exam/g3-calc-academic-2026-03/problems/2.webp",
    "assets/exam/g3-calc-academic-2026-03/problems/23.webp",
    "assets/exam/g3-calc-csat-2022/problems/16.webp",
    "assets/exam/g3-calc-csat-2024/problems/16.webp",
    "assets/exam/g3-calc-csat-2025/problems/16.webp",
    "assets/exam/g3-calc-csat-2025/problems/18.webp",
    "assets/exam/g3-calc-mock-2022-09/problems/2.webp",
    "assets/exam/g3-calc-mock-2023-06/problems/30.webp",
    "assets/exam/g3-calc-mock-2023-09/problems/1.webp",
    "assets/exam/g3-calc-mock-2025-06/problems/5.webp",
    "assets/exam/g3-calc-mock-2025-09/problems/16.webp",
    "assets/exam/g3-geom-academic-2022-03/problems/17.webp",
    "assets/exam/g3-geom-academic-2022-03/problems/18.webp",
    "assets/exam/g3-geom-academic-2023-03/problems/1.webp",
    "assets/exam/g3-geom-academic-2026-03/problems/16.webp",
    "assets/exam/g3-geom-csat-2024/problems/16.webp",
    "assets/exam/g3-geom-mock-2023-09/problems/13.webp",
    "assets/exam/g3-geom-mock-2025-06/problems/22.webp",
    "assets/exam/g3-geom-mock-2025-09/problems/16.webp",
    "assets/exam/g3-stats-academic-2023-03/problems/1.webp",
    "assets/exam/g3-stats-academic-2024-03/problems/23.webp",
    "assets/exam/g3-stats-academic-2026-03/problems/2.webp",
    "assets/exam/g3-stats-csat-2022/problems/16.webp",
    "assets/exam/g3-stats-csat-2022/problems/23.webp",
    "assets/exam/g3-stats-csat-2024/problems/16.webp",
    "assets/exam/g3-stats-csat-2024/problems/23.webp",
    "assets/exam/g3-stats-csat-2025/problems/16.webp",
    "assets/exam/g3-stats-csat-2025/problems/18.webp",
    "assets/exam/g3-stats-mock-2022-09/problems/2.webp",
    "assets/exam/g3-stats-mock-2022-09/problems/23.webp",
    "assets/exam/g3-stats-mock-2023-06/problems/15.webp",
    "assets/exam/g3-stats-mock-2023-06/problems/20.webp",
    "assets/exam/g3-stats-mock-2023-09/problems/1.webp",
    "assets/exam/g3-stats-mock-2025-06/problems/5.webp",
    "assets/exam/g3-stats-mock-2025-09/problems/16.webp",
]


def main():
    small = FORCE_LIST
    print(f"Processing {len(small)} images")

    print(f"Found {len(small)} images under 60px")

    # Build examId → problems.json mapping
    json_by_examid = {}
    for jp in glob.glob('data/exam/**/**/problems.json', recursive=True):
        try:
            with open(jp) as f:
                d = json.load(f)
            json_by_examid[d['examId']] = jp
        except Exception:
            pass

    fixed = 0
    failed = []

    for img_path in small:
        # Parse examId and number from path: assets/exam/{examId}/problems/{number}.webp
        parts = img_path.split('/')
        exam_id = parts[2]
        number = int(os.path.splitext(parts[4])[0])

        # Load bbox from problems.json
        jp = json_by_examid.get(exam_id)
        if not jp:
            failed.append((img_path, "no problems.json"))
            continue

        with open(jp) as f:
            d = json.load(f)
        problem = next((p for p in d['problems'] if p['number'] == number), None)
        if not problem:
            failed.append((img_path, "problem not found in JSON"))
            continue

        bbox = problem.get('bbox')
        if not bbox:
            failed.append((img_path, "no bbox"))
            continue

        page = problem.get('page')
        if not page:
            failed.append((img_path, "no page"))
            continue

        # Find PDF
        pdf_path = exam_id_to_pdf(exam_id)
        if not os.path.exists(pdf_path):
            failed.append((img_path, f"PDF not found: {pdf_path}"))
            continue

        try:
            new_size = recrop_from_pdf(pdf_path, page, bbox, img_path)
            print(f"[OK] {img_path} → {new_size[0]}x{new_size[1]}px")
            fixed += 1
        except Exception as e:
            failed.append((img_path, str(e)))

    print(f"\n=== Result ===")
    print(f"Fixed: {fixed}/{len(small)}")
    if failed:
        print(f"Failed ({len(failed)}):")
        for p, reason in failed:
            print(f"  {p}: {reason}")


if __name__ == '__main__':
    main()
