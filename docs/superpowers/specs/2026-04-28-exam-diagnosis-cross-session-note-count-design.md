# 모의고사 진단 — 세션 간 누적 노트 카운트 정확화

## 배경/목적

진단 채팅 안의 학습 노트 박스(`NoteCollectionBar`)에서 점(dot) 표시가 세션 사이에 끊어진다.

**시나리오:** 오답 = [1, 3, 5].
1. 결과 화면에서 3번 클릭 → 세션 1: 큐 [3], `totalNotes=1`. 3번 진단 완료. 미니카드: ● (1/1) — 이 시점은 OK처럼 보이지만 다음에서 문제 발생.

   *(엄밀히는 첫 진입 시 큐 = [3, 1, 5] 회전. 본질은 같음 — 아래 본 시나리오 참조)*

**본 시나리오:**
1. 결과 화면에서 3번 클릭 → 세션 1: 큐 [3, 1, 5], `totalNotes=3`. 3번 진단 완료. 미니카드: ●○○ (1/3, "2장 더 모으면"). ✓
2. 잠시 쉬기 → 결과 화면 복귀 → 1번 클릭 → 세션 2: 큐 [1, 5], `totalNotes=2`. 1번 진단 완료. 미니카드: ●○ (1/2, "1장 더 모으면"). ❌ 사용자 기대: ●●○ (2/3).

**원인:**
- `totalNotes` = 현재 세션 큐 길이 (`wrongProblemNumbers.length`)
- `currentNoteCountBeforeThis` = 이번 세션에서 완료한 인덱스 수 (`session.diagnosedIndices.length`)

→ 새 세션마다 0부터 시작. 이전 세션에서 완료한 노트가 점 표시에 누락됨.

**해결:** 결과 화면 / 퀴즈 허브에서 진단 세션 진입 시, "전체 오답 수"와 "이전까지 완료 수"를 route param으로 전달. 세션 화면이 이를 누적해서 사용.

## 아키텍처 요약

route param 2개 추가 + 세션 화면이 누적 계산.

- **route param (NEW):**
  - `totalNotes`: 전체 오답 수 (`wrongCount`)
  - `diagnosedCountBefore`: 이전 세션까지 완료한 진단 수
- **call site (MODIFY):**
  - `use-exam-result-screen.onAnalyzeProblem` — 두 param 추가
  - `use-quiz-hub-screen.onResumeAnalysis` — 두 param 추가
- **session screen (MODIFY):**
  - `exam-diagnosis-session-screen.tsx`
    - param 파싱 (fallback 포함)
    - `totalNotes={parsedTotalNotes}` (큐 길이 대신 전체 기준)
    - `currentNoteCountBeforeThis={diagnosedCountBefore + session.diagnosedIndices.length}` (누적)
- **legacy redirect:** `app/quiz/exam/diagnosis.tsx`는 단일 문제 진입용. 변경 없음. fallback이 처리.

## 파라미터 파싱

`Number()` + `||` fallback 패턴. 동일 파일의 `startIndex`와 일관 (clamp는 불필요 — 상한 없는 단순 숫자).

```ts
const totalNotes =
  Number(getSingleParam(params.totalNotes)) || wrongProblemNumbers.length;
const diagnosedCountBefore =
  Number(getSingleParam(params.diagnosedCountBefore)) || 0;
```

- `Number(undefined)` → NaN → `||` 발동 → fallback
- `Number("abc")` → NaN → fallback
- `Number("0")` → 0 → fallback (`0 || x` = x; 의미상 안전)
- `Number("5")` → 5 → 사용

호출처가 모두 내부(`String(.length)`)이므로 음수 방어 불필요.

## 결과 표

오답 = [1, 3, 5]. 3번 → 1번 → 5번 순으로 진단.

| 시점 | 기존 | 수정 후 |
|---|---|---|
| 3번 완료 (session 1, 큐 [3,1,5]) | ●○○ 1/3 | ●○○ 1/3 |
| 1번 완료 (session 2, 큐 [1,5]) | ●○ 1/2 ❌ | ●●○ 2/3 ✓ |
| 5번 완료 (session 2, 큐 [1,5]) | ●● 2/2 ❌ | ●●● 3/3 ✓ |

## 변경 파일

- **MODIFY** `features/quiz/exam/hooks/use-exam-result-screen.ts` — `router.push` 파라미터에 `totalNotes`, `diagnosedCountBefore` 추가
- **MODIFY** `features/quiz/hooks/use-quiz-hub-screen.ts` — `onResumeAnalysis`에서 동일 파라미터 추가
- **MODIFY** `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx` — 파라미터 파싱 + `ExamDiagnosisPage`에 누적 카운트 전달

## 부수 효과 (긍정)

마일스톤 계산도 함께 정확해진다. `resolveMilestoneToShow`가 `totalNotes`와 `noteCountAfterThis`를 입력으로 받는데, 둘 다 전체 기준으로 바뀌므로 세션을 가로지르는 마일스톤(1/4, 1/2, 3/4)이 올바른 시점에 발화한다. 이미 `markMilestoneShown` 스코프가 `examId/attemptId/attemptDateISO`라 중복 발화 방지는 보존됨.

## 회귀 위험

- **첫 진입 (이전 진단 0개):** `diagnosedCountBefore=0`, `totalNotes=wrongCount`. 기존과 동일 동작.
- **deep link / 구 빌드 호환:** 새 param 누락 시 fallback (큐 길이, 0)으로 기존(버그) 동작. crash 없음.
- **stale `diagnosedProblems`:** 결과 화면의 `useFocusEffect` 비동기 갱신 직전 짧은 윈도우에서는 `diagnosedCount`가 0일 수 있음. 이 경우 큐도 [1,3,5]로 폴백되고 `diagnosedCountBefore=0`이라 자체 정합성은 유지. 사용자 체감은 기존 stale 동작과 동일.
- **legacy redirect:** 단일 문제 케이스. fallback이 정상 처리.

## 테스트

- **단위:** `use-exam-result-screen` / `use-quiz-hub-screen`의 `router.push` 호출 인자 검증 (router mock).
- **시뮬레이터 smoke (가장 가치):** 위 결과 표대로 점이 채워지는지 시각 확인.
- 기존 `buildDiagnosisQueue` 테스트는 변경 영향 없음 (그대로).
