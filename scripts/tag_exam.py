#!/usr/bin/env python3
"""
problems.json 의 topic(단원) + diagnosisMethods(풀이법) 1차 자동 태깅.

- 답/이미지/배점은 건드리지 않음 (이미 검증 완료). topic/diagnosisMethods만 갱신.
- 신호: 문제 본문의 한글 텍스트(수식은 깨져도 "등차수열/삼차함수/접선" 등은 추출됨).
- 애매한 것(unknown 잔류)은 리포트로 출력 → 이미지로 손보는 대상.
- 해설지 [출제의도] 나오면 이 단계를 해설 기반으로 교체.

diagnosisMethods 값은 data/diagnosisTree.ts 의 methodOptions id와 일치해야 함.

사용: python3 scripts/tag_exam.py [stats|calc|geom ...]   (기본 셋 다)
"""
import fitz, re, json, sys

PDF = "/Users/baggiyun/Downloads/math_main_mun_KKD67VZI.pdf"
REPO = "/Users/baggiyun/dev/dasida-app"
COMMON_PAGES = range(0, 8)
SEL_PAGES = {"stats": range(8, 12), "calc": range(12, 16), "geom": range(16, 20)}
MID = 421.0
COL = {"left": (50, 415), "right": (426, 795)}
NUM = re.compile(r'^(\d{1,2})\.$')
HAN = re.compile(r'[가-힣]')

# 공통(1~22): 수학I·II 풀이법만 사용 (선택과목 method 누수 방지). 위에서부터 우선.
COMMON_RULES = [
    (r'정적분|부정적분|적분|넓이|∫', '적분', 'integral'),
    (r'접선|도함수|극대|극소|증가.*감소|미분|′|속도|가속도|위치|움직이는|시각', '미분', 'diff'),
    (r'연속|극한|lim|수렴|발산|존재하지|존재하고|존재한다', '극한·연속', 'limit'),
    (r'등차|등비|수열|점화|시그마|∑|첫째항|공차|공비', '수열', 'sequence'),
    (r'삼각형|sin|cos|tan|삼각함수|부채꼴|호의 길이|주기', '삼각함수', 'trig'),
    (r'지수|로그|log|밑이|진수', '지수·로그', 'log_exp'),
    (r'다항함수|삼차함수|이차함수|일차함수|함수', '함수', 'function'),
]
# 선택(23~30): 과목별 method 먼저, 안 잡히면 공통으로 폴백.
SEL_RULES = {
    "stats": [
        (r'정규분포|표준편차|확률변수|모평균|표본|평균.*분산|신뢰구간|이항분포', '통계', 'statistics'),
        (r'사건|조건부|독립|주사위|동전|뽑|꺼내|주머니|공이|카드|확률', '확률', 'probability'),
        (r'전개식|계수|이항정리|일렬|나열|순열|조합|함수 중|함수의 개수|경우의 수|중복', '경우의 수', 'permutation'),
    ],
    "calc": [
        (r'움직이는|위치|속도|가속도|시각.*출발|매개변수|곡선의 길이', '미적분(속도·위치)', 'diff_advanced'),
        (r'수렴|발산|무한급수|등비급수|급수|극한값', '수열의 극한', 'sequence_limit'),
        (r'치환|부분적분|회전체|부피|정적분.*넓이', '적분(심화)', 'integral_advanced'),
        (r'합성함수|역함수|접선|미분가능|도함수|극값|sin|cos|tan|지수|로그|′', '미분(심화)', 'diff_advanced'),
    ],
    "geom": [
        (r'벡터|내적|성분|방향벡터|마름모|평행사변형', '벡터', 'vector'),
        (r'쌍곡선|타원|포물선|초점|준선|점근선|이차곡선', '이차곡선', 'conic'),
        (r'공간|구\b|정사영|평면.*평면|이면각|수직이등분|삼수선|사면체', '공간도형', 'space_geometry'),
    ],
}
# 한글 신호가 수식에 묻혀 자동으로 안 잡히는 문제의 수동 지정 (이미지 확인 결과)
OVERRIDE_COMMON = {  # 공통 1~22 (3과목 공유). *=46검사자 교차검증 정정
    1:  ('지수·로그', 'log_exp'),
    2:  ('미분', 'diff'),          # 미분계수 정의 lim(f(x)-f(1))/(x-1)
    4:  ('극한·연속', 'limit'),     # 좌극한+우극한
    9:  ('적분', 'integral'),       # * 속도→위치는 정적분
    10: ('지수·로그', 'log_exp'),
    14: ('삼각함수', 'trig'),       # cos 방정식 실근
    15: ('적분', 'integral'),       # * 조건이 정적분 ∫|f| 비교
    16: ('지수·로그', 'log_exp'),   # * 3^(x-6)=(1/9)^x 지수방정식 (정답 2로 확정)
    17: ('적분', 'integral'),       # * f'→f 부정적분 복원 (정답 10으로 확정)
    21: ('미분', 'diff'),           # * 삼차함수 극값 분석 (단 g(t) 불연속도 관련 — 기윤 확인)
}
OVERRIDE_SEL = {  # 선택 23~30 (과목별). *=46검사자 교차검증 정정
    "calc":  {23: ('수열의 극한', 'sequence_limit'),
              25: ('수열의 극한', 'sequence_limit')},   # * 무한급수 ∑1/(aₙbₙ)
    "stats": {30: ('경우의 수', 'permutation')},        # * 같은것 순열(이웃X 나열)
    "geom":  {30: ('벡터', 'vector')},                  # * 평면벡터 내적
}


