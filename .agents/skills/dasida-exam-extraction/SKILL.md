---
name: dasida-exam-extraction
description: 수능/모의고사 기출 PDF에서 문제 메타데이터, 해설 데이터, 문제별 이미지 크롭 정보를 추출하는 스킬. 시험지 PDF와 해설 PDF 각각에 대한 추출 규칙, JSON 스키마, 검증 기준을 정의합니다.
---

# DASIDA 기출 PDF 추출 스킬

시험지 PDF 또는 해설 PDF를 받아 정해진 JSON 스키마로 추출할 때 사용합니다.

---

## 1. examId 명명 규칙

형식: `{학년}-{과목}-{시험종류}-{연도}(-{월})`

| 구성요소 | 값 | 설명 |
|---------|-----|------|
| 학년 | `g1`, `g2`, `g3` | 고1/고2/고3 |
| 과목 | `common`, `prob`, `calc`, `geo` | 공통/확률과통계/미적분/기하 |
| 시험종류 | `academic`, `mock`, `suneung` | 학력평가/모의고사(모평)/수능 |
| 연도 | `2026` | 4자리 연도 |
| 월 | `-03` | 수능 제외 필수 |

| 예시 | 설명 |
|------|------|
| `g1-common-academic-2026-03` | 고1 공통 2026년 3월 학력평가 |
| `g3-prob-mock-2025-06` | 고3 확통 2025년 6월 모의고사 |
| `g3-prob-suneung-2025` | 고3 확통 2025 수능 |
| `g3-calc-mock-2025-09` | 고3 미적분 2025년 9월 모의고사 |

---

## 2. 출력 경로 규칙

```
data/exam/{학년}-{과목}/{연도}-{월}월-{시험종류}/problems.json
data/exam/{학년}-{과목}/{연도}-{월}월-{시험종류}/explanations.json

예:
data/exam/고1-공통/2026-3월-학평/problems.json
data/exam/고3-확통/2025-6월-모평/problems.json
data/exam/고3-확통/2025-수능/problems.json
```

이미지 경로:
```
assets/exam/{examId}/problems/{number}.webp
assets/exam/{examId}/explanations/{number}.webp

예:
assets/exam/g1-common-academic-2026-03/problems/1.webp
assets/exam/g1-common-academic-2026-03/explanations/1.webp
```

> 저장소가 Firebase Storage로 전환되면 `imageKey`의 base URL만 교체하면 됩니다.

---

## 3. 시험지 PDF 추출

### 추출 규칙

| 필드 | 설명 |
|------|------|
| `number` | 문제 번호 (1~30) |
| `page` | 해당 문제가 시작되는 PDF 페이지 번호 (1-indexed) |
| `type` | 객관식(1~21번) → `"multiple_choice"`, 단답형(22~30번) → `"short_answer"` |
| `score` | 문제지에 표시된 배점 (2, 3, 4 중 하나) |
| `answer` | 정답. 객관식: 1~5, 단답형: 실제 숫자값. 알 수 없으면 `null` |
| `topic` | 해당 문제의 수학 단원 (예: "삼각함수", "수열", "확률") |
| `diagnosisMethods` | 아래 목록에서 1개 이상 선택 |
| `imageKey` | 크롭 이미지 경로. 섹션 4의 이미지 크롭 완료 후 채움 |
| `bbox` | 문제 영역 위치 정보. 섹션 4 참고 |

### `diagnosisMethods` 허용 값

**고1 수학 (공통)**
```
"polynomial"        다항식 전개/연산
"factoring"         인수분해
"remainder_theorem" 나머지정리
"quadratic"         이차방정식 (근의 공식/판별식)
"complex_number"    복소수
"linear_eq"         일차방정식/부등식
"cps"               완전제곱식
"vertex"            꼭짓점 공식
"radical"           무리수/실수 계산
"coord_geometry"    좌표기하 (직선/원의 방정식)
"geometry"          도형 (삼각형/사각형/피타고라스)
"proposition"       명제/논리 (역·이·대우)
"set"               집합
"counting"          경우의 수
"function"          함수 (합성·역함수)
```

**수학I (고2/3 공통)**
```
"log_exp"           지수/로그 계산
"trig"              삼각함수 (값·그래프·방정식)
"sequence"          수열 (등차/등비/점화식)
```

