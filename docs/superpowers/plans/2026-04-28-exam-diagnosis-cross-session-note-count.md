# 모의고사 진단 — 세션 간 누적 노트 카운트 정확화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 진단 세션의 학습 노트 박스(NoteCollectionBar) 점 카운트가 세션 간에 끊어지지 않고 전체 오답 기준으로 누적되도록 한다.

**Architecture:** 결과 화면 / 퀴즈 허브 두 진입점에서 `totalNotes`(전체 오답 수)와 `diagnosedCountBefore`(이전까지 완료한 진단 수)를 route param으로 전달. 세션 화면이 이를 누적해서 사용. 세 파일 모두 mechanical change 수준이라 새 단위 테스트는 추가하지 않고 시뮬레이터 smoke로 검증.

**Tech Stack:** TypeScript, React Native, expo-router, Jest

**Spec deviation note:** Spec의 "router mock 단위 테스트" 항목은 이행하지 않음. 두 call site의 변경이 `String(n)` 두 줄 추가에 불과해 검증 가치가 낮고, 기존 `use-exam-result-screen.test.ts` 자체가 hook mounting을 회피하는 패턴이며 (헤더 주석 참조), 실제 버그 (consumer 누적 산술) 는 시뮬레이터 smoke로만 의미 있게 검증된다.

---

## File Structure

- **Modify** `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx` — route param 2개 파싱 + `ExamDiagnosisPage`에 누적 카운트 전달
- **Modify** `features/quiz/exam/hooks/use-exam-result-screen.ts` — `onAnalyzeProblem`의 `router.push` params에 `totalNotes`, `diagnosedCountBefore` 추가
- **Modify** `features/quiz/hooks/use-quiz-hub-screen.ts` — `onResumeAnalysis`의 `router.push` params에 동일 2개 추가

기존 helpers/tests는 변경 영향 없음:
- `features/quiz/exam/build-diagnosis-queue.ts` — 그대로
- `features/quiz/exam/__tests__/build-diagnosis-queue.test.ts` — 그대로
- `features/quiz/exam/hooks/use-exam-result-screen.test.ts` — 그대로 (recordAttempt contract 만 검증, route param 무관)
- `app/quiz/exam/diagnosis.tsx` (legacy redirect) — 그대로 (fallback이 단일 문제 진입을 처리)

---

### Task 1: 세션 화면이 새 route param을 누적해서 사용하도록 수정

**Files:**
- Modify: `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx`

이 task가 본질적인 버그 수정이다. Producer 두 곳(use-exam-result-screen, use-quiz-hub-screen)은 아직 새 param을 보내지 않으므로, 이 시점에는 fallback path로 작동한다 (= 기존 버그 동작 그대로). Producer task를 마치고 나서야 누적이 실제로 일어난다. 이렇게 분리한 이유: 세션 화면 변경 후에도 빌드가 깨지지 않고, 두 producer 작업이 독립 commit이 되기 때문.

- [ ] **Step 1: 현재 코드 위치 확인**

`features/quiz/exam/screens/exam-diagnosis-session-screen.tsx` 24-44행 (param 파싱), 96-97행 (태블릿 분기), 143-144행 (폰 분기)을 읽어둔다.

- [ ] **Step 2: param 파싱 추가**

`features/quiz/exam/screens/exam-diagnosis-session-screen.tsx`의 `ExamDiagnosisSessionScreen` 함수 안, 기존 `startIndex` 계산 직후(35행 `);` 바로 다음 빈 줄)에 다음 두 줄을 추가:

```tsx
  const totalNotes =
    Number(getSingleParam(params.totalNotes)) || wrongProblemNumbers.length;
  const diagnosedCountBefore =
    Number(getSingleParam(params.diagnosedCountBefore)) || 0;
```

`Number(undefined) → NaN → || 발동`, `Number("abc") → NaN → 발동`, `Number("0") → 0 → 발동` (모두 의미상 안전), `Number("5") → 5 → 사용`. clamp 불필요 (상한 없는 단순 숫자, 호출처가 모두 내부 `String(.length)`이라 음수 방어 불요).

- [ ] **Step 3: 태블릿 분기에서 누적 카운트 전달**