def guess(txt, rules):
    for pat, topic, meth in rules:
        if re.search(pat, txt):
            return topic, meth
    return '기타', 'unknown'


def problem_text(doc, pages):
    """examId 페이지들에서 문제번호 -> 본문 한글 텍스트."""
    out = {}
    for pi in pages:
        pg = doc[pi]
        words = pg.get_text("words")
        anchors = [(int(NUM.match(w[4]).group(1)), w[0], w[1]) for w in words
                   if NUM.match(w[4]) and 1 <= int(NUM.match(w[4]).group(1)) <= 30 and w[1] > 120]
        cols = {'L': [], 'R': []}
        for n, x, y in anchors:
            cols['L' if x < MID else 'R'].append((n, y))
        for c in cols:
            cols[c].sort(key=lambda a: a[1])
        for c, lst in cols.items():
            xlo, xhi = COL['left' if c == 'L' else 'right']
            for i, (n, y0) in enumerate(lst):
                y1 = lst[i+1][1] if i+1 < len(lst) else 1080
                txt = ' '.join(w[4] for w in words
                               if xlo <= (w[0]+w[2])/2 <= xhi and y0-5 <= w[1] <= y1
                               and HAN.search(w[4]))
                out[n] = txt
    return out


def main():
    targets = [a for a in sys.argv[1:] if not a.startswith('-')] or list(SEL_PAGES)
    doc = fitz.open(PDF)
    common_txt = problem_text(doc, COMMON_PAGES)
    for subj in targets:
        exam_id = f"g3-{subj}-mock-2026-06"
        path = f"{REPO}/data/exam/{exam_id}/problems.json"
        data = json.load(open(path))
        sel_txt = problem_text(doc, SEL_PAGES[subj])
        txt = {**common_txt, **sel_txt}
        unknown = []
        print(f"\n=== {exam_id} ===")
        for p in data["problems"]:
            n = p["number"]
            if n <= 22:
                rules = COMMON_RULES
            else:
                rules = SEL_RULES[subj] + COMMON_RULES
            topic, meth = guess(txt.get(n, ""), rules)
            if n <= 22 and n in OVERRIDE_COMMON:
                topic, meth = OVERRIDE_COMMON[n]
            elif n >= 23 and n in OVERRIDE_SEL.get(subj, {}):
                topic, meth = OVERRIDE_SEL[subj][n]
            p["topic"] = topic
            p["diagnosisMethods"] = [meth]
            tag = "공통" if n <= 22 else "선택"
            if meth == 'unknown':
                unknown.append(n)
            print(f"  {n:>2}({tag}) {topic:<14}[{meth}]  ◀ {txt.get(n,'')[:38]}")
        json.dump(data, open(path, "w"), ensure_ascii=False, indent=2)
        print(f"  → 저장. 이미지 확인 필요(unknown): {unknown}")


if __name__ == "__main__":
    main()
