#!/usr/bin/env python3
"""
data/exam/<한글>/<날짜>/  →  data/exam/<examId>/
- problems.json, explanations.json 복사
- .bak 파일 제외
- 기존 한글 디렉토리는 git rm으로 제거
"""

import json, glob, os, shutil, subprocess, unicodedata

def nfc(s):
    return unicodedata.normalize("NFC", s)

# examId → (src_dir, [files])  첫 번째 유니크만
seen = {}
for jp in sorted(glob.glob("data/exam/**/**/problems.json", recursive=True)):
    try:
        d = json.load(open(jp))
        eid = d["examId"]
        if eid in seen:
            continue
        src_dir = os.path.dirname(jp)
        files = [f for f in os.listdir(src_dir) if not f.endswith(".bak") and not f.startswith(".")]
        seen[eid] = (src_dir, files)
    except Exception as e:
        print(f"[SKIP] {jp}: {e}")

print(f"Found {len(seen)} unique exams\n")

# 새 디렉토리에 복사
for eid, (src_dir, files) in sorted(seen.items()):
    dst_dir = f"data/exam/{eid}"
    if os.path.abspath(src_dir) == os.path.abspath(dst_dir):
        print(f"[SKIP already ASCII] {eid}")
        continue
    os.makedirs(dst_dir, exist_ok=True)
    for f in files:
        src_path = f"{src_dir}/{f}"
        dst_path = f"{dst_dir}/{f}"
        if os.path.isdir(src_path):
            if os.path.exists(dst_path):
                shutil.rmtree(dst_path)
            shutil.copytree(src_path, dst_path)
        else:
            shutil.copy2(src_path, dst_path)
    print(f"[OK] {src_dir}  →  {dst_dir}  ({', '.join(files)})")

# 기존 한글 부모 디렉토리 git rm
korean_parents = set()
for eid, (src_dir, _) in seen.items():
    parts = src_dir.split("/")   # ['data', 'exam', '고1-공통', '2024-3월-학평']
    if len(parts) >= 3:
        parent = "/".join(parts[:3])   # data/exam/고1-공통
        korean_parents.add(parent)

print(f"\nRemoving {len(korean_parents)} Korean parent directories from git...")
for parent in sorted(korean_parents):
    result = subprocess.run(
        ["git", "rm", "-r", "--cached", "--ignore-unmatch", parent],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"[git rm] {parent}")
    else:
        print(f"[git rm ERR] {parent}: {result.stderr.strip()}")

    # 실제 파일도 삭제
    if os.path.exists(parent):
        shutil.rmtree(parent)
        print(f"[rm]     {parent}")

print("\nDone. Next: python3 scripts/generate_exam_assets.py")
