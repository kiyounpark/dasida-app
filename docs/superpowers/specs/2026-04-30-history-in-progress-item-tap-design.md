# History In-Progress Item Tap (Cross-Device) — Design Spec

**Date:** 2026-04-30
**Status:** Approved

## Goal

기록 탭 "최근 시험 이력" 리스트에서 **분석중(`in_progress`) 항목을 탭하면 결과화면(`/quiz/exam/result`)으로 이동**해 사용자가 문제 그리드를 보고 분석할 문제를 직접 고를 수 있게 한다. 그리고 이 과정에서 **태블릿/폰 등 다기기에서 동일하게 보이고 동작**하도록 데이터 출처를 폰 로컬 저장소에서 서버로 옮긴다.

## Background

### 기존 동작의 한계

현재 "분석중" 판단과 결과화면 진입은 **그 기기 안의 AsyncStorage**에 의존한다.

| 메모 | 저장 위치 | 내용 |
|---|---|---|
| `latest-exam-attempt-store` | AsyncStorage | 마지막 시험의 attempt 메타 + `ExamResultSummary` |
| `exam-diagnosis-progress` | AsyncStorage | `{문제번호: weaknessId}` 진단 진행 상태 |

따라서 사용자가 태블릿에서 시험 풀고 분석 중간에 멈춰도, 폰으로 들어가면 **두 메모 모두 비어 있어 "분석중" 자체가 표시되지 않고 결과화면 진입도 불가능**하다.

또 다른 한계: 현재 "분석중"은 **isLatest인 attempt 1개**에만 부여된다 (`history-insights.ts:165-169`). 과거 attempt가 부분 분석된 상태였어도 "분석 미시작"으로 잘못 표시된다.

### 서버에 이미 있는 데이터

서버 측 스키마는 다기기 동작에 필요한 정보를 이미 모두 보유한다.

- `LearningAttempt`: attemptId, wrongCount, correctCount, primaryWeaknessId 등
- `LearningAttemptResult[]`: 문제별 `questionNumber`, `isCorrect`, `finalWeaknessId`, **`diagnosisCompleted`**

다만 `recordAttempt`(POST)는 현재 두 시점에만 호출된다:
1. 채점 직후 — 모든 문제 `diagnosisCompleted: false`
2. 모든 분석 완료 시점 — 모든 오답 `diagnosisCompleted: true`

→ **부분 진단 상태는 서버에 기록되지 않는다.** 이게 비어있어서 `listAttemptResults`만 읽어서는 "5문제 중 3개 분석됨"을 알 수 없다.

### 핵심 인사이트

- 데이터 형태(폰 메모 vs 서버 `LearningAttemptResult`)는 본질적으로 동일하다. **저장 위치만 다르다.**
- 서버 스키마는 이미 충분하다. **백엔드 작업 불필요.**
- 부족한 건 한 가지: **"중간 진행 상태가 서버에 도달하는 경로"**.

## Approach: Server-Authoritative + Departure-Time Sync

### 데이터 출처 변경 (Read)

**기록 탭의 "분석중/시작전/완료" 판단을 서버 데이터로 일원화한다.**

```
기록 탭 진입
   ↓
loadRecentAttempts(featured-exam, limit=5)        ← 이미 동작
   ↓
가장 최근 attempt 1개에 대해
listAttemptResults(latestAttemptId)               ← 신규
   ↓
diagnosisCompleted=true 갯수(K) vs wrongCount(N)
   ↓
K == 0      → "분석 시작 전"  (또는 wrongCount==0 → "만점")
0 < K < N   → "분석중 K/N"
K == N      → "분석 완료"
```

본 spec은 `isLatest` 정책(=최신 attempt만 분석중 표시)을 **유지한다**. 서버 데이터는 모든 attempt에 대해 정확한 상태를 제공할 수 있지만, 그 가시화는 별도 UX 결정이 필요하므로 본 범위 밖.

### 진입 흐름 (Hydrate)

기록 탭에서 `in_progress` 항목 탭 시:

```
1. 서버에서 latestAttempt + listAttemptResults 받음
   (이미 기록 탭 표시용으로 가져온 것 재사용)

2. ExamResultSummary 재구성
   - LearningAttempt(메타) + LearningAttemptResult[](문제별)
   + EXAM_CATALOG_BY_ID + getExamProblems(정적 데이터)
   = ExamResultSummary

3. 폰 메모(exam-diagnosis-progress) 시드 — **await 필수**
   - results 중 diagnosisCompleted=true인 항목들을
   - { 문제번호: finalWeaknessId } 형태로 AsyncStorage에 기록 (기존 키 덮어쓰기)
   - (이어서 분석할 때 기존 진단 세션 흐름이 그대로 작동하기 위함)
   - 시드가 끝나기 전에 push하면 결과화면의 첫 useFocusEffect가 빈 상태를 읽어 진행률이 0으로 깜박일 수 있으므로, 반드시 await 후 다음 단계 진행

4. hydrateResult(reconstructedSummary)
5. router.push('/quiz/exam/result?resumed=1')
```