태블릿 분기 (현재 96-97행) 두 줄을 다음과 같이 변경:

변경 전:
```tsx
            totalNotes={wrongProblemNumbers.length}
            currentNoteCountBeforeThis={session.diagnosedIndices.length}
```

변경 후:
```tsx
            totalNotes={totalNotes}
            currentNoteCountBeforeThis={diagnosedCountBefore + session.diagnosedIndices.length}
```

- [ ] **Step 4: 폰 분기에서 누적 카운트 전달**

폰 분기 `FlatList`의 `renderItem` (현재 143-144행) 두 줄을 동일하게 변경:

변경 전:
```tsx
            totalNotes={wrongProblemNumbers.length}
            currentNoteCountBeforeThis={session.diagnosedIndices.length}
```

변경 후:
```tsx
            totalNotes={totalNotes}
            currentNoteCountBeforeThis={diagnosedCountBefore + session.diagnosedIndices.length}
```

- [ ] **Step 5: TypeScript 타입체크**

Run: `npx tsc --noEmit`
Expected: PASS (에러 없음)

- [ ] **Step 6: 기존 테스트 회귀 확인**

Run: `npm test -- --testPathPattern='features/quiz/exam'`
Expected: 모두 PASS (이번 변경은 어떤 기존 테스트에도 직접 닿지 않음)

- [ ] **Step 7: Commit**

```bash
git add features/quiz/exam/screens/exam-diagnosis-session-screen.tsx
git commit -m "$(cat <<'EOF'
fix(diagnosis): 세션 화면이 누적 노트 카운트를 사용

route param totalNotes / diagnosedCountBefore을 파싱하여
NoteCollectionBar에 전달. fallback이 있으므로 producer task
이전까지는 기존 동작을 유지한다.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 결과 화면이 새 param을 전달하도록 수정

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-result-screen.ts`

- [ ] **Step 1: 현재 호출부 확인**

`features/quiz/exam/hooks/use-exam-result-screen.ts` 181-198행 (`onAnalyzeProblem`)를 읽어둔다. `wrongCount`, `diagnosedCount`는 이미 같은 hook 안에서 계산되어 있다 (101-104행).

- [ ] **Step 2: `router.push` params 두 줄 추가**

`onAnalyzeProblem` 안의 `router.push` 호출 (현재 190-197행)을 다음과 같이 변경:

변경 전:
```ts
      router.push({
        pathname: '/quiz/exam/diagnosis-session',
        params: {
          examId: result.examId,
          wrongProblemNumbers: JSON.stringify(queue),
          startIndex: '0', // buildDiagnosisQueue가 클릭한 문제를 큐 첫 자리에 두므로 항상 0
        },
      });
```

변경 후:
```ts
      router.push({
        pathname: '/quiz/exam/diagnosis-session',
        params: {
          examId: result.examId,
          wrongProblemNumbers: JSON.stringify(queue),
          startIndex: '0', // buildDiagnosisQueue가 클릭한 문제를 큐 첫 자리에 두므로 항상 0
          totalNotes: String(wrongCount),
          diagnosedCountBefore: String(diagnosedCount),
        },
      });
```

- [ ] **Step 3: TypeScript 타입체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: 기존 hook 테스트 회귀 확인**

Run: `npm test -- features/quiz/exam/hooks/use-exam-result-screen.test.ts`
Expected: 모두 PASS (이 테스트는 recordAttempt contract만 검증하므로 무관)

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/hooks/use-exam-result-screen.ts
git commit -m "$(cat <<'EOF'
fix(diagnosis): 결과 화면에서 누적 노트 카운트 param 전달

onAnalyzeProblem이 totalNotes(=wrongCount)와
diagnosedCountBefore(=diagnosedCount)를 route param으로 전달.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 퀴즈 허브 (resume) 가 새 param을 전달하도록 수정

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts`

- [ ] **Step 1: 현재 호출부 확인**

`features/quiz/hooks/use-quiz-hub-screen.ts` 195-209행 (`onResumeAnalysis`)을 읽어둔다. `latestAttempt.wrongProblemNumbers.length` = 전체 오답 수, `startIndex` = 이전까지 완료한 수 (이미 `analysisState.diagnosedNotes.length`로 계산됨, 200행).

- [ ] **Step 2: `router.push` params 두 줄 추가**

`onResumeAnalysis` 안의 `router.push` 호출 (현재 201-208행)을 다음과 같이 변경:

변경 전:
```ts
    router.push({
      pathname: '/quiz/exam/diagnosis-session',
      params: {
        examId: latestAttempt.examId,
        wrongProblemNumbers: JSON.stringify(latestAttempt.wrongProblemNumbers),
        startIndex: String(startIndex),
      },
    });
