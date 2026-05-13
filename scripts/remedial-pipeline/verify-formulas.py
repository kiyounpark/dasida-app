#!/usr/bin/env python3
"""
수식 항등식 검증기.

입력 (stdin, JSON):
  [
    {"id": "node1.eq1", "lhs": "x**2 + 8*x + 16", "rhs": "(x + 4)**2"},
    {"id": "node1.eq2", "lhs": "b**2 - 4*a*c", "rhs": "discriminant"}
  ]

출력 (stdout, JSON):
  [
    {"id": "node1.eq1", "ok": true, "reason": null},
    {"id": "node1.eq2", "ok": false, "reason": "rhs uses undefined symbol 'discriminant'"}
  ]

사용:
  echo '[{"id":"t","lhs":"x**2+2*x+1","rhs":"(x+1)**2"}]' | \
    python3 scripts/remedial-pipeline/verify-formulas.py
"""
import json
import sys
from sympy import simplify, sympify, SympifyError


def verify(case):
    case_id = case.get("id", "?")
    try:
        lhs = sympify(case["lhs"])
        rhs = sympify(case["rhs"])
        diff = simplify(lhs - rhs)
        return {"id": case_id, "ok": diff == 0, "reason": None if diff == 0 else f"lhs - rhs = {diff}"}
    except SympifyError as e:
        return {"id": case_id, "ok": False, "reason": f"파싱 실패: {e}"}
    except Exception as e:
        return {"id": case_id, "ok": False, "reason": f"검증 오류: {e}"}


def main():
    raw = sys.stdin.read()
    cases = json.loads(raw)
    results = [verify(c) for c in cases]
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
