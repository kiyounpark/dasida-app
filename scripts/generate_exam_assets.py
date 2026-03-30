#!/usr/bin/env python3
"""
Generate three files from data/exam/**/problems.json:
  1. features/quiz/data/exam-images.ts   — static require map for 1,710 images
  2. features/quiz/data/exam-catalog.ts  — typed catalog from actual data
  3. features/quiz/data/exam-problems.ts — static require map for problem metadata
"""

import json
import glob
import os

# ── Output paths ──────────────────────────────────────────────────────────────
IMAGES_OUT  = "features/quiz/data/exam-images.ts"
CATALOG_OUT = "features/quiz/data/exam-catalog.ts"

# Relative path from features/quiz/data/ to assets/exam/
REL_ASSETS = "../../../assets/exam"

# ── Parse examId → parts ──────────────────────────────────────────────────────
def parse_exam_id(exam_id: str) -> dict:
    parts = exam_id.split("-")
    grade = parts[0]          # g1 / g2 / g3

    if grade in ("g1", "g2"):
        subject  = "common"
        exam_type = parts[1]  # academic
        year     = int(parts[2])
        month    = int(parts[3]) if len(parts) > 3 else None
    else:                      # g3
        subject   = parts[1]  # stats / calc / geom
        exam_type = parts[2]  # academic / mock / csat
        year      = int(parts[3])
        month     = int(parts[4]) if len(parts) > 4 else None

    return dict(grade=grade, subject=subject, type=exam_type, year=year, month=month)


def make_title(p: dict) -> str:
    type_kor = {"academic": "학력평가", "mock": "모의고사", "csat": "수능"}[p["type"]]
    subj_kor = {
        "common": "공통", "stats": "확률과통계",
        "calc": "미적분", "geom": "기하",
    }[p["subject"]]
    grade_kor = {"g1": "고1", "g2": "고2", "g3": "고3"}[p["grade"]]

    if p["type"] == "csat":
        return f"{p['year']} {grade_kor} {subj_kor} 수능"
    return f"{p['year']}년 {p['month']}월 {grade_kor} {subj_kor} {type_kor}"


# ── Collect all exams ──────────────────────────────────────────────────────────
exams = {}        # examId → {parsed fields + problem numbers}
exam_paths = {}   # examId → json file path (for exam-problems.ts require)

for jp in sorted(glob.glob("data/exam/**/**/problems.json", recursive=True)):
    try:
        d = json.load(open(jp))
        eid = d["examId"]
        if eid in exams:
            continue
        nums = [p["number"] for p in d["problems"]]
        exams[eid] = {**parse_exam_id(eid), "examId": eid, "numbers": sorted(nums)}
        exam_paths[eid] = jp
    except Exception as e:
        print(f"[SKIP] {jp}: {e}")

print(f"Loaded {len(exams)} unique exams")

# ── 1. Generate exam-images.ts ────────────────────────────────────────────────
lines = [
    "// AUTO-GENERATED — do not edit by hand",
    "// Run: python3 scripts/generate_exam_assets.py",
    "",
    "const examImages: Record<string, any> = {",
]

for eid in sorted(exams):
    nums = exams[eid]["numbers"]
    for n in nums:
        key  = f"{eid}/{n}"
        path = f"{REL_ASSETS}/{eid}/problems/{n}.webp"
        lines.append(f"  '{key}': require('{path}'),")

lines += [
    "};",
    "",
    "export default examImages;",
    "",
]

os.makedirs(os.path.dirname(IMAGES_OUT), exist_ok=True)
with open(IMAGES_OUT, "w") as f:
    f.write("\n".join(lines))

print(f"Written: {IMAGES_OUT}  ({len(lines)} lines)")

# ── 2. Generate exam-catalog.ts ───────────────────────────────────────────────
grade_order   = {"g1": 0, "g2": 1, "g3": 2}
subject_order = {"common": 0, "stats": 1, "calc": 2, "geom": 3}
type_order    = {"csat": 0, "mock": 1, "academic": 2}

sorted_exams = sorted(
    exams.values(),
    key=lambda e: (
        grade_order[e["grade"]],
        subject_order[e["subject"]],
        type_order[e["type"]],
        -(e["year"] or 0),
        -(e["month"] or 0),
    ),
)

catalog_lines = [
    "// AUTO-GENERATED — do not edit by hand",
    "// Run: python3 scripts/generate_exam_assets.py",
    "",
    "export type ExamGrade   = 'g1' | 'g2' | 'g3';",
    "export type ExamSubject = 'common' | 'stats' | 'calc' | 'geom';",
    "export type ExamType    = 'academic' | 'mock' | 'csat';",
    "",
    "export type ExamCatalogItem = {",
    "  examId:       string;",
    "  grade:        ExamGrade;",
    "  subject:      ExamSubject;",
    "  type:         ExamType;",
    "  year:         number;",
    "  month:        number | null;",
    "  title:        string;",
    "  questionCount: number;",
    "};",
    "",
    "export const EXAM_CATALOG: ExamCatalogItem[] = [",
]

for e in sorted_exams:
    title  = make_title(e)
    month  = e["month"] if e["month"] else "null"
    count  = len(e["numbers"])
    catalog_lines.append(
        f"  {{ examId: '{e['examId']}', grade: '{e['grade']}', subject: '{e['subject']}', "
        f"type: '{e['type']}', year: {e['year']}, month: {month}, "
        f"title: '{title}', questionCount: {count} }},"
    )

catalog_lines += [
    "];",
    "",
    "export const EXAM_CATALOG_BY_ID = Object.fromEntries(",
    "  EXAM_CATALOG.map(e => [e.examId, e]),",
    ");",
    "",
]

with open(CATALOG_OUT, "w") as f:
    f.write("\n".join(catalog_lines))

print(f"Written: {CATALOG_OUT}  ({len(sorted_exams)} exams)")

# ── 3. Generate exam-problems.ts ──────────────────────────────────────────────
PROBLEMS_OUT = "features/quiz/data/exam-problems.ts"
# Relative path from features/quiz/data/ to data/exam/
REL_DATA = "../../../data/exam"

problems_lines = [
    "// AUTO-GENERATED — do not edit by hand",
    "// Run: python3 scripts/generate_exam_assets.py",
    "",
    "export type ExamProblemType = 'multiple_choice' | 'short_answer';",
    "",
    "export type ExamProblem = {",
    "  number: number;",
    "  type: ExamProblemType;",
    "  score: number;",
    "  answer: number;",
    "  topic: string;",
    "  diagnosisMethods: string[];",
    "};",
    "",
    "type ProblemsJson = { problems: ExamProblem[] };",
    "",
    "const examProblemsMap: Record<string, ExamProblem[]> = {",
]

for eid in sorted(exam_paths):
    json_path = exam_paths[eid]
    # Convert absolute json path to relative from features/quiz/data/
    # json_path is like "data/exam/고1-공통/2024-3월-학평/problems.json"
    rel = f"../../../{json_path}"
    problems_lines.append(f"  '{eid}': (require('{rel}') as ProblemsJson).problems,")

problems_lines += [
    "};",
    "",
    "export function getExamProblems(examId: string): ExamProblem[] {",
    "  return examProblemsMap[examId] ?? [];",
    "}",
    "",
]

with open(PROBLEMS_OUT, "w") as f:
    f.write("\n".join(problems_lines))

print(f"Written: {PROBLEMS_OUT}  ({len(exam_paths)} exams)")