```

변경 후:
```ts
    router.push({
      pathname: '/quiz/exam/diagnosis-session',
      params: {
        examId: latestAttempt.examId,
        wrongProblemNumbers: JSON.stringify(latestAttempt.wrongProblemNumbers),
        startIndex: String(startIndex),
        totalNotes: String(latestAttempt.wrongProblemNumbers.length),
        diagnosedCountBefore: String(startIndex),
      },
    });
```

`startIndex`와 `diagnosedCountBefore`가 동일한 값이지만 의미가 다르다: 전자는 큐 위치 (0-based 시작 인덱스), 후자는 누적 카운트. 우연히 같은 값이지만 별도 param으로 전달해 의도를 명확히 한다.

- [ ] **Step 3: TypeScript 타입체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: 전체 테스트 스위트 회귀 확인**

Run: `npm test`
Expected: 모두 PASS

- [ ] **Step 5: Commit**

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts
git commit -m "$(cat <<'EOF'
fix(diagnosis): 퀴즈 허브 resume에서 누적 노트 카운트 param 전달

onResumeAnalysis가 totalNotes와 diagnosedCountBefore를
route param으로 전달. startIndex와 diagnosedCountBefore는
동일 값이지만 의미가 달라 별도 param으로 전송.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 시뮬레이터 smoke — 본 시나리오 검증

**Files:** (없음, 수동 검증)

이 단계가 본 변경의 가장 가치 있는 검증이다. 시뮬레이터에서 spec 결과 표 그대로 진행해 점이 채워지는지 시각 확인.

- [ ] **Step 1: 시뮬레이터 빌드 & 실행**

Run: `npx expo run:ios`
Expected: 빌드 성공 후 시뮬레이터에서 앱이 실행됨.

(주의: 패키지 변경이 없으므로 `npx expo prebuild --clean`은 불필요. 만약 빌드 실패 시 `npx expo prebuild --clean` 후 재시도.)

- [ ] **Step 2: 진단 진입을 위한 모의고사 응시**

홈 → 모의고사 진입 → 의도적으로 3문제 이상을 틀리게 답안 제출 → 결과 화면 도달.

- [ ] **Step 3: 본 시나리오 — 세션 1**

오답 첫 번째 문제 클릭 → 진단 채팅 화면 진입 → 마지막까지 진단 완료 (manual 답변, 미니카드 출력까지).

기대 결과 (NoteCollectionBar):
- 첫 미니카드 직전: ○○○ (0/3, "3장 더 모으면")
- 첫 미니카드 직후: ●○○ (1/3, "2장 더 모으면")

- [ ] **Step 4: 본 시나리오 — 세션 2 (다른 문제 클릭)**

진단 화면 헤더 ← 채점 결과 → 결과 화면 복귀 → 다른 미진단 오답 클릭 → 새 진단 세션 진입.

기대 결과 (이번 변경의 핵심):
- 진입 직후 첫 미니카드 전: ●○○ (1/3, "2장 더 모으면") — **이전 세션 진단이 점 1개로 보존**
- 첫 미니카드 직후: ●●○ (2/3, "1장 더 모으면")

기존 버그 동작이라면 ○○ (0/2) 또는 ●○ (1/2)로 표시됨. 그렇게 보이면 회귀.

- [ ] **Step 5: 본 시나리오 — 세션 3 (마지막 오답)**

다시 결과 화면 복귀 → 마지막 미진단 오답 클릭 → 진단 진행 → 미니카드 직후:
- 기대: ●●● (3/3) → 자동으로 종합 리포트 화면으로 라우팅

- [ ] **Step 6: 퀴즈 허브 resume 경로 smoke**

세션을 중간까지만 완료해 둔 상태에서 백그라운드 → 홈 → "분석 이어가기" 카드 탭 → 진단 화면 진입.

기대 결과: 점이 이미 완료한 개수만큼 채워져 있어야 함 (예: 1개 완료 후 resume 시 ●○○).

- [ ] **Step 7: Legacy redirect 경로 smoke (단일 문제 진입)**

`app/quiz/exam/diagnosis.tsx`는 단일 문제 deep link/legacy 진입 경로. 이번 변경에서 직접 수정하지는 않았지만, fallback이 정상 작동하는지 확인.

검증 방법: 단일 문제로 진단 화면에 진입하는 경로 (예: 결과 화면에서 단일 오답만 있는 경우 또는 알림 deep link). 진단 채팅이 정상 동작하고 NoteCollectionBar가 1/1로 표시되면 OK (fallback이 `wrongProblemNumbers.length=1`, `diagnosedCountBefore=0`을 적용).

- [ ] **Step 8: 회귀 점검 — 첫 진입 (이전 진단 0개)**

새 사용자/계정 또는 기존 attempt 캐시를 비워두고 처음 진단 진입 → ●○○ ... ●●● 시퀀스가 기존 동작 그대로 노출되는지 확인. 이 경로는 `diagnosedCountBefore=0`, `totalNotes=wrongCount`라 이번 변경의 산술은 기존 동작과 동치.

---

### Task 5: 마무리 — Notion 업데이트 & 알림

**Files:** (없음, 외부 시스템)

- [ ] **Step 1: 푸시 (필요 시)**

```bash
git push origin main
```

- [ ] **Step 2: Notion "DASIDA 개발 기록" 페이지 갱신**

`mcp__notion__notion-update-page`로 다음 페이지를 갱신:
- 페이지 ID: `35073f86-2604-814c-86b7-c7c047479c12`
- 상태: `구현완료`
- 구현완료일: 오늘 날짜 (`YYYY-MM-DD`)
- Spec: GitHub permalink (커밋 해시 포함)
- Plan: GitHub permalink (커밋 해시 포함)
- 본문 `## 완료 메모`: smoke test 통과 결과 1-2줄

