# 기출 PDF OCR 추출 파이프라인 설계

> 작성일: 2026-03-29

---

## 목표

수능/모의고사 기출 PDF(스캔 이미지)에서 문제 메타데이터와 해설 데이터를 추출하고, 앱에서 실제 시험지처럼 풀 수 있는 데이터 파이프라인을 만든다.

---

## PDF 소스

| PDF | 내용 | 형태 |
|------|------|------|
| **시험지 PDF** | 문제 (스캔 이미지) | 텍스트 레이어 없음 |
| **해설 PDF** | 정답 + `[출제의도]` + 풀이 (텍스트 레이어 있음, 수식만 깨짐) | 텍스트 부분 추출 가능 |

---

## 역할 분리

| 담당 | 역할 |
|------|------|
| **claude.ai 코워크** | 시험지 PDF → 문제 메타데이터 추출 / 해설 PDF → 해설 텍스트+수식 추출 |
| **Claude Code 스크립트** | 시험지 PDF → 페이지 이미지 변환 / 해설 PDF → 정답 자동 파싱 |
| **Claude Code 검증** | JSON 구조 유효성 검사 + PDF 대조 검증 |
| **앱 AI** | 해설 JSON을 내부 컨텍스트로 활용 → 사용자에게 설명 (출처 언급 없이) |
| **앱** | 페이지 이미지 표시 → 정오 판단 → 틀리면 진단 플로우 |

---

## 디렉토리 구조

```
data/
  pdfs/                          # 원본 PDF (gitignore 대상)
    mock-2025-10.pdf
    mock-2025-10-explanation.pdf
  problems/                      # 코워크 추출 결과 JSON (시험지 메타)
    mock-2025-10.json
  explanations/                  # 코워크 추출 결과 JSON (해설)
    mock-2025-10.json
  images/                        # 시험지 PDF → 페이지 이미지
    mock-2025-10/
      page-01.png
      page-02.png
      ...
```

---

## JSON 스키마

### 파일 구조 (`data/problems/<examId>.json`)

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
      "answer": 3,
      "topic": "무리수/실수",
      "diagnosisMethods": ["radical", "unknown"]
    }
  ]
}
```

### 필드 정의

| 필드 | 타입 | 설명 |
|------|------|------|
| `number` | number | 문제 번호 (1~30) |
| `page` | number | PDF 페이지 번호 (1-indexed) |
| `type` | `"multiple_choice"` \| `"short_answer"` | 객관식(1~21번) / 단답형(22~30번) |
| `score` | number | 배점 (2, 3, 4) |
| `answer` | number | 정답 (객관식: 1~5, 단답형: 실제 값) |
| `topic` | string | 수학 단원 (예: "수열", "적분", "확률") |
| `diagnosisMethods` | `SolveMethodId[]` | 진단 플로우 연결용 풀이 방법 목록 |

### `diagnosisMethods` 가능 값 (기존 `SolveMethodId` 그대로)

`cps` · `vertex` · `diff` · `unknown` · `factoring` · `quadratic` · `radical` · `polynomial` · `complex_number` · `remainder_theorem` · `counting`

---

## 해설 JSON 스키마

### 파일 구조 (`data/explanations/<examId>.json`)

```json
{
  "examId": "mock-2025-10",
  "extractedAt": "2026-03-29T00:00:00Z",
  "explanations": [
    {
      "number": 1,
      "intent": "근호를 포함한 식의 값을 계산한다.",
      "text": "√75 = 5√3으로 변환하면...",
      "formulas": ["\\sqrt{75} = 5\\sqrt{3}", "\\frac{6}{\\sqrt{3}} = 2\\sqrt{3}"]
    }
  ]
}
```

### 필드 정의

| 필드 | 타입 | 설명 |
|------|------|------|
| `number` | number | 문제 번호 |
| `intent` | string | `[출제의도]` 텍스트 → `topic`/`diagnosisMethods` 자동 태깅에 활용 |
| `text` | string | 풀이 서술 텍스트 |
| `formulas` | string[] | LaTeX 수식 목록 |

### 해설 데이터 활용 방식

**A. AI 설명 생성 (출처 언급 없이)**
- 문제 틀림 → AI가 `explanations[number]`를 내부 컨텍스트로 읽고 풀이 설명 생성
- "EBS 해설" 언급 없이 자체 설명처럼 제공

**C. `[출제의도]` → 자동 태깅**
- `intent` 텍스트를 읽고 `topic`, `diagnosisMethods` 자동 추론
- 코워크 추출 시 `problems.json`에 반영

---

### 향후 확장 필드 (MVP 이후)

```json
"boundingBox": { "x": 0, "y": 320, "width": 760, "height": 280 }
```

페이지 이미지에서 문제 크롭이 필요할 때 추가. 현재는 페이지 단위 이동이므로 불필요.

---

## 앱 화면 흐름

```
시험 선택 → 시험 풀기 화면
  → 페이지 이미지 표시 (data/images/<examId>/page-XX.png)
  → 상단: 문제 번호 탭바 (어떤 번호가 이 페이지에 있는지 표시)
  → 번호 탭 → 해당 페이지로 이동
  → 답 선택 → 제출
  → 정답 → 다음 문제
  → 오답 → 진단 플로우 (기존 WeaknessId 시스템 연결)
```

---

## 만들 것

### 1. 코워크용 추출 프롬프트 2종 (`docs/prompts/`)
- `extract-exam-pdf.md` — 시험지 PDF용: 문제 번호/페이지/유형/배점/정답/topic/diagnosisMethods 추출
- `extract-explanation-pdf.md` — 해설 PDF용: `[출제의도]`/풀이 텍스트/수식 추출

### 2. TypeScript 타입 정의 (`scripts/types/exam-problem.ts`)
`ExamProblemFile`, `ExamProblem`, `ExamExplanationFile`, `ExamExplanation` 타입 정의.

### 3. 구조 유효성 검사 스크립트 (`scripts/validate-problems.ts`)
- 필수 필드 누락 체크 (problems + explanations 모두)
- `diagnosisMethods` 값이 유효한 `SolveMethodId`인지 확인
- 문제 수가 `exam-catalog.ts`의 `questionCount`와 일치하는지 확인
- 이미지 파일 존재 여부 확인 (`data/images/<examId>/page-XX.png`)
- `problems[n].number`와 `explanations[n].number` 1:1 매칭 확인

### 4. PDF → 이미지 변환 스크립트 (`scripts/pdf-to-images.ts`)
`data/pdfs/<examId>.pdf` → `data/images/<examId>/page-XX.png` 변환.
Node.js에서 `pdf2pic` 또는 `pdfjs-dist` 사용.

### 5. PDF 대조 검증 워크플로우 (`docs/prompts/verify-extraction.md`)
Claude Code가 동일 PDF를 Read한 후 추출된 JSON과 대조할 때 쓰는 프롬프트 템플릿.
불일치 항목(번호 누락, 정답 오류, page 불일치 등)을 리포트로 출력.

---

## 범위 밖 (이번 설계에서 제외)

- TypeScript 변환 (앱 연동 시점에 결정)
- 문제 텍스트/수식 전문 추출 (페이지 이미지로 표시하므로 불필요)
- 이미지 크롭 (boundingBox MVP 이후)
- 진단 플로우 신규 `SolveMethodId` 추가 (별도 작업)
- 해설 정답 자동 파싱 스크립트 (텍스트 레이어 확인 후 별도 작업)
