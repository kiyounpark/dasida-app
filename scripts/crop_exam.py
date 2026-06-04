#!/usr/bin/env python3
"""
시험지 PDF에서 문제별 이미지 크롭 + problems.json 생성.

dasida-exam-extraction 스킬 기준.
- 문제번호(N.) 앵커 좌표로 column/yStart/yEnd 자동 산출 (시각 판독 X)
- score는 [N점] 토큰에서 추출
- type/answer는 정답표(ANSWER_KEY)에서 주입 (동그라미=객관식, 맨숫자=단답)
- 안내박스/푸터/단 구분선 제거, 그림은 보존
- 정답 30/30 교차검증 후 통과 시에만 파일 출력

사용:
  python3 scripts/crop_exam.py            # stats, calc, geom 전부
  python3 scripts/crop_exam.py calc       # 특정 과목만
  python3 scripts/crop_exam.py calc --dry # 검증만(파일 미출력)
"""
import fitz, re, json, os, sys
from PIL import Image, ImageChops

PDF = "/Users/baggiyun/Downloads/math_main_mun_KKD67VZI.pdf"
REPO = "/Users/baggiyun/dev/dasida-app"

# ── 2027학년도 6월 모평 수학: 정답표 ground truth ───────────────────────
# 공통(1~22): 3개 선택과목 모두 동일. p1~8.
COMMON_PAGES = range(0, 8)
COMMON_MC = {1:2, 2:5, 3:4, 4:3, 5:1, 6:1, 7:2, 8:4, 9:3, 10:3,
             11:1, 12:1, 13:5, 14:3, 15:4}
COMMON_SA = {16:2, 17:10, 18:15, 19:9, 20:48, 21:11, 22:32}

# 선택(23~30): 과목별 페이지 + 정답
SUBJECTS = {
    "stats": dict(pages=range(8, 12),
                  mc={23:3, 24:2, 25:1, 26:5, 27:4, 28:3}, sa={29:98, 30:780}),
    "calc":  dict(pages=range(12, 16),
                  mc={23:4, 24:3, 25:2, 26:5, 27:1, 28:3}, sa={29:54, 30:20}),
    "geom":  dict(pages=range(16, 20),
                  mc={23:5, 24:3, 25:3, 26:1, 27:2, 28:4}, sa={29:14, 30:29}),
}
# ──────────────────────────────────────────────────────────────────────

# 레이아웃 상수 (2단, W=842 H=1191 기준)
MID = 421.0
COL = {"left": (50, 415), "right": (426, 795)}  # 단 사이 세로 구분선(x=421) 회피
TOP_PAD = 10      # 문제번호 위 여백(pt) — 헤더 가로줄 아래로
GAP = 8           # 다음 문제 시작 직전(pt)
BOTTOM = 1060     # 단 하단(푸터 가로줄/페이지번호 1082pt+ 제외, pt)
TRIM_PAD = 50     # 세로 트림 후 위아래 여백(px) — 곡선/내용이 프레임에 붙지 않게
OUT_W = 754       # 최종 webp 너비(기존 자산과 통일)
ZOOM = 3.0        # 렌더 배율
SCORE_RE = re.compile(r'\[\s*(\d)\s*점\s*\]')
NUM_RE = re.compile(r'^(\d{1,2})\.$')
NOTICE_RE = re.compile(r'확인\s*사항|선택\s*과목|답안지|이어서|제시되오니')


def trim_vertical(im, pad):
    """좌우 전체 너비는 유지하고 위아래 빈 여백만 잘라냄 (너비 일관성 유지)."""
    bg = Image.new("RGB", im.size, (255, 255, 255))
    bbox = ImageChops.difference(im, bg).getbbox()
    if not bbox:
        return im
    t = max(0, bbox[1] - pad)
    b = min(im.height, bbox[3] + pad)
    return im.crop((0, t, im.width, b))


def notice_cap(pg, xr, y_top, y_cap):
    """문제 단 아래쪽 안내박스(다음 과목 안내 등)가 있으면 그 윗변 위로 cap."""
    x0, x1 = xr
    notes = [w[1] for w in pg.get_text("words")
             if x0 <= (w[0]+w[2])/2 <= x1 and y_top + 30 < w[1] < y_cap
             and NOTICE_RE.search(w[4])]
    if not notes:
        return y_cap
    box_tops = [d["rect"].y0 for d in pg.get_drawings()
                if x0 <= (d["rect"].x0 + d["rect"].x1)/2 <= x1
                and d["rect"].width > 250 and y_top + 150 < d["rect"].y0 < y_cap]
    return (min(box_tops) - 8) if box_tops else (min(notes) - 35)