- [ ] **Step 3: 종료 알림**

```bash
npm run notify:done -- "모의고사 진단 — 세션 간 누적 노트 카운트 정확화 (3 files modified, simulator smoke OK)"
```

또는 실패 시:
```bash
npm run notify:fail -- "<실패 원인 요약>"
```

---

## Self-Review

**1. Spec coverage:**
- 배경/원인 (route param 누락 → 새 세션마다 0 시작) → Task 1, 2, 3에서 완전히 해결.
- 아키텍처 요약 (param 2개 + 누적) → Task 1 (consumer), Task 2/3 (producer) 분리 구현.
- 파라미터 파싱 (`||` fallback) → Task 1 Step 2.
- 결과 표 (●○○ → ●●○ → ●●●) → Task 4 Step 3-5에서 모두 검증.
- 부수 효과 (마일스톤 자동 정확화) → Task 1 변경으로 자동 반영. 별도 task 불필요 (이미 `resolveMilestoneToShow`가 같은 입력을 받음).
- 회귀 위험 (첫 진입, deep link, stale, legacy) → Task 4 Step 6/7/8에서 모두 smoke 검증.
- 테스트 (단위 router mock) → 의도적 spec deviation, 헤더에 명시.

**2. Placeholder scan:** 통과 — 모든 step에 구체 코드/명령/기대 결과 포함.

**3. Type consistency:** `totalNotes`, `diagnosedCountBefore`는 producer→consumer 모두 동일 이름. param 값은 양쪽에서 `String(...)` ↔ `Number(getSingleParam(...))` 일관.

**4. 다른 테스트 충돌 가능성:** `use-exam-result-screen.test.ts`는 builder 함수만 테스트하므로 무관. `build-diagnosis-queue.test.ts`도 무관. `use-exam-diagnosis-retry.test.ts`는 hook 인자에 이미 `totalNotes: 5, currentNoteCountBeforeThis: 0`을 사용하고 있으므로 무관.