**수학II (고2/3 공통)**
```
"limit"             극한/연속
"diff"              미분 (도함수·접선·증감)
"integral"          정적분/부정적분
```

**확률과통계**
```
"permutation"       순열/조합
"probability"       확률 (조건부/독립)
"statistics"        통계 (평균·분산·정규분포)
```

**미적분**
```
"sequence_limit"    수열의 극한
"diff_advanced"     고급 미분법 (합성함수·역함수 미분)
"integral_advanced" 고급 적분법 (치환·부분적분)
```

**기하**
```
"conic"             이차곡선 (포물선·타원·쌍곡선)
"vector"            평면벡터
"space_geometry"    공간도형/공간좌표
```

**공통**
```
"unknown"           위 목록에 해당 없음
```

### 출력 JSON 스키마

```json
{
  "examId": "g1-common-academic-2026-03",
  "extractedAt": "2026-03-29T00:00:00Z",
  "problems": [
    {
      "number": 1,
      "page": 2,
      "type": "multiple_choice",
      "score": 2,
      "answer": 1,
      "topic": "명제",
      "diagnosisMethods": ["proposition"],
      "imageKey": "assets/exam/g1-common-academic-2026-03/problems/1.webp",
      "bbox": {
        "column": "left",
        "yStart": 0.05,
        "yEnd": 0.28
      }
    },
    {
      "number": 22,
      "page": 10,
      "type": "short_answer",
      "score": 3,
      "answer": 15,
      "topic": "수열",
      "diagnosisMethods": ["sequence"],
      "imageKey": "assets/exam/g1-common-academic-2026-03/problems/22.webp",
      "bbox": {
        "column": "full",
        "yStart": 0.50,
        "yEnd": 0.85
      }
    }
  ]
}
```

---

## 4. 이미지 크롭 (bbox 추출)

각 문제의 위치를 `bbox`로 기록합니다. 이미지 크롭 스크립트가 이 값을 사용합니다.

### bbox 필드 설명

| 필드 | 설명 |
|------|------|
| `column` | `"left"` (왼쪽 단) / `"right"` (오른쪽 단) / `"full"` (전체 너비) |
| `yStart` | 문제 시작 위치 (페이지 높이 기준 0.0~1.0) |
| `yEnd` | 문제 끝 위치 (페이지 높이 기준 0.0~1.0) |

### bbox 추출 규칙

- 수능/학평 시험지는 **2단 레이아웃** (왼쪽/오른쪽 단)
- 문제 번호 위 5% 여백 포함해서 `yStart` 설정
- 다음 문제 시작 직전까지를 `yEnd`로 설정
- 그림·표가 포함된 문제는 그림 하단까지 포함
- 문제가 페이지를 넘어가는 경우: 다음 페이지 `page`로 bbox 분리 없이 두 번째 페이지 기준으로 처리

### imageKey 규칙

```
assets/exam/{examId}/problems/{number}.webp
assets/exam/{examId}/explanations/{number}.webp
```

bbox 추출 완료 후 `imageKey` 필드를 채웁니다.

---

## 5. 해설 PDF 추출

### 추출 규칙

| 필드 | 설명 |
|------|------|
| `number` | 문제 번호 (1~30) |
| `intent` | `[출제의도]` 텍스트 그대로 추출 |
| `text` | 풀이 서술 텍스트. 수식이 깨지는 경우 `[수식]`으로 표시 |
| `imageKey` | 해설 크롭 이미지 경로 (선택, 그림 포함 해설에만 적용) |

### 출력 JSON 스키마

```json
{
  "examId": "g1-common-academic-2026-03",
  "extractedAt": "2026-03-29T00:00:00Z",
  "explanations": [
    {
      "number": 1,
      "intent": "명제의 역·이·대우를 이해하여 참·거짓을 판별한다.",
      "text": "주어진 명제 p → q에서 역은 q → p, 대우는 ~q → ~p이다. ...",
      "imageKey": null
    }
  ]
}
```

---

## 6. 검증 기준

추출 완료 후 아래 항목을 확인합니다:

- `problems` 배열 길이가 30인지 확인
- `number` 1~30이 빠짐없이 있는지 확인
- `diagnosisMethods` 값이 허용 목록 안에 있는지 확인
- `type`이 1~21번은 `multiple_choice`, 22~30번은 `short_answer`인지 확인
- `explanations`가 있는 경우 `problems[n].number`와 `explanations[n].number`가 1:1 매칭되는지 확인
- `bbox.yStart < bbox.yEnd` 인지 확인

