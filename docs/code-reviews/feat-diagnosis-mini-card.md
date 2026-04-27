# 코드 리뷰: feat/diagnosis-mini-card

- **리뷰 범위:** `1c467ee` → `5691f97`
- **변경 규모:** 30개 파일, +4202 / -55 라인
- **리뷰 일자:** 2026-04-27

## 개요

진단 미니 카드(DiagnosisMiniCard), 마일스톤 배너(DiagnosisMilestoneBanner), 노트 컬렉션 바(NoteCollectionBar), 수집된 노트 목록(CollectedNotesList), 분석 재개 카드(ExamAnalysisResumeCard) 신규 컴포넌트 및 관련 도메인 로직 추가. 홈 화면 분기(일반 모드 / 분석 진행 중 모드) 구현 포함.

전체적으로 설계 문서와의 정합성이 높고, 순수 로직 파일의 테스트 커버리지와 방어적 에러 처리가 잘 되어 있습니다.

---

## Critical — 반드시 수정

### 1. `latest-exam-attempt-store` 계정 범위 없는 스토리지 키

**파일:** `features/quiz/exam/latest-exam-attempt-store.ts:5`

스토리지 키가 `'dasida/latest-exam-attempt'` 고정값으로, 계정 A의 시험 정보가 계정 B 홈 화면에 노출되는 실제 데이터 버그입니다.

**수정 방법:**

```ts
// before
const KEY = 'dasida/latest-exam-attempt';

// after
const makeKey = (accountKey: string) => `dasida/latest-exam-attempt/${accountKey}`;
```

- `saveLatestExamAttempt` / `getLatestExamAttempt` 함수 시그니처에 `accountKey: string` 추가
- `features/quiz/hooks/use-quiz-hub-screen.ts` 의 `useFocusEffect` 의존 배열에 `session?.accountKey` 추가

---

## Important — 강력히 권고

### 2. `getLatestExamAttempt` shape 검증 없음

**파일:** `features/quiz/exam/latest-exam-attempt-store.ts:16`

`JSON.parse(raw) as LatestExamAttemptSummary` 캐스트는 런타임 보호가 없습니다. 구버전 페이로드에서 `wrongProblemNumbers` 필드가 없으면 `"undefined"` 문자열이 라우터 파라미터로 전달됩니다.

**수정 방법:**

```ts
const parsed = JSON.parse(raw);
if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.wrongProblemNumbers)) {
  return null;
}
return parsed as LatestExamAttemptSummary;
```

### 3. `useExamDiagnosis` 오케스트레이션 useEffect 테스트 없음

**파일:** `features/quiz/exam/hooks/use-exam-diagnosis.ts:316–426`

마일스톤-미니카드 분기, `markMilestoneShown` 순서, `isMountedRef` 마운트 해제 가드 등 핵심 오케스트레이션 로직이지만 테스트가 없습니다. 순수 도메인 파일은 잘 커버됐으나 이 훅에 대한 회귀가 감지되지 않습니다.

`renderHook` 기반 단위 테스트 또는 통합 테스트 추가 권장.

### 4. `detectMilestoneReached` — `===` 비교로 마일스톤 스킵 위험

**파일:** `features/quiz/exam/diagnosis-milestone.ts:25–26`

```ts
// 현재 코드
if (thresholds.at33 !== null && input.currentNoteCount === thresholds.at33) return 33;
if (thresholds.at67 !== null && input.currentNoteCount === thresholds.at67) return 67;
```

비순차 dot-jump 시나리오에서 `currentNoteCount`가 임계값을 이미 초과한 채 진입하면 해당 마일스톤이 영구적으로 스킵됩니다. `>=` 비교 + "이미 발사한 최고 마일스톤" 추적 방식으로 변경 권장.

### 5. `markMilestoneShown`이 배너 append보다 먼저 실행

**파일:** `features/quiz/exam/hooks/use-exam-diagnosis.ts:377`

