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

시험지 PDF와 해설 PDF를 **동시에 첨부**하고 아래 요청 하나로 처리합니다.

```
이 PDF 2개는 <연도>년 <월>월 <시험명> 수학 시험지와 해설지야.
dasida-exam-extraction 스킬 기준으로 아래 순서대로 수행해줘.
examId는 '<examId>'로 해줘.

1. 시험지 → problems JSON 추출
2. 해설지 → explanations JSON 추출
3. 자체 검증 수행 후 검증 리포트 출력
4. 이상 없으면 최종 JSON 2개 출력

각각 별도 JSON으로 출력해줘.
```

---

## 5-1. 자체 검증 규칙 (코워크가 직접 수행)

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

### 검증 리포트 출력 형식
```
=== 자체 검증 리포트 ===
정답 교차검증: 30/30 일치 ✅  (또는 [오류] 목록)
완전성: problems 30문제 ✅ / explanations 30문제 ✅
type 검증: 이상 없음 ✅
페이지 순서: 이상 없음 ✅
diagnosisMethods 일관성: [경고] 7번 intent "미분 활용" 인데 diagnosisMethods ["unknown"]
======================
검증 통과 후 최종 JSON을 출력합니다.
```

---

## 6. 해설 데이터 활용 규칙

### A. AI 설명 생성
- 사용자가 문제를 틀리면 `explanations[number]`를 내부 컨텍스트로 참고해서 설명 생성
- 출처(EBS 등) 언급 없이 자체 설명처럼 제공
- `intent`를 기반으로 어떤 개념이 핵심인지 먼저 짚어줌

### B. `intent` → 자동 태깅
- `intent` 텍스트를 읽고 `topic`과 `diagnosisMethods`를 추론해서 `problems.json`에 반영
- 예: "근호를 포함한 식의 값을 계산한다" → `topic: "무리수/실수"`, `diagnosisMethods: ["radical"]`

### C. 해설 기반 약점 파악
- 해설의 풀이 단계를 분석해서 어느 단계에서 막혔는지 진단에 활용
- 풀이 단계를 `steps`로 분해해서 저장하면 진단 정확도가 높아짐
- 기존 `WeaknessId` 시스템과 연결:

| 해설 단계 실패 패턴 | 연결 WeaknessId |
|------|------|
| 수식 변환 단계에서 실수 | `calc_repeated_error` |
| 공식 적용 자체를 모름 | `formula_understanding` |
| 풀이 순서 혼동 | `solving_order_confusion` |
| 인수분해 패턴 미인식 | `factoring_pattern_recall` |
| 판별식 계산 오류 | `discriminant_calculation` |

- 진단 플로우(채팅)에서 AI가 해설 steps를 내부 참고해 "어느 단계에서 막혔어?" 질문을 구체화할 수 있음
