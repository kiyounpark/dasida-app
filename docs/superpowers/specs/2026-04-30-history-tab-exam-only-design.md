# 기록 탭 학평/모의고사 전용화 설계

- 작성일: 2026-04-30
- 상태: 기획중
- 관련 영역: 기록 탭 (`features/history`), 학평/모의고사 응시 이력
- 인접 spec: `2026-04-30-bottom-tab-exam-promotion-design.md` (탭 라벨 `내 기록` → `기록`)

## 배경 및 문제

사용자 피드백: "모의고사를 풀어도 내 기록에는 제대로 저장이 안 되고 있는 것 같다."

코드 분석 결과, 데이터는 정상 저장되지만 "내 기록" 화면이 학평/모의고사 결과를 사실상 표시하지 않는 가시성 문제다.

| 현 상태 | 모의고사 응시/완료 시 반영? |
| --- | --- |
| 히어로 "복습 완료 N회" (`summary.totals.reviewAttempts`) | ❌ — review만 카운트 |
| 히어로 "최근 정답률" (`loadRecentAttempts({ source: 'diagnostic' })`) | ❌ — 10문제 진단만 로드 |
| 히어로 CTA 분기 (`summary.latestDiagnosticSummary`) | ❌ — 진단 시험 기준 |
| "약점 진행 단계" (`summary.dueReviewTasks`) | ⚠️ — 진단 완료 후에야 review task 생성 |
| "최근 활동" pulse items (`summary.recentActivity`) | ⚠️ — 백엔드가 'exam' kind을 채워줄 때만 |
| 자동 새로고침 | ❌ — `useFocusEffect` 부재 |

기록 탭은 사실상 10문제 진단 + 복습 사이클 전용으로 만들어져 있어, 학평/모의고사 사용자가 "기록이 안 남는다"고 느끼는 게 정확한 진단이다.

## 목표

- 기록 탭을 **학평·모의고사·수능 응시 이력 전용 화면**으로 재정의한다.
- 응시 횟수, 평균 정답률, 자주 발견된 약점 같은 누적 성취를 한눈에 보여준다.
- 진단 미완료 모의고사가 있으면 "이어서 분석하기" CTA를 노출한다 (단, quiz hub의 `ExamAnalysisResumeCard`와 책임 중복은 피한다).
- 탭 복귀 시 자동 새로고침으로 "응시했는데 안 보인다" 경험을 제거한다.

## 비목표

- 10문제 진단(`source: 'diagnostic'`) 결과를 별도 화면/탭에 보여주는 기능 (필요 시 별도 spec).
- 약점 진행 단계 카드의 시각/로직 변경 — 현재 그대로 유지 (review task는 source 무관하게 동일 동작).
- 모의고사 응시·결과·진단 세션 화면(`app/quiz/exam/*`) 변경.
- 백엔드(history-repository) 변경 — 모두 클라이언트 사이드 변경.
- quiz hub의 `ExamAnalysisResumeCard` 변경 — 분석 이어가기 1차 진입 책임은 거기에 그대로 둔다.

## 결정 근거

1. **데이터 모델이 이미 정렬되어 있다.** `ExamType = 'academic' | 'mock' | 'csat'` 모두 `source: 'featured-exam'`으로 통합 저장된다. 10문제 진단(`source: 'diagnostic'`)만 분리해 빼면 정합성이 자연스럽게 맞는다.
2. **탭 책임 분리가 명확해진다.**
   - quiz hub(홈) = "다음 행동" (학습 여정 / 분석 이어가기 / 새 시험 풀기)
   - 기록 = "쌓인 결과" (누적 성취 / 응시 이력 / 약점 진행)
3. **사용 맥락과 정렬된다.** `(tabs)/_layout.tsx`에서 `quiz` 탭바는 `practiceGraduatedAt` 이전엔 숨겨진다. 즉 학평/모의고사는 졸업 후 메인 컨텐츠이고, 기록 탭도 사실상 졸업 후 사용자가 주로 본다.

## 화면 구성

```
┌─────────────────────────────────┐
│ [히어로 카드] 누적 성취         │
│   총 응시 N회                   │
│   평균 정답률 X%                │
│   자주 발견된 약점 TOP 3        │
│   (조건부) 이어서 분석하기 →    │
├─────────────────────────────────┤
│ [약점별 진행 단계] (기존 유지)  │
├─────────────────────────────────┤
│ [최근 시험 이력] (신규)         │
│   • 시험명 / 날짜 / 점수 / 상태 │
│   • … (최근 5회)                │
└─────────────────────────────────┘

빈 상태 (응시 0회):
┌─────────────────────────────────┐
│ 아직 학평/모의고사 기록이       │
│ 없어요. 첫 시험을 풀어보세요.   │
│ [시험 풀러 가기 →]              │
└─────────────────────────────────┘
```