---

## 7. 코워크 사용 방법

시험지 PDF와 해설 PDF를 **동시에 첨부**하고 아래 요청 하나로 처리합니다.

```
이 PDF 2개는 <연도>년 <월>월 <시험명> 수학 시험지와 해설지야.
dasida-exam-extraction 스킬 기준으로 아래 순서대로 수행해줘.
examId는 '<examId>'로 해줘.

1. 시험지 → problems JSON 추출 (bbox 포함, imageKey는 빈 문자열로)
2. 해설지 → explanations JSON 추출
3. 자체 검증 수행 후 검증 리포트 출력
4. 이상 없으면 최종 JSON 2개 출력

각각 별도 JSON으로 출력해줘.
```

> imageKey는 이미지 크롭 스크립트 실행 후 자동으로 채워집니다.

---

## 7-1. 자체 검증 규칙 (코워크가 직접 수행)

추출 완료 후 아래 항목을 스스로 검증하고 결과를 리포트로 출력합니다.

### 정답 교차검증 (가장 중요)
- 해설 PDF 첫 페이지의 정답표 (`1 ② 2 ⑤ 3 ①...`)를 별도로 읽어서
- `problems[].answer`와 1:1 비교
- 불일치 항목을 `[오류] 3번: 추출값 2, 정답표 1` 형식으로 리포트

### 완전성 검증
- `problems` 배열에 1~30번이 빠짐없이 있는지 확인
- `explanations` 배열에 1~30번이 빠짐없이 있는지 확인
- 누락된 번호가 있으면 명시

### type 검증
- 1~21번은 반드시 `"multiple_choice"`
- 22~30번은 반드시 `"short_answer"`
- 틀린 항목 리포트

### 페이지 순서 검증
- `page` 번호가 문제 번호 순서대로 증가하는지 확인
- 역전된 경우 (`1번: page 5`, `2번: page 3`) 리포트

### diagnosisMethods ↔ intent 일관성
- `intent` 내용과 `diagnosisMethods`가 논리적으로 맞는지 확인
- 예: intent가 "미분을 이용하여..." 인데 `diagnosisMethods`에 `"diff"` 없으면 경고

### bbox 검증
- `bbox.yStart < bbox.yEnd` 인지 확인
- 같은 페이지 내 문제들의 bbox가 겹치지 않는지 확인

### 검증 리포트 출력 형식
```
=== 자체 검증 리포트 ===
정답 교차검증: 30/30 일치 ✅  (또는 [오류] 목록)
완전성: problems 30문제 ✅ / explanations 30문제 ✅
type 검증: 이상 없음 ✅
페이지 순서: 이상 없음 ✅
diagnosisMethods 일관성: [경고] 7번 intent "미분 활용" 인데 diagnosisMethods ["unknown"]
bbox 검증: 이상 없음 ✅
======================
검증 통과 후 최종 JSON을 출력합니다.
```

---

## 8. 해설 데이터 활용 규칙

### A. AI 설명 생성
- 사용자가 문제를 틀리면 `explanations[number]`를 내부 컨텍스트로 참고해서 설명 생성
- 출처(EBS 등) 언급 없이 자체 설명처럼 제공
- `intent`를 기반으로 어떤 개념이 핵심인지 먼저 짚어줌

### B. `intent` → 자동 태깅
- `intent` 텍스트를 읽고 `topic`과 `diagnosisMethods`를 추론해서 `problems.json`에 반영
- 예: "삼각비를 이용하여 식의 값을 계산한다" → `topic: "삼각함수"`, `diagnosisMethods: ["trig"]`

### C. 해설 기반 약점 파악
- 해설의 풀이 단계를 분석해서 어느 단계에서 막혔는지 진단에 활용
- 기존 `WeaknessId` 시스템과 연결:

| 해설 단계 실패 패턴 | 연결 WeaknessId |
|------|------|
| 수식 변환 단계에서 실수 | `calc_repeated_error` |
| 공식 적용 자체를 모름 | `formula_understanding` |
| 풀이 순서 혼동 | `solving_order_confusion` |
| 인수분해 패턴 미인식 | `factoring_pattern_recall` |
| 판별식 계산 오류 | `discriminant_calculation` |
