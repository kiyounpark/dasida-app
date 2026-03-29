---
name: dasida-exam-extraction
description: 수능/모의고사 기출 PDF에서 문제 메타데이터와 해설 데이터를 추출하는 스킬. 시험지 PDF와 해설 PDF 각각에 대한 추출 규칙, JSON 스키마, 검증 기준을 정의합니다.
---

# DASIDA 기출 PDF 추출 스킬

시험지 PDF 또는 해설 PDF를 받아 정해진 JSON 스키마로 추출할 때 사용합니다.

---

## 1. 시험지 PDF 추출

### 추출 대상
- PDF 파일: `data/pdfs/<examId>.pdf` (스캔 이미지, 텍스트 레이어 없음)
- 출력 위치: `data/problems/<examId>.json`

### 추출 규칙

| 필드 | 설명 |
|------|------|
| `number` | 문제 번호 (1~30) |
| `page` | 해당 문제가 시작되는 PDF 페이지 번호 (1-indexed) |
| `type` | 객관식(1~21번) → `"multiple_choice"`, 단답형(22~30번) → `"short_answer"` |
| `score` | 문제지에 표시된 배점 (2, 3, 4 중 하나) |
| `answer` | 정답. 객관식: 1~5, 단답형: 실제 숫자값. 알 수 없으면 `null` |
| `topic` | 해당 문제의 수학 단원 (예: "무리수/실수", "이차방정식", "수열", "적분", "확률") |
| `diagnosisMethods` | 아래 목록에서 1개 이상 선택 |

### `diagnosisMethods` 허용 값

```
"cps"              완전제곱식
"vertex"           꼭짓점 공식
"diff"             미분
"factoring"        인수분해
"quadratic"        근의 공식
"radical"          무리수 계산
"polynomial"       다항식 전개
"complex_number"   복소수
"remainder_theorem" 나머지정리
"counting"         경우의 수/확률
"unknown"          위 목록에 해당 없음
```

### 출력 JSON 스키마

```json
{
  "examId": "mock-2025-10",
  "extractedAt": "2026-03-29T00:00:00Z",
  "problems": [
    {
      "number": 1,
      "page": 2,
      "type": "multiple_choice",
      "score": 2,
      "answer": 2,
      "topic": "무리수/실수",
      "diagnosisMethods": ["radical"]
    },
    {
      "number": 22,
      "page": 10,
      "type": "short_answer",
      "score": 3,
      "answer": 15,
      "topic": "수열",
      "diagnosisMethods": ["unknown"]
    }
  ]
}
```

---

## 2. 해설 PDF 추출

### 추출 대상
- PDF 파일: `data/pdfs/<examId>-explanation.pdf` (텍스트 레이어 있음, 수식 깨짐)
- 출력 위치: `data/explanations/<examId>.json`

### 추출 규칙

| 필드 | 설명 |
|------|------|
| `number` | 문제 번호 (1~30) |
| `intent` | `[출제의도]` 텍스트 그대로 추출 |
| `text` | 풀이 서술 텍스트. 수식이 깨지는 경우 `[수식]`으로 표시하고 `formulas`에 LaTeX로 기재 |
| `formulas` | 풀이에 등장하는 수식을 LaTeX 형식으로 목록 작성. 없으면 `[]` |

### 출력 JSON 스키마

```json
{
  "examId": "mock-2025-10",
  "extractedAt": "2026-03-29T00:00:00Z",
  "explanations": [
    {
      "number": 1,
      "intent": "근호를 포함한 식의 값을 계산한다.",
      "text": "√75 = [수식]으로 변환하면 [수식]. 6/√3 = [수식]이므로 전체 식은 [수식]",
      "formulas": [
        "\\sqrt{75} = 5\\sqrt{3}",
        "\\frac{6}{\\sqrt{3}} = 2\\sqrt{3}"
      ]
    }
  ]
}
```

---

## 3. examId 명명 규칙

| 시험 종류 | 형식 | 예시 |
|------|------|------|
| 모의고사 | `mock-<연도>-<월>` | `mock-2025-10` |
| 학력평가 | `academic-<연도>-<월>` | `academic-2025-03` |

---

## 4. 검증 기준

추출 완료 후 아래 항목을 확인합니다:

- `problems` 배열 길이가 30인지 확인
- `number` 1~30이 빠짐없이 있는지 확인
- `diagnosisMethods` 값이 허용 목록 안에 있는지 확인
- `type`이 1~21번은 `multiple_choice`, 22~30번은 `short_answer`인지 확인
- `explanations`가 있는 경우 `problems[n].number`와 `explanations[n].number`가 1:1 매칭되는지 확인

---

## 5. 코워크 사용 방법

**시험지 추출:**
```
PDF를 첨부하고 아래 요청:
"이 PDF는 <연도>년 <월>월 <시험명> 수학 시험지야.
dasida-exam-extraction 스킬 기준으로 전체 30문제 메타데이터를 추출해줘.
examId는 '<examId>'로 해줘."
```

**해설 추출:**
```
PDF를 첨부하고 아래 요청:
"이 PDF는 <연도>년 <월>월 <시험명> 수학 해설지야.
dasida-exam-extraction 스킬 기준으로 전체 30문제 해설 데이터를 추출해줘.
examId는 '<examId>'로 해줘."
```