### 히어로 카드 (재작성)

| 슬롯 | 데이터 |
| --- | --- |
| 메인 카운트 | `summary.totals.featuredExamAttempts` (총 응시 N회) |
| 정답률 | 최근 5회의 `featured-exam` attempt 평균 정답률 |
| 약점 TOP 3 | `summary.repeatedWeaknesses` 상위 3개 (잠정) |
| CTA | 분석 미완료 모의고사 존재 시 "이어서 분석하기" / 그 외 시 CTA 없음 |

> **약점 TOP 3 source 결정 (구현 단계)**: `summary.repeatedWeaknesses`는 backend가 모든 source(`diagnostic` + `featured-exam`) 누적으로 계산할 가능성이 있다. 화면 정체성("학평/모의고사 전용")과 정렬하려면 featured-exam 한정 데이터가 이상적이다. 구현 시 두 가지 옵션 중 하나 선택:
> 1. backend `repeatedWeaknesses`를 그대로 사용 (단순, 단 정체성 약간 흐려짐)
> 2. `loadRecentAttempts({ source: 'featured-exam' })` 결과의 `topWeaknesses` 배열을 클라이언트에서 집계 (정체성 부합, 약간의 계산 추가)
>
> 1차 구현은 옵션 1로 출시 → 사용자 피드백 보고 옵션 2로 보강.

CTA 분기 로직:

```ts
if (analysisInProgressState.isInProgress) {
  // CTA: "이어서 분석하기 →"
  // → onResumeAnalysis 동작 (quiz hub의 동일 함수 재사용)
} else {
  // CTA 없음 — 히어로는 통계 표시만
}
```

분석 이어가기 액션은 `getLatestExamAttempt` + `getDiagnosisProgress` + `computeAnalysisInProgressState` + `hydrateResult`를 quiz hub과 동일하게 사용한다. 두 화면이 같은 store/context를 읽으므로 추가 동기화 비용 없음.

### "최근 시험 이력" 카드 (신규)

```
최근 시험 이력
─────────────────
2026 3월 고3 미적분 학력평가
2026.03.05 · 84점 · 정답률 87%
[분석 완료]                    →

2025 9월 고3 미적분 모의고사
2025.09.04 · 72점 · 정답률 73%
[분석 진행 중 4/8]             →

…
```

데이터: `loadRecentAttempts({ source: 'featured-exam', limit: 5 })`.

상태 배지 산출:
- `attempt.questions[*].diagnosisCompleted`가 모두 `true` → `완료`
- 일부만 `true` → `진행 중 N/M`
- 모두 `false` → `미시작`

탭 동작:
- `완료` / `미시작` → `/quiz/exam/result`로 진입 (해당 attempt result hydrate 후)
- `진행 중` → `onResumeAnalysis`와 동일 흐름 (`hydrateResult` + `/quiz/exam/diagnosis-session`)
  - 단, "최근 1건"이 아닌 임의 attempt 진입이 가능하도록 처리 필요. **현재는 `latest-exam-attempt-store`가 1건만 저장** → 1단계에서는 "가장 최근 1건만 분석 재개 가능", 그 외 진행 중 항목은 `완료`와 동일하게 result로 보낸다(추후 별도 spec에서 확장).

### 빈 상태

조건: `summary.totals.featuredExamAttempts === 0`

- 히어로 자리에 안내 카드만 표시
- "약점 진행 단계", "최근 시험 이력" 섹션은 숨김
- CTA "시험 풀러 가기 →" → `/(tabs)/exam` (인접 spec 머지 후) 또는 `/(tabs)/quiz/exams` (인접 spec 머지 전)

졸업 전 사용자도 별도 분기 없이 `featuredExamAttempts === 0`이면 자연스럽게 빈 상태로 처리된다.

## 데이터 흐름 변경 요약