def extract(doc, exam_id, sections, answer_key, type_map):
    problems, crop_jobs = [], []
    for pages in sections:
        for pi in pages:
            pg = doc[pi]; H = pg.rect.height
            words = pg.get_text("words")
            anchors, scores = [], []
            for w in words:
                x0, y0, word = w[0], w[1], w[4]
                m = NUM_RE.match(word)
                if m and 1 <= int(m.group(1)) <= 30 and y0 > 120:
                    anchors.append((int(m.group(1)), x0, y0))
                sm = SCORE_RE.search(word)
                if sm:
                    scores.append((int(sm.group(1)), x0, y0))
            cols = {"left": [], "right": []}
            for n, x0, y0 in anchors:
                cols["left" if x0 < MID else "right"].append((n, x0, y0))
            for c in cols:
                cols[c].sort(key=lambda a: a[2])
            for c, lst in cols.items():
                for i, (n, x0, y0) in enumerate(lst):
                    y_start = y0 - TOP_PAD
                    y_cap = (lst[i+1][2] - GAP) if i+1 < len(lst) else BOTTOM
                    y_end = notice_cap(pg, COL[c], y_start, y_cap)
                    cand = [s for s in scores
                            if (s[1] < MID) == (c == "left") and y0-5 <= s[2] <= y_end]
                    problems.append({
                        "number": n, "page": pi+1, "type": type_map[n],
                        "score": cand[0][0] if cand else None,
                        "answer": answer_key[n], "topic": "기타",
                        "diagnosisMethods": ["unknown"],
                        "imageKey": f"assets/exam/{exam_id}/problems/{n}.webp",
                        "bbox": {"column": c, "yStart": round(y_start/H, 3),
                                 "yEnd": round(y_end/H, 3)},
                    })
                    crop_jobs.append((n, pi, c, y_start, y_end))
    problems.sort(key=lambda p: p["number"])
    return problems, crop_jobs


def verify(problems, answer_key):
    nums = [p["number"] for p in problems]
    dup = sorted({n for n in nums if nums.count(n) > 1})
    miss = sorted(set(range(1, 31)) - set(nums))
    mismatch = [p["number"] for p in problems if p["answer"] != answer_key[p["number"]]]
    noscore = [p["number"] for p in problems if p["score"] is None]
    bad = [p["number"] for p in problems if p["bbox"]["yStart"] >= p["bbox"]["yEnd"]]
    print(f"  완전성: {len(nums)}문제 " + ("✅" if not miss and not dup else f"❌ 누락{miss} 중복{dup}"))
    print(f"  정답 교차검증: " + ("30/30 일치 ✅" if not mismatch else f"❌ {mismatch}"))
    print(f"  배점: " + ("전부 ✅" if not noscore else f"⚠️ 누락 {noscore}"))
    print(f"  bbox: " + ("yStart<yEnd ✅" if not bad else f"❌ {bad}"))
    return not (miss or dup or mismatch or bad)


def render(doc, exam_id, crop_jobs):
    img_dir = f"{REPO}/assets/exam/{exam_id}/problems"
    os.makedirs(img_dir, exist_ok=True)
    page_pix = {}
    for n, pi, c, y0, y1 in crop_jobs:
        if pi not in page_pix:
            pix = doc[pi].get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM))
            page_pix[pi] = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        img = page_pix[pi]
        x0, x1 = COL[c]
        crop = trim_vertical(img.crop((int(x0*ZOOM), int(y0*ZOOM),
                                       int(x1*ZOOM), int(y1*ZOOM))), TRIM_PAD)
        if crop.width != OUT_W:
            crop = crop.resize((OUT_W, round(crop.height*OUT_W/crop.width)), Image.LANCZOS)
        crop.save(f"{img_dir}/{n}.webp", "WEBP", quality=88)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry" in sys.argv
    targets = args if args else list(SUBJECTS)
    doc = fitz.open(PDF)
    for subj in targets:
        cfg = SUBJECTS[subj]
        exam_id = f"g3-{subj}-mock-2026-06"
        mc = {**COMMON_MC, **cfg["mc"]}
        sa = {**COMMON_SA, **cfg["sa"]}
        answer_key = {**mc, **sa}
        type_map = {**{n: "multiple_choice" for n in mc},
                    **{n: "short_answer" for n in sa}}
        sections = [COMMON_PAGES, cfg["pages"]]
        problems, crop_jobs = extract(doc, exam_id, sections, answer_key, type_map)
        print(f"\n=== {exam_id} 검증 ===")
        ok = verify(problems, answer_key)
        if not ok:
            print("  검증 실패 → 건너뜀"); continue
        if dry:
            print("  [dry-run] 파일 미출력"); continue
        render(doc, exam_id, crop_jobs)
        data_dir = f"{REPO}/data/exam/{exam_id}"
        os.makedirs(data_dir, exist_ok=True)
        with open(f"{data_dir}/problems.json", "w") as f:
            json.dump({"examId": exam_id, "extractedAt": "2026-06-04T00:00:00Z",
                       "problems": problems}, f, ensure_ascii=False, indent=2)
        print(f"  출력: problems.json + webp {len(crop_jobs)}장")


if __name__ == "__main__":
    main()