### 동기화 시점 (Write)

`recordAttempt`를 다음 4곳에서 호출해 폰 로컬 진단 상태를 서버에 반영한다.

| # | 시점 | 호출 위치 |
|---|------|-----------|
| 1 | 진단 세션 → "잠시 쉬기" → 홈 | 미니카드 "잠시 쉬기" 핸들러 |
| 2 | 진단 세션 → 모든 분석 완료 → 결과화면 복귀 | (기존) `useExamResultScreen`의 all-done useEffect |
| 3 | 결과화면 → "홈으로 돌아가기" | `useExamResultScreen.onReturnHome` |
| 4 | 앱 백그라운드 (홈버튼/스와이프) | `AppState` 리스너 |

각 시점에서 호출되는 페이로드는 **현재 폰 메모(`exam-diagnosis-progress`) 전체를 통째로** `buildExamAttemptInputWithDiagnosis`에 통과시켜 만든다. `recordAttempt`는 attempt를 통째로 덮어쓰는 시멘틱이므로 부분 업데이트가 아닌 "지금까지 분석된 전체"를 보낸다.

#### 충돌 처리: last-write-wins (단순화)

같은 사용자가 두 기기에서 **동시에** 분석하는 시나리오는 드물다는 가정 하에 last-write-wins를 받아들인다. 일반 사용 패턴(시간 차이를 두고 한 기기씩 사용)에서는 문제 없다.

만약 이후 보강이 필요하면 "쓰기 직전 서버에서 한 번 받아 머지" 전략을 적용 가능. 본 spec 범위 밖.

### 결과화면 내부 동작 (변경 없음)

`useExamResultScreen`의 핵심 로직은 그대로 유지:
- `useFocusEffect`로 `getDiagnosisProgress`를 재조회 → 진행률 표시
- `isResumed`이면 채점 시점의 `recordAttempt` 스킵
- `diagnosedCount === wrongCount` 도달 시 `router.replace('/quiz/result')` 자동 이동

추가되는 것은 `onReturnHome`에서 `recordAttempt`를 한 번 호출하는 것뿐이다.

## Scope

### 신규 파일

- **`features/quiz/exam/build-exam-result-summary-from-attempt.ts`** — 서버의 `LearningAttempt + LearningAttemptResult[]`로부터 `ExamResultSummary` 재구성하는 순수 함수. 정적 데이터(`EXAM_CATALOG_BY_ID`, `getExamProblems`)와 합쳐 `total/correct/wrong/unanswered/accuracy/totalScore/maxScore/perProblem` 채움.
- **`features/quiz/exam/sync-diagnosis-progress.ts`** — 서버 `LearningAttemptResult[]`로부터 `exam-diagnosis-progress` AsyncStorage를 시드하는 함수.

### 변경 파일

- **`features/history/hooks/use-history-screen.ts`**
  - `analysisState` 계산 출처를 폰 메모 → 서버 `listAttemptResults`로 교체
  - `onPressExamHistoryItem(item)` 핸들러 추가:
    - 가드: `status === 'in_progress'` + 서버 데이터 존재
    - `build-exam-result-summary-from-attempt`로 재구성
    - `sync-diagnosis-progress`로 폰 메모 시드
    - `hydrateResult` → `router.push('/quiz/exam/result?resumed=1')`
- **`features/history/components/history-screen-view.tsx`**
  - `examHistoryItem` `View` → `Pressable`로 교체 (`in_progress`만 `onPress` 활성)
  - `in_progress` 항목 우측에 chevron(`›`, 14pt, `BrandColors.mutedText`) 추가
- **`features/history/history-insights.ts`**
  - `buildExamHistoryItems`의 `analysisState` 입력은 그대로 받되, 서버 기반 계산 결과를 받게 인터페이스 정리. 코드 자체는 거의 변경 없음(이미 `analysisState`를 받음).