| 위치 | 기존 | 변경 |
| --- | --- | --- |
| `use-history-screen.ts` | `loadRecentAttempts({ source: 'diagnostic', limit: 5 })` | `loadRecentAttempts({ source: 'featured-exam', limit: 5 })` |
| `use-history-screen.ts` | `useEffect(..., [summary?.updatedAt])` | `useFocusEffect` 추가 (5초 throttle, quiz hub 패턴 참고) |
| `use-history-screen.ts` | 분석 상태 미사용 | `getLatestExamAttempt` + `getDiagnosisProgress` + `computeAnalysisInProgressState` 사용 |
| `history-insights.ts` | `buildHero` (복습 카운트/진단 정답률 기반) | `buildHero` 재작성 (응시 카운트/모의고사 정답률/약점 TOP 3 기반) |
| `history-insights.ts` | `buildPulseItems` (recentActivity 3건) | 제거 — "최근 시험 이력" 카드로 대체 |
| `history-insights.ts` | `buildWeaknessProgress` | 그대로 유지 |
| `history-screen-view.tsx` | 기존 카드 구성 | 히어로 재디자인, "최근 시험 이력" 섹션 신설, 빈 상태 추가 |

## 컴포넌트 변경 범위

### 수정

- `features/history/hooks/use-history-screen.ts`
- `features/history/history-insights.ts`
- `features/history/components/history-screen-view.tsx`

### 신설

- `features/history/components/exam-history-list-card.tsx` (또는 `history-screen-view`에 인라인)
- `features/history/components/history-empty-card.tsx` (또는 인라인)

### 삭제

- 없음 (기존 컴포넌트 모두 유지하거나 인라인 구조라 별도 삭제 없음)

### 재사용

- `EXAM_CATALOG_BY_ID` (시험명 lookup)
- `getLatestExamAttempt`, `getDiagnosisProgress` (분석 상태 표시)
- `computeAnalysisInProgressState` (분석 미완료 판단)
- `useExamSession().hydrateResult` (분석 재개 시)

## 회귀 위험 및 완화

1. **`loadRecentAttempts({ source: 'featured-exam' })`의 백엔드 동작 미확인**
   - `current-learner-controller.ts`에서 `learningHistoryRepository.listAttempts(accountKey, { source })`로 위임 — repository 구현이 `featured-exam` source 필터를 지원하는지 구현 단계에서 확인 필요.
   - 미지원 시 폴백: 클라이언트에서 전체 로드 후 `source === 'featured-exam'` 필터링.
2. **`useFocusEffect` 추가로 인한 과도한 fetch**
   - quiz hub과 동일한 5초 throttle 패턴 적용 (`lastFocusRefreshAtRef`).
3. **졸업 전 사용자 경험 변화**
   - 이전: 진단 기록을 보여줬을 가능성 → 현재: 빈 상태.
   - 의도된 동작이며 졸업 전엔 응시 데이터가 거의 없으므로 영향 작음. PR 설명에 명시.
4. **"진행 중" 상태 표시의 정확성**
   - `attempt.questions[*].diagnosisCompleted`는 첫 `recordAttempt`(분석 전) 시점엔 모두 `false`로 저장됨 — 즉 분석 시작 전엔 "미시작"으로 잡히는 게 정상.
   - `latest-exam-attempt-store`가 1건만 저장하므로 "두 번 응시했는데 둘 다 분석 중"인 케이스는 1건만 재개 가능. 2단계 확장은 별도 spec.

## 검증 항목

- [ ] 모의고사 응시 직후 기록 탭 → 응시 횟수 +1, 최근 이력 최상단 항목 추가
- [ ] 모의고사 분석 미완료 상태 → 히어로 CTA "이어서 분석하기" 노출, 클릭 시 quiz hub과 동일 흐름
- [ ] 모의고사 진단 모두 완료 → 히어로 약점 TOP 3에 반영, "최근 시험 이력" 항목 상태 `완료`
- [ ] 응시 0회 → 빈 상태 카드 + "시험 풀러 가기" CTA만 노출
- [ ] 다른 탭 갔다가 기록 탭 복귀 → 5초 후 자동 새로고침 동작
- [ ] "최근 시험 이력" 항목 탭 → 상태별로 result 또는 diagnosis-session 진입
- [ ] 졸업 전 사용자(`practiceGraduatedAt` 없음) → 빈 상태로 자연스러운 표시

## 후속 작업 (별도 spec 후보)

- `latest-exam-attempt-store`를 N건 저장 형태로 확장 → 과거 미완료 분석 재개 가능
- 시험별 상세 결과 화면 (이력 항목 탭 시 result가 아닌 전용 상세 화면)
- 학평/모의고사 통계 추이 그래프 (월별 정답률 추이 등)
