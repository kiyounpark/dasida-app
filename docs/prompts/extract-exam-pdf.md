# 시험지 PDF 추출 프롬프트

> 코워크 세션에 아래 내용을 붙여넣어 사용하세요.
> PDF 파일을 먼저 첨부한 후 프롬프트를 전송합니다.

---

## 프롬프트 (복사해서 사용)

```
첨부한 PDF는 수능/모의고사 수학 시험지입니다.

아래 형식에 맞게 각 문제의 메타데이터를 추출해주세요.

## 추출 규칙

- number: 문제 번호 (1~30)
- page: 해당 문제가 시작되는 PDF 페이지 번호 (1부터 시작)
- type: 객관식(1~21번)은 "multiple_choice", 단답형(22~30번)은 "short_answer"
- score: 배점 (문제지에 표시된 숫자, 보통 2/3/4점)
- answer: 정답 번호 (객관식: 1~5, 단답형: 실제 숫자값). 정답을 알 수 없으면 null
- topic: 문제가 해당하는 수학 단원 (예: "무리수/실수", "이차방정식", "수열", "적분" 등)
- diagnosisMethods: 이 문제를 풀 때 사용하는 풀이 방법. 아래 목록에서 1개 이상 선택
  - "cps" (완전제곱식)
  - "vertex" (꼭짓점 공식)
  - "diff" (미분)
  - "factoring" (인수분해)
  - "quadratic" (근의 공식)
  - "radical" (무리수 계산)
  - "polynomial" (다항식 전개)
  - "complex_number" (복소수)
  - "remainder_theorem" (나머지정리)
  - "counting" (경우의 수/확률)
  - "unknown" (위 목록에 해당 없음)

## 출력 형식

반드시 아래 JSON 형식으로만 출력하세요. 설명 텍스트 없이 JSON만 출력합니다.

{
  "examId": "<파일명 기반으로 작성, 예: mock-2025-10>",
  "extractedAt": "<오늘 날짜 ISO 형식>",
  "problems": [
    {
      "number": 1,
      "page": 2,
      "type": "multiple_choice",
      "score": 2,
      "answer": 2,
      "topic": "무리수/실수",
      "diagnosisMethods": ["radical"]
    }
  ]
}
```

---

## 추출 후 할 일

1. 출력된 JSON을 `data/problems/<examId>.json`에 저장
2. `npm run validate-problems <examId>` 실행으로 유효성 검사