- **`features/quiz/exam/hooks/use-exam-result-screen.ts`**
  - `onReturnHome` 핸들러에 `recordAttempt(buildExamAttemptInputWithDiagnosis(...))` 호출 추가 (sync point #3)
- **`features/quiz/exam/components/diagnosis-mini-card.tsx`** (`잠시 쉬기` 버튼 위치)
  - "잠시 쉬기" 핸들러 prop을 통해 sync point #1을 트리거. 핸들러 자체는 호출자(진단 세션 screen 또는 hook)에 정의해 `recordAttempt(...)` 호출.
- **앱 루트 또는 `features/quiz/exam` 내 적절한 위치**
  - `AppState` 리스너로 백그라운드 진입 감지 → 활성 attempt가 있으면 `recordAttempt` (sync point #4). DASIDA 구조 기준에 맞춰 `features/quiz/exam/use-app-background-sync.ts` 같은 hook으로 분리.

### 테스트 신규/갱신

- `features/quiz/exam/__tests__/build-exam-result-summary-from-attempt.test.ts` — 정상 케이스, unanswered 포함, 만점 케이스
- `features/quiz/exam/__tests__/sync-diagnosis-progress.test.ts` — 시드 결과 검증, 빈 결과 처리
- `features/history/__tests__/use-history-screen.test.ts` — `onPressExamHistoryItem`이 in_progress에만 동작, hydrate→push 호출, 가드 동작
- `features/quiz/exam/hooks/use-exam-result-screen.test.ts` — `onReturnHome`이 recordAttempt 호출하는지 추가 케이스
- 진단 세션 "잠시 쉬기" 핸들러 테스트 — 기존 테스트에 recordAttempt 호출 검증 추가

기존 `history-insights.test.ts`는 `analysisState` 입력이 같은 형태이므로 변경 불필요.

## Out of Scope

- **과거 attempt(non-latest)에 대한 "분석중" 표시** — 서버 데이터로 가능하지만 가시화는 별도 UX 결정. 본 spec은 isLatest 정책 유지.
- **두 기기 동시 작업 충돌의 정밀 처리** — last-write-wins로 단순화. 필요 시 후속 spec.
- **백엔드 스키마/엔드포인트 변경** — 기존 `recordAttempt` 시그니처와 `listAttemptResults` 응답 그대로 사용.
- **결과화면 자체 UX/레이아웃 변경** — `useExamResultScreen` 핵심 로직 손대지 않음 (`onReturnHome`에 한 줄 추가만).
- **hero CTA(`onPrimaryAction`) 동작 변경** — 진단 세션 직진 그대로. 두 진입점이 의도된 공존.
- **AppState 백그라운드 처리의 큐잉/재시도** — 단순 fire-and-forget. 실패 시 다음 sync point에서 회복.
- **이력 리스트 정렬/페이지네이션** — 5건 제한 그대로.

## Verification

### 자동
- `npm test -- features/history` 통과
- `npm test -- features/quiz/exam` 통과
- 회귀: 기존 `history-insights.test.ts`, `exam-result-screen.test.ts` 통과 유지
- `npx tsc --noEmit` 통과

### 수동 (다기기 시나리오)

`npx expo run:ios`로 시뮬레이터(폰)와 실기기(태블릿) 또는 두 시뮬레이터를 같은 계정으로 로그인 후:

1. **단일 기기 회귀** — 한 기기에서 시험 응시 → 일부 분석 → 홈 → 기록 탭에서 "분석중 X/Y" 표시되는지. 항목 탭 → 결과화면 진입 → 진행률·그리드 정상 표시. 나머지 분석 → 리포트 자동 이동.
2. **태블릿 → 폰 가시성** — 태블릿에서 시험 + 일부 분석 + "잠시 쉬기" 또는 "홈으로". 폰에서 같은 계정 로그인 → 기록 탭에 같은 attempt가 **같은 분석중 카운트**로 보이는지.
3. **다기기 이어서 분석** — 태블릿에서 3/5까지 분석 → 폰에서 기록 탭 탭 → 결과화면 진입 → 4번째 분석 → "홈으로". 다시 태블릿에서 기록 탭 새로고침 → 4/5로 보이는지.
4. **앱 백그라운드 동기화** — 분석 도중 홈버튼/스와이프로 백그라운드 → 다른 기기에서 기록 탭 새로고침 → 최신 카운트 반영되는지.
5. **resumed 진입 회귀** — `?resumed=1`이라 중복 `recordAttempt`가 안 가는지 (네트워크 패널 또는 saveState 인디케이터 확인).
6. **만점/시작전 표시** — 만점 attempt와 분석 0개 attempt가 각각 "만점"/"분석 시작 전"으로 정확히 표시되는지.
7. **hero CTA 회귀** — hero "이어서 분석하기 →" 버튼은 여전히 진단 세션으로 직진하는지.
8. **시각 affordance** — `in_progress` 행에 chevron 표시, 다른 행은 무반응.