```ts
await markMilestoneShown(...); // line 377 — mark 먼저
// ...
freezeAndAppend([{ kind: 'milestone-banner', ... }]); // line 384 — append 나중
```

`markMilestoneShown` 성공 후 앱이 비정상 종료되거나 `isMountedRef.current`가 false이면, 배너는 사용자에게 표시되지 않았지만 "이미 봤다"로 기록됩니다. **배너 append 성공 후 mark하는 순서로 변경** 권장.

---

## Minor — 선택적 개선

### 6. `textTransform: 'uppercase'` 한국어 무효

**파일:** `features/quiz/exam/components/collected-notes-list.tsx:45`

`"📚 모은 노트"` 는 한국어 텍스트로 CSS uppercase 변환이 적용되지 않습니다. 제거해도 무방.

### 7. 신규 컴포넌트 raw hex 색상

`diagnosis-mini-card.tsx`, `diagnosis-milestone-banner.tsx`, `note-collection-bar.tsx`, `exam-analysis-resume-card.tsx` 전반에 `#C8EAC8`, `#6BAA7244`, `#FFF8EF`, `#EDF7ED`, `#2A5C38` 등 raw hex가 사용됩니다. `BrandColors` 토큰으로 추출하면 테마 변경 및 향후 다크모드 대응이 용이해집니다.

### 8. `NoteCollectionBar` `total` 상한 방어 없음

**파일:** `features/quiz/exam/components/note-collection-bar.tsx:18`

`Array.from({ length: total }, ...)` 에 상한이 없어 비정상적으로 큰 값이 전달되면 화면이 깨질 수 있습니다. `Math.min(total, 45)` 등의 guard 추가 권장.

### 9. `onResumeAnalysis` `startIndex: '0'` 고정

**파일:** `features/quiz/hooks/use-quiz-hub-screen.ts:196`

분석 세션 재개 시 항상 첫 번째 문제부터 시작합니다. 이미 완료된 문제가 있는 경우 `diagnosedNotes.length`를 `startIndex`로 전달하는 것이 더 나은 UX입니다.

---

## 계획 부합 확인

| 항목 | 상태 |
|------|------|
| 마일스톤 임계값 0.33/0.67 | 구현 + 테스트 완비 |
| 미니카드 텍스트 fallback 3단계 | 구현 + 엣지케이스 테스트 완비 |
| 홈 화면 분석 진행 중 분기 | 구현됨 |
| NoteCollectionBar full/compact 두 변형 | 구현됨 |
| AsyncStorage 마일스톤 노출 중복 방지 | 구현됨 (단, mark 순서 이슈 존재 — #5) |
| ExamAnalysisResumeCard 홈 통합 | 구현됨 |
| CollectedNotesList 홈 통합 | 구현됨 |
| latestExamAttempt 스토어 | 구현됨 (단, 계정 범위 없음 — #1) |

---

## 수정 우선순위 요약

| 번호 | 파일 | 심각도 | 요약 |
|------|------|--------|------|
| 1 | `latest-exam-attempt-store.ts` | Critical | 계정 범위 없는 스토리지 키 |
| 2 | `latest-exam-attempt-store.ts:16` | Important | shape 검증 없음 |
| 3 | `hooks/use-exam-diagnosis.ts:316–426` | Important | 오케스트레이션 테스트 없음 |
| 4 | `diagnosis-milestone.ts:25–26` | Important | `===` 비교 마일스톤 스킵 |
| 5 | `hooks/use-exam-diagnosis.ts:377` | Important | mark/append 순서 역전 |
| 6 | `collected-notes-list.tsx:45` | Minor | uppercase 한국어 무효 |
| 7 | 신규 컴포넌트 전반 | Minor | raw hex 색상 |
| 8 | `note-collection-bar.tsx:18` | Minor | total 상한 방어 없음 |
| 9 | `use-quiz-hub-screen.ts:196` | Minor | startIndex 고정 |
