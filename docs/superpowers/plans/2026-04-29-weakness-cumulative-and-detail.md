# 약점 누적 집계 뷰 + 상세 화면 (Phase 2) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 "내 약점" 카드를 심각도 기반 누적 집계 뷰로 교체하고, 카드 탭 시 진입하는 약점 상세 화면을 신규 추가해 일정과 무관한 약점 연습 경로를 만든다.

**Architecture:** 데이터 계층은 순수 함수 두 개 (`computeRecentAppearanceCount`, `computeSeverity`) 를 추가하고 기존 `buildWeaknessProgressItems` 가 신규 필드를 채우도록 확장한다. UI 계층은 기존 `WeaknessProgressItem` 컴포넌트를 새 시각으로 갈아끼우고, 약점 상세 화면은 Thin Screen 패턴 (route → screen → view + hook + 서브 컴포넌트) 으로 신규 작성한다. 백엔드 변경 없음.

**Tech Stack:** TypeScript, React Native (Expo), Expo Router, Jest. 기존 `WeaknessAccuracyChart` 재사용 (룰: 새 차트 라이브러리 / 디자인 금지).

**Spec:** [`docs/superpowers/specs/2026-04-29-weakness-cumulative-and-detail-design.md`](../specs/2026-04-29-weakness-cumulative-and-detail-design.md) (commit `5d4b6a8`)

---

## File Structure

### 신규 파일
| 경로 | 책임 |
|---|---|
| `features/learning/weakness-severity.ts` | 순수 함수: `computeRecentAppearanceCount`, `computeSeverity`, `WeaknessSeverity` 타입 |
| `features/learning/weakness-severity.test.ts` | 위 두 함수 단위 테스트 |
| `features/learning/weakness-appearances.ts` | 순수 함수: `buildWeaknessAppearances` (attempt → 등장 기록 라벨 변환) |
| `features/learning/weakness-appearances.test.ts` | 위 함수 단위 테스트 |
| `app/quiz/weakness/[weaknessId].tsx` | Expo Router 라우트 (파라미터 해석만) |
| `features/quiz/screens/weakness-detail-screen.tsx` | 화면 컨테이너 (hook → view 연결) |
| `features/quiz/hooks/use-weakness-detail-screen.ts` | 상세 화면 상태/이벤트 훅 |
| `features/quiz/components/weakness-detail-screen-view.tsx` | 화면 뷰 |
| `features/quiz/components/weakness-detail-header.tsx` | 토픽 칩 + 약점명 + 심각도 영역 |
| `features/quiz/components/weakness-detail-review-progress.tsx` | 4단계 점 + stage 라벨 |
| `features/quiz/components/weakness-detail-appearances.tsx` | 등장 기록 리스트 |

### 변경 파일
| 경로 | 변경 |
|---|---|
| `features/learning/types.ts` | `WeaknessProgressItem`에 `severity`, `recentAppearanceCount`, `appearances` 추가 |
| `features/learning/home-state.ts` | `buildWeaknessProgressItems`가 신규 필드 채움, 호출 시 `LearningAttempt[]` 추가 받음 |
| `features/learner/provider.tsx` | `buildHomeLearningState` 호출에 `recentExamAndDiagnosticAttempts` 전달 |
| `features/quiz/components/weakness-progress-item.tsx` | 4단계 점 → 심각도 점+라벨, `Pressable`로 감싸기, ▶ 화살표 |
| `features/quiz/components/home-weakness-section.tsx` | 노출 게이트 변경, 카드 탭 핸들러 prop 추가 |
| `app/quiz/_layout.tsx` | `weakness/[weaknessId]` Stack.Screen 등록 |

---

## Task 1: 타입 정의 확장 (types.ts)

**Files:**
- Modify: `features/learning/types.ts:112`

- [ ] **Step 1: `WeaknessProgressItem` 타입에 신규 필드 추가**

`features/learning/types.ts` 내 기존 `WeaknessProgressItem` 타입을 다음으로 교체:

```ts
export type WeaknessSeverity = 'frequent' | 'often' | 'occasional';

export type WeaknessAppearance = {
  attemptId: string;
  source: LearningSource;
  sourceLabel: string;
  attemptedAt: string;
};

export type WeaknessProgressItem = {
  weaknessId: WeaknessId;
  topicLabel: string;
  weaknessLabel: string;
  stage: ReviewStage;
  completed: boolean;
  diagnosticAccuracy?: number;
  reviewAccuracyByStage: Partial<Record<ReviewStage, number>>;
  recentAppearanceCount: number;
  severity: WeaknessSeverity;
  appearances: WeaknessAppearance[];
};
```

- [ ] **Step 2: 타입체크 통과 확인 (소비처가 깨질 것을 예상)**

Run: `npx tsc --noEmit 2>&1 | head -40`
Expected: `home-state.ts`의 `buildWeaknessProgressItems` 가 신규 필드 없이 객체를 만들고 있어 에러. Task 3에서 수정.

- [ ] **Step 3: 커밋**

```bash
git add features/learning/types.ts
git commit -m "feat(learning): extend WeaknessProgressItem with severity/appearances fields"
```

---

## Task 2: 심각도 계산 순수 함수 (TDD)

**Files:**
- Create: `features/learning/weakness-severity.ts`
- Test: `features/learning/weakness-severity.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `features/learning/weakness-severity.test.ts`:

```ts
import type { LearningAttempt } from './types';
import { computeRecentAppearanceCount, computeSeverity } from './weakness-severity';

function makeAttempt(overrides: Partial<LearningAttempt>): LearningAttempt {
  return {
    id: 'a',
    accountKey: 'k',
    learnerId: 'l',
    source: 'featured-exam',
    sourceEntityId: null,
    gradeSnapshot: 'g3',
    startedAt: '2026-04-01T00:00:00.000Z',
    completedAt: '2026-04-01T00:30:00.000Z',
    questionCount: 30,
    correctCount: 25,
    wrongCount: 5,
    accuracy: 83,
    primaryWeaknessId: null,
    topWeaknesses: [],
    schemaVersion: 1,
    createdAt: '2026-04-01T00:30:00.000Z',
    ...overrides,
  };
}

describe('computeRecentAppearanceCount', () => {
  it('최근 5번의 학습 중 약점이 등장한 횟수를 센다', () => {
    const attempts = [
      makeAttempt({ id: 'a1', completedAt: '2026-04-05T00:00:00Z', topWeaknesses: ['fn-limit'] }),
      makeAttempt({ id: 'a2', completedAt: '2026-04-04T00:00:00Z', topWeaknesses: ['fn-limit', 'integral'] }),
      makeAttempt({ id: 'a3', completedAt: '2026-04-03T00:00:00Z', topWeaknesses: [] }),
      makeAttempt({ id: 'a4', completedAt: '2026-04-02T00:00:00Z', topWeaknesses: ['fn-limit'] }),
      makeAttempt({ id: 'a5', completedAt: '2026-04-01T00:00:00Z', topWeaknesses: ['integral'] }),
    ];
    expect(computeRecentAppearanceCount('fn-limit', attempts)).toBe(3);
    expect(computeRecentAppearanceCount('integral', attempts)).toBe(2);
  });

  it('5번을 초과하는 attempt는 최신 5번만 본다', () => {
    const attempts = Array.from({ length: 8 }, (_, i) =>
      makeAttempt({
        id: `a${i}`,
        completedAt: `2026-04-${String(20 - i).padStart(2, '0')}T00:00:00Z`,
        topWeaknesses: i < 3 ? ['fn-limit'] : [],
      }),
    );
    expect(computeRecentAppearanceCount('fn-limit', attempts)).toBe(3);
  });

  it('diagnostic / featured-exam 외 source는 무시한다', () => {
    const attempts = [
      makeAttempt({ id: 'a1', source: 'weakness-practice', completedAt: '2026-04-05T00:00:00Z', topWeaknesses: ['fn-limit'] }),
      makeAttempt({ id: 'a2', source: 'featured-exam', completedAt: '2026-04-04T00:00:00Z', topWeaknesses: ['fn-limit'] }),
    ];
    expect(computeRecentAppearanceCount('fn-limit', attempts)).toBe(1);
  });
});

describe('computeSeverity', () => {
  it('4번 이상 등장이면 frequent', () => {
    expect(computeSeverity(5)).toBe('frequent');
    expect(computeSeverity(4)).toBe('frequent');
  });
  it('2~3번 등장이면 often', () => {
    expect(computeSeverity(3)).toBe('often');
    expect(computeSeverity(2)).toBe('often');
  });
  it('1번 등장이면 occasional', () => {
    expect(computeSeverity(1)).toBe('occasional');
  });
  it('0번 등장이어도 occasional (방어)', () => {
    expect(computeSeverity(0)).toBe('occasional');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest features/learning/weakness-severity.test.ts`
Expected: FAIL — 모듈 없음 / export 없음.

- [ ] **Step 3: 최소 구현**

Create `features/learning/weakness-severity.ts`:

```ts
import type { WeaknessId } from '@/data/diagnosisMap';

import type { LearningAttempt, WeaknessSeverity } from './types';

const RECENT_WINDOW = 5;

export function computeRecentAppearanceCount(
  weaknessId: WeaknessId,
  attempts: LearningAttempt[],
): number {
  const recent = attempts
    .filter((a) => a.source === 'diagnostic' || a.source === 'featured-exam')
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, RECENT_WINDOW);
  return recent.filter((a) => a.topWeaknesses.includes(weaknessId)).length;
}

export function computeSeverity(count: number): WeaknessSeverity {
  if (count >= 4) return 'frequent';
  if (count >= 2) return 'often';
  return 'occasional';
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest features/learning/weakness-severity.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: 커밋**

```bash
git add features/learning/weakness-severity.ts features/learning/weakness-severity.test.ts
git commit -m "feat(learning): add weakness severity computation (recent 5-attempt window)"
```

---

## Task 3: 등장 기록 라벨 변환 (TDD)

**Files:**
- Create: `features/learning/weakness-appearances.ts`
- Test: `features/learning/weakness-appearances.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `features/learning/weakness-appearances.test.ts`:

```ts
import type { LearningAttempt } from './types';
import { buildWeaknessAppearances } from './weakness-appearances';

function makeAttempt(overrides: Partial<LearningAttempt>): LearningAttempt {
  return {
    id: 'a',
    accountKey: 'k',
    learnerId: 'l',
    source: 'featured-exam',
    sourceEntityId: null,
    gradeSnapshot: 'g3',
    startedAt: '2026-04-01T00:00:00.000Z',
    completedAt: '2026-04-01T00:30:00.000Z',
    questionCount: 30,
    correctCount: 25,
    wrongCount: 5,
    accuracy: 83,
    primaryWeaknessId: null,
    topWeaknesses: [],
    schemaVersion: 1,
    createdAt: '2026-04-01T00:30:00.000Z',
    ...overrides,
  };
}

describe('buildWeaknessAppearances', () => {
  it('해당 약점이 포함된 attempt만 반환', () => {
    const attempts = [
      makeAttempt({ id: 'a1', topWeaknesses: ['fn-limit'] }),
      makeAttempt({ id: 'a2', topWeaknesses: ['integral'] }),
      makeAttempt({ id: 'a3', topWeaknesses: ['fn-limit', 'integral'] }),
    ];
    const result = buildWeaknessAppearances('fn-limit', attempts);
    expect(result.map((a) => a.attemptId)).toEqual(['a1', 'a3']);
  });

  it('최신순(completedAt desc)으로 정렬', () => {
    const attempts = [
      makeAttempt({ id: 'a1', completedAt: '2026-02-10T00:00:00Z', topWeaknesses: ['fn-limit'] }),
      makeAttempt({ id: 'a2', completedAt: '2026-04-15T00:00:00Z', topWeaknesses: ['fn-limit'] }),
      makeAttempt({ id: 'a3', completedAt: '2026-03-20T00:00:00Z', topWeaknesses: ['fn-limit'] }),
    ];
    const result = buildWeaknessAppearances('fn-limit', attempts);
    expect(result.map((a) => a.attemptId)).toEqual(['a2', 'a3', 'a1']);
  });

  it('featured-exam source는 EXAM_CATALOG에서 제목 lookup', () => {
    const attempts = [
      makeAttempt({
        id: 'a1',
        source: 'featured-exam',
        sourceEntityId: 'g3-stats-mock-2025-09',
        topWeaknesses: ['fn-limit'],
      }),
    ];
    const result = buildWeaknessAppearances('fn-limit', attempts);
    expect(result[0].sourceLabel).toBe('2025년 9월 고3 확률과통계 모의고사');
  });

  it('featured-exam인데 카탈로그 lookup 실패 시 fallback', () => {
    const attempts = [
      makeAttempt({
        id: 'a1',
        source: 'featured-exam',
        sourceEntityId: 'unknown-exam-id',
        completedAt: '2026-04-15T00:00:00Z',
        topWeaknesses: ['fn-limit'],
      }),
    ];
    const result = buildWeaknessAppearances('fn-limit', attempts);
    expect(result[0].sourceLabel).toBe('2026년 4월 모의고사');
  });

  it('diagnostic source는 "YYYY년 M월 진단" 형식', () => {
    const attempts = [
      makeAttempt({
        id: 'a1',
        source: 'diagnostic',
        sourceEntityId: null,
        completedAt: '2026-04-15T05:30:00Z',
        topWeaknesses: ['fn-limit'],
      }),
    ];
    const result = buildWeaknessAppearances('fn-limit', attempts);
    expect(result[0].sourceLabel).toBe('2026년 4월 진단');
  });

  it('weakness-practice 등 그 외 source는 제외', () => {
    const attempts = [
      makeAttempt({ id: 'a1', source: 'weakness-practice', topWeaknesses: ['fn-limit'] }),
    ];
    const result = buildWeaknessAppearances('fn-limit', attempts);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest features/learning/weakness-appearances.test.ts`
Expected: FAIL.

- [ ] **Step 3: 최소 구현**

Create `features/learning/weakness-appearances.ts`:

```ts
import type { WeaknessId } from '@/data/diagnosisMap';
import { EXAM_CATALOG_BY_ID } from '@/features/quiz/data/exam-catalog';

import type { LearningAttempt, WeaknessAppearance } from './types';

function formatYearMonthKst(iso: string): { year: number; month: number } {
  const utcMs = new Date(iso).getTime();
  const kstMs = utcMs + 9 * 60 * 60 * 1000;
  const d = new Date(kstMs);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function buildSourceLabel(attempt: LearningAttempt): string {
  if (attempt.source === 'featured-exam' && attempt.sourceEntityId != null) {
    const exam = EXAM_CATALOG_BY_ID[attempt.sourceEntityId];
    if (exam != null) return exam.title;
  }
  const { year, month } = formatYearMonthKst(attempt.completedAt);
  if (attempt.source === 'diagnostic') {
    return `${year}년 ${month}월 진단`;
  }
  return `${year}년 ${month}월 모의고사`;
}

export function buildWeaknessAppearances(
  weaknessId: WeaknessId,
  attempts: LearningAttempt[],
): WeaknessAppearance[] {
  return attempts
    .filter((a) => a.source === 'diagnostic' || a.source === 'featured-exam')
    .filter((a) => a.topWeaknesses.includes(weaknessId))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .map((a) => ({
      attemptId: a.id,
      source: a.source,
      sourceLabel: buildSourceLabel(a),
      attemptedAt: a.completedAt,
    }));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest features/learning/weakness-appearances.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: 커밋**

```bash
git add features/learning/weakness-appearances.ts features/learning/weakness-appearances.test.ts
git commit -m "feat(learning): add weakness appearance log builder (KST month label, exam catalog lookup)"
```

---

## Task 4: `buildWeaknessProgressItems`에 신규 필드 채우기

**Files:**
- Modify: `features/learning/home-state.ts:191-215, 285`

- [ ] **Step 1: 함수 시그니처에 `recentExamAndDiagnosticAttempts` 추가**

`features/learning/home-state.ts:191` 의 `buildWeaknessProgressItems` 시그니처를 다음으로 변경:

```ts
function buildWeaknessProgressItems(
  summary: LearnerSummaryCurrent,
  allReviewTasks: ReviewTask[],
  recentReviewAttempts: LearningAttempt[],
  recentExamAndDiagnosticAttempts: LearningAttempt[],
): WeaknessProgressItem[] {
```

- [ ] **Step 2: import 추가**

`home-state.ts` 상단 import 영역에 다음 추가:

```ts
import { computeRecentAppearanceCount, computeSeverity } from './weakness-severity';
import { buildWeaknessAppearances } from './weakness-appearances';
```

- [ ] **Step 3: 반환 객체에 신규 필드 채우기 + 새 정렬 적용**

`buildWeaknessProgressItems` 마지막 `return deduped.slice(0, 3).map((t) => { ... });` 부분 전체를 다음으로 교체. **slice(0, 3)을 map 이후로 미루고**, 신규 필드 기준 정렬을 추가한다 (스펙 정의: 1순위 심각도, 2순위 등장 횟수, 3순위 최근 등장 시점):

```ts
  const SEVERITY_RANK: Record<WeaknessSeverity, number> = {
    frequent: 3,
    often: 2,
    occasional: 1,
  };

  const items: WeaknessProgressItem[] = deduped.map((t) => {
    const diagnosticAccuracy =
      summary.latestDiagnosticSummary?.weaknessAccuracies?.[t.weaknessId];

    const reviewAccuracyByStage: Partial<Record<ReviewStage, number>> = {};
    for (const stage of STAGE_ORDER) {
      const match = recentReviewAttempts
        .filter(
          (a) =>
            a.source === 'weakness-practice' &&
            a.primaryWeaknessId === t.weaknessId &&
            a.reviewStage === stage,
        )
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
      if (match != null) {
        reviewAccuracyByStage[stage] = match.accuracy;
      }
    }

    const recentAppearanceCount = computeRecentAppearanceCount(
      t.weaknessId,
      recentExamAndDiagnosticAttempts,
    );
    const severity = computeSeverity(recentAppearanceCount);
    const appearances = buildWeaknessAppearances(
      t.weaknessId,
      recentExamAndDiagnosticAttempts,
    );

    return {
      weaknessId: t.weaknessId,
      topicLabel: diagnosisMap[t.weaknessId]?.topicLabel ?? '',
      weaknessLabel: diagnosisMap[t.weaknessId]?.labelKo ?? t.weaknessId,
      stage: t.stage,
      completed: t.completed,
      diagnosticAccuracy,
      reviewAccuracyByStage,
      recentAppearanceCount,
      severity,
      appearances,
    };
  });

  return items
    .sort((a, b) => {
      // completed는 항상 뒤로 (해결된 약점은 후순위)
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      // 1순위: 심각도 내림차순
      const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (sev !== 0) return sev;
      // 2순위: 등장 횟수 내림차순
      const cnt = b.recentAppearanceCount - a.recentAppearanceCount;
      if (cnt !== 0) return cnt;
      // 3순위: 최근 등장 시점 내림차순 (없으면 빈 문자열로 fallback)
      const aLatest = a.appearances[0]?.attemptedAt ?? '';
      const bLatest = b.appearances[0]?.attemptedAt ?? '';
      return bLatest.localeCompare(aLatest);
    })
    .slice(0, 3);
```

> **WeaknessSeverity import 확인:** 위 코드는 `WeaknessSeverity` 타입을 사용하므로, `home-state.ts` 의 import에 다음이 포함되어야 한다:
> ```ts
> import type { WeaknessSeverity } from './types';
> ```

- [ ] **Step 4: `buildHomeLearningState` 시그니처 + 호출부 변경**

`features/learning/home-state.ts:255` 부근의 `buildHomeLearningState` 시그니처에 `recentExamAndDiagnosticAttempts` 파라미터 추가, 마지막 줄 `weaknessProgressItems: buildWeaknessProgressItems(...)` 호출에 신규 인자 전달:

```ts
export function buildHomeLearningState(
  profile: LearnerProfile,
  summary: LearnerSummaryCurrent,
  peerPresenceSnapshot: PeerPresenceSnapshot | null = null,
  allReviewTasks: ReviewTask[] = [],
  recentReviewAttempts: LearningAttempt[] = [],
  recentExamAndDiagnosticAttempts: LearningAttempt[] = [],
): HomeLearningState {
  // ... (other code unchanged) ...
  return {
    // ... (other fields unchanged) ...
    weaknessProgressItems: buildWeaknessProgressItems(
      summary,
      allReviewTasks,
      recentReviewAttempts,
      recentExamAndDiagnosticAttempts,
    ),
  };
}
```

- [ ] **Step 5: 타입체크 통과 확인**

Run: `npx tsc --noEmit 2>&1 | grep -E "weakness-progress|home-state|provider"`
Expected: provider.tsx 가 신규 인자를 안 넘기고 있어 에러 — Task 5에서 수정.

- [ ] **Step 6: 커밋**

```bash
git add features/learning/home-state.ts
git commit -m "feat(learning): populate severity/appearances in buildWeaknessProgressItems"
```

---

## Task 5: Provider에서 attempts 로드해서 home-state로 전달

**Files:**
- Modify: `features/learner/provider.tsx` (buildHomeLearningState 호출부)

- [ ] **Step 1: provider에서 buildHomeLearningState 호출 위치 찾기**

Run: `grep -n "buildHomeLearningState" features/learner/provider.tsx`
Expected: 1~2개 위치 (snapshot 빌드 시점). 다음 단계의 변경 위치 식별.

- [ ] **Step 2: 호출부 위에서 진단/모의고사 attempt 로드**

해당 위치에서 `loadRecentAttempts` 와 동일한 store API 로 진단 + 모의고사 attempts 를 로드한다. `loadRecentAttempts` 가 source 필터를 받으므로, 두 source 를 모두 가져와야 한다. 다음과 같이 별도 헬퍼로 추가하거나 inline 으로 두 번 호출 후 머지:

```ts
const [diagnosticAttempts, examAttempts] = await Promise.all([
  learningHistoryStore.loadRecentAttempts(accountKey, { source: 'diagnostic', limit: 10 }),
  learningHistoryStore.loadRecentAttempts(accountKey, { source: 'featured-exam', limit: 10 }),
]);
const recentExamAndDiagnosticAttempts = [...diagnosticAttempts, ...examAttempts];
```

> **Note:** `learningHistoryStore` 의 정확한 API 명은 provider.tsx 안에서 이미 사용 중인 store 인스턴스를 따른다. (provider.tsx 상단의 `localLearningHistoryStore` import / 인자 위치 확인.) `limit: 10` 은 최근 5번 + 여유분.

- [ ] **Step 3: `buildHomeLearningState` 호출에 신규 인자 전달**

```ts
const homeState = buildHomeLearningState(
  profile,
  summary,
  peerPresenceSnapshot,
  allReviewTasks,
  recentReviewAttempts,
  recentExamAndDiagnosticAttempts,
);
```

- [ ] **Step 4: 타입체크 통과**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add features/learner/provider.tsx
git commit -m "feat(learner): load diagnostic+exam attempts for weakness severity computation"
```

---

## Task 6: `WeaknessProgressItem` UI 재설계 (4단계 점 → 심각도 점)

**Files:**
- Modify: `features/quiz/components/weakness-progress-item.tsx` (전면 교체)

- [ ] **Step 1: 컴포넌트 전면 교체**

`features/quiz/components/weakness-progress-item.tsx` 의 전체 내용을 다음으로 교체:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/colors';
import { FontFamilies } from '@/constants/typography';
import type {
  WeaknessProgressItem as WeaknessProgressItemType,
  WeaknessSeverity,
} from '@/features/learning/types';

const SEVERITY_LABEL: Record<WeaknessSeverity, string> = {
  frequent: '단골 약점',
  often: '자주 등장',
  occasional: '가끔 등장',
};

const SEVERITY_DOTS: Record<WeaknessSeverity, number> = {
  frequent: 3,
  often: 2,
  occasional: 1,
};

function severityColor(severity: WeaknessSeverity, completed: boolean): string {
  if (completed) return '#4A7C59';
  switch (severity) {
    case 'frequent':
      return BrandColors.danger ?? '#D9534F';
    case 'often':
      return '#E8A547';
    case 'occasional':
      return '#4A7C59';
  }
}

export function WeaknessProgressItem({
  item,
  onPress,
}: {
  item: WeaknessProgressItemType;
  onPress?: (weaknessId: string) => void;
}) {
  const dotsFilled = SEVERITY_DOTS[item.severity];
  const color = severityColor(item.severity, item.completed);
  const severityLabel = item.completed ? '해결됐어요 ✓' : SEVERITY_LABEL[item.severity];
  const badgeText = item.completed ? '해결됐어요 ✓' : '점점 나아지는 중';

  const handlePress = () => onPress?.(item.weaknessId);

  return (
    <Pressable
      onPress={handlePress}
      android_ripple={{ color: 'rgba(41, 59, 39, 0.06)' }}
      style={({ pressed }) => [
        styles.container,
        item.completed && styles.containerDone,
        pressed && styles.containerPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.weaknessLabel}, ${severityLabel}`}
    >
      <View style={styles.left}>
        <View style={styles.topicChip}>
          <Text style={styles.topicChipText}>{item.topicLabel}</Text>
        </View>
        <Text style={styles.weaknessLabel} numberOfLines={1}>
          {item.weaknessLabel}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <View style={styles.severityRow}>
          <View style={styles.dots}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i <= dotsFilled && { backgroundColor: color },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.severityLabel, { color }]}>{severityLabel}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 252, 247, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.1)',
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  containerDone: {
    backgroundColor: 'rgba(74, 124, 89, 0.06)',
    borderColor: 'rgba(74, 124, 89, 0.18)',
  },
  containerPressed: {
    opacity: 0.7,
  },
  left: { flex: 1, gap: 3, minWidth: 0 },
  topicChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74, 124, 89, 0.13)',
    borderRadius: 99,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  topicChipText: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: '#2A5C38',
  },
  weaknessLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: '#1C2C19',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74, 124, 89, 0.1)',
    borderRadius: 99,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  badgeText: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: '#2A4A28',
  },
  right: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  severityRow: {
    alignItems: 'flex-end',
    gap: 3,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(41, 59, 39, 0.12)',
  },
  severityLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
  },
  chevron: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    color: 'rgba(41, 59, 39, 0.35)',
    marginLeft: 2,
  },
});
```

> **Note:** `BrandColors.danger` 가 없으면 fallback `#D9534F` 사용. import 경로 (`@/constants/colors`) 가 실제 다르면 같은 파일 안에서 색상 직접 정의로 대체.

- [ ] **Step 2: BrandColors.danger 존재 확인**

Run: `grep -n "danger" constants/colors.ts 2>/dev/null || grep -rn "BrandColors" constants/ | head -5`
Expected: 정의되어 있으면 그대로, 없으면 위 코드의 `BrandColors.danger ?? '#D9534F'` 그대로 작동.

- [ ] **Step 3: 타입체크 통과**

Run: `npx tsc --noEmit 2>&1 | grep weakness-progress-item`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/components/weakness-progress-item.tsx
git commit -m "feat(quiz): redesign WeaknessProgressItem to severity dots+label, tappable"
```

---

## Task 7: `HomeWeaknessSection` 게이트 완화 + 탭 핸들러 연결

**Files:**
- Modify: `features/quiz/components/home-weakness-section.tsx`

- [ ] **Step 1: import에 `router` 추가**

`features/quiz/components/home-weakness-section.tsx` 상단 import 영역에 추가:

```tsx
import { router } from 'expo-router';
```

- [ ] **Step 2: 노출 게이트 변경 + 탭 핸들러 연결**

기존 `HomeWeaknessSection` 함수 본문에서 `if (!homeState.latestDiagnosticSummary) return null;` 줄을 제거하고, 다음으로 함수 전체를 교체:

```tsx
export function HomeWeaknessSection({
  homeState,
}: {
  homeState: HomeLearningState;
}) {
  const { weaknessProgressItems, peerPresence } = homeState;

  if (weaknessProgressItems.length === 0) {
    return null;
  }

  const handleWeaknessPress = (weaknessId: string) => {
    router.push({
      pathname: '/quiz/weakness/[weaknessId]',
      params: { weaknessId },
    });
  };

  return (
    <View style={styles.section}>
      <View style={styles.divider} />
      <View style={styles.content}>
        <PeerChip peers={peerPresence} />
        <WeaknessAccuracyChart items={weaknessProgressItems} />

        <View style={styles.weaknessList}>
          <Text style={styles.sectionLabel}>내 약점</Text>
          {weaknessProgressItems.map((item) => (
            <WeaknessProgressItem
              key={item.weaknessId}
              item={item}
              onPress={handleWeaknessPress}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 3: 타입체크 통과**

Run: `npx tsc --noEmit 2>&1 | grep home-weakness-section`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/components/home-weakness-section.tsx
git commit -m "feat(quiz): relax weakness section gate + wire tap navigation to detail screen"
```

---

## Task 8: 약점 상세 화면 라우트 등록 + 진입점 파일

**Files:**
- Create: `app/quiz/weakness/[weaknessId].tsx`
- Modify: `app/quiz/_layout.tsx`

- [ ] **Step 1: Stack에 화면 등록**

`app/quiz/_layout.tsx` 의 `<Stack>` 내부 마지막에 다음 줄 추가:

```tsx
<Stack.Screen name="weakness/[weaknessId]" options={{ title: '약점 상세' }} />
```

- [ ] **Step 2: 라우트 파일 생성**

Create `app/quiz/weakness/[weaknessId].tsx`:

```tsx
import { useLocalSearchParams } from 'expo-router';

import WeaknessDetailScreen from '@/features/quiz/screens/weakness-detail-screen';
import { getSingleParam } from '@/utils/get-single-param';

export default function WeaknessDetailRoute() {
  const params = useLocalSearchParams();
  const weaknessId = getSingleParam(params.weaknessId);

  return <WeaknessDetailScreen weaknessId={weaknessId} />;
}
```

- [ ] **Step 3: 타입체크 — 미정의 import 확인**

Run: `npx tsc --noEmit 2>&1 | grep weakness-detail`
Expected: `WeaknessDetailScreen` 파일이 없어 에러 — Task 9에서 생성.

- [ ] **Step 4: 커밋**

```bash
git add app/quiz/_layout.tsx app/quiz/weakness/
git commit -m "feat(quiz): register weakness detail route in stack"
```

---

## Task 9: 약점 상세 화면 컨테이너 + 훅

**Files:**
- Create: `features/quiz/screens/weakness-detail-screen.tsx`
- Create: `features/quiz/hooks/use-weakness-detail-screen.ts`

- [ ] **Step 1: 훅 작성**

Create `features/quiz/hooks/use-weakness-detail-screen.ts`:

```ts
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import type { WeaknessId } from '@/data/diagnosisMap';
import { useCurrentLearner } from '@/features/learner/provider';
import type {
  LearningAttempt,
  WeaknessAppearance,
  WeaknessProgressItem,
} from '@/features/learning/types';
import { buildWeaknessAppearances } from '@/features/learning/weakness-appearances';
import {
  computeRecentAppearanceCount,
  computeSeverity,
} from '@/features/learning/weakness-severity';

export type UseWeaknessDetailScreenParams = {
  weaknessId: string | undefined;
};

export type UseWeaknessDetailScreenResult = {
  loading: boolean;
  notFound: boolean;
  item: WeaknessProgressItem | null;
  appearances: WeaknessAppearance[];
  onPracticeNow: () => void;
  onBack: () => void;
};

export function useWeaknessDetailScreen(
  params: UseWeaknessDetailScreenParams,
): UseWeaknessDetailScreenResult {
  const { homeState, loadRecentAttempts } = useCurrentLearner();
  const [appearances, setAppearances] = useState<WeaknessAppearance[]>([]);
  const [loading, setLoading] = useState(true);

  const weaknessId = params.weaknessId as WeaknessId | undefined;
  const item =
    weaknessId == null
      ? null
      : homeState?.weaknessProgressItems.find((i) => i.weaknessId === weaknessId) ?? null;

  // 잘못된 weaknessId 진입 방어
  useEffect(() => {
    if (homeState != null && weaknessId != null && item == null) {
      router.replace('/(tabs)/quiz');
    }
  }, [homeState, weaknessId, item]);

  // 등장 기록은 진입 시점에 fresh load (homeState.appearances 도 있으나 충분/최신 보장 위해 직접 호출)
  useFocusEffect(
    useCallback(() => {
      if (weaknessId == null) return;
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const [diagnostic, exam] = await Promise.all([
            loadRecentAttempts({ source: 'diagnostic', limit: 50 }),
            loadRecentAttempts({ source: 'featured-exam', limit: 50 }),
          ]);
          if (cancelled) return;
          const all: LearningAttempt[] = [...diagnostic, ...exam];
          setAppearances(buildWeaknessAppearances(weaknessId, all));
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [weaknessId, loadRecentAttempts]),
  );

  const onPracticeNow = useCallback(() => {
    if (weaknessId == null) return;
    router.push({
      pathname: '/quiz/practice',
      params: { weaknessId },
    });
  }, [weaknessId]);

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/quiz');
  }, []);

  return {
    loading,
    notFound: homeState != null && weaknessId != null && item == null,
    item,
    appearances,
    onPracticeNow,
    onBack,
  };
}
```

- [ ] **Step 2: 화면 컨테이너 작성**

Create `features/quiz/screens/weakness-detail-screen.tsx`:

```tsx
import { WeaknessDetailScreenView } from '@/features/quiz/components/weakness-detail-screen-view';
import { useWeaknessDetailScreen } from '@/features/quiz/hooks/use-weakness-detail-screen';

export default function WeaknessDetailScreen({
  weaknessId,
}: {
  weaknessId: string | undefined;
}) {
  const screen = useWeaknessDetailScreen({ weaknessId });
  return <WeaknessDetailScreenView {...screen} />;
}
```

- [ ] **Step 3: 타입체크 — view 미정의 확인**

Run: `npx tsc --noEmit 2>&1 | grep weakness-detail`
Expected: `WeaknessDetailScreenView` 미정의 — 다음 Task에서 작성.

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/hooks/use-weakness-detail-screen.ts features/quiz/screens/weakness-detail-screen.tsx
git commit -m "feat(quiz): add weakness detail screen container + hook"
```

---

## Task 10: 약점 상세 화면 서브 컴포넌트 (header / review-progress / appearances)

**Files:**
- Create: `features/quiz/components/weakness-detail-header.tsx`
- Create: `features/quiz/components/weakness-detail-review-progress.tsx`
- Create: `features/quiz/components/weakness-detail-appearances.tsx`

- [ ] **Step 1: header 컴포넌트 생성**

Create `features/quiz/components/weakness-detail-header.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/colors';
import { FontFamilies } from '@/constants/typography';
import type { WeaknessProgressItem, WeaknessSeverity } from '@/features/learning/types';

const SEVERITY_LABEL: Record<WeaknessSeverity, string> = {
  frequent: '단골 약점',
  often: '자주 등장',
  occasional: '가끔 등장',
};

const SEVERITY_DOTS: Record<WeaknessSeverity, number> = {
  frequent: 3,
  often: 2,
  occasional: 1,
};

function severityColor(severity: WeaknessSeverity, completed: boolean): string {
  if (completed) return '#4A7C59';
  switch (severity) {
    case 'frequent':
      return BrandColors.danger ?? '#D9534F';
    case 'often':
      return '#E8A547';
    case 'occasional':
      return '#4A7C59';
  }
}

export function WeaknessDetailHeader({ item }: { item: WeaknessProgressItem }) {
  const color = severityColor(item.severity, item.completed);
  const dotsFilled = SEVERITY_DOTS[item.severity];

  return (
    <View style={styles.container}>
      <View style={styles.topicChip}>
        <Text style={styles.topicChipText}>{item.topicLabel}</Text>
      </View>
      <Text style={styles.headline}>{item.weaknessLabel}이 잘 안 잡혀</Text>

      {item.completed ? (
        <Text style={[styles.severity, { color }]}>✓ 해결됐어요!</Text>
      ) : (
        <View style={styles.severityRow}>
          <View style={styles.dots}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.dot, i <= dotsFilled && { backgroundColor: color }]}
              />
            ))}
          </View>
          <Text style={[styles.severityLabel, { color }]}>
            {SEVERITY_LABEL[item.severity]}
          </Text>
        </View>
      )}

      <Text style={styles.countSubtext}>
        최근 5번 중 {item.recentAppearanceCount}번 등장
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 8,
  },
  topicChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74, 124, 89, 0.13)',
    borderRadius: 99,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  topicChipText: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: '#2A5C38',
  },
  headline: {
    fontFamily: FontFamilies.bold,
    fontSize: 22,
    color: '#1C2C19',
    lineHeight: 30,
  },
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(41, 59, 39, 0.12)',
  },
  severityLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
  },
  severity: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    marginTop: 4,
  },
  countSubtext: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: 'rgba(72, 67, 58, 0.7)',
    marginTop: 2,
  },
});
```

- [ ] **Step 2: review-progress 컴포넌트 생성**

Create `features/quiz/components/weakness-detail-review-progress.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { ReviewStage } from '@/features/learning/history-types';

const STAGE_ORDER: ReviewStage[] = ['day1', 'day3', 'day7', 'day30'];

function stageDotsFilled(stage: ReviewStage, completed: boolean): number {
  if (completed) return 4;
  return STAGE_ORDER.indexOf(stage) + 1;
}

function nextStageLabel(stage: ReviewStage, completed: boolean): string {
  if (completed) return '완료';
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return '완료까지 한 단계';
  return `다음 복습: ${STAGE_ORDER[idx + 1]}`;
}

export function WeaknessDetailReviewProgress({
  stage,
  completed,
}: {
  stage: ReviewStage;
  completed: boolean;
}) {
  const filled = stageDotsFilled(stage, completed);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>복습 진도</Text>
      <View style={styles.row}>
        <View style={styles.dots}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i <= filled && styles.dotFilled]} />
          ))}
        </View>
        <Text style={styles.stageText}>
          {completed ? '완료' : `${stage} 복습 완료`}
        </Text>
      </View>
      <Text style={styles.nextText}>{nextStageLabel(stage, completed)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: '#1C2C19',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(41, 59, 39, 0.12)',
  },
  dotFilled: {
    backgroundColor: '#4A7C59',
  },
  stageText: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: '#1C2C19',
  },
  nextText: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    color: 'rgba(72, 67, 58, 0.7)',
    marginTop: 2,
  },
});
```

- [ ] **Step 3: appearances 컴포넌트 생성**

Create `features/quiz/components/weakness-detail-appearances.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { WeaknessAppearance } from '@/features/learning/types';

export function WeaknessDetailAppearances({
  appearances,
}: {
  appearances: WeaknessAppearance[];
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>등장 기록</Text>
      {appearances.length === 0 ? (
        <Text style={styles.empty}>아직 등장한 기록이 없어요.</Text>
      ) : (
        appearances.map((a) => (
          <View key={a.attemptId} style={styles.row}>
            <Text style={styles.bullet}>·</Text>
            <Text style={styles.label}>{a.sourceLabel}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: '#1C2C19',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bullet: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: 'rgba(72, 67, 58, 0.5)',
  },
  label: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: 'rgba(28, 44, 25, 0.85)',
    flex: 1,
  },
  empty: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: 'rgba(72, 67, 58, 0.5)',
  },
});
```

- [ ] **Step 4: 타입체크 통과**

Run: `npx tsc --noEmit 2>&1 | grep weakness-detail`
Expected: 에러 없음 (view 자체는 다음 Task).

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/weakness-detail-header.tsx features/quiz/components/weakness-detail-review-progress.tsx features/quiz/components/weakness-detail-appearances.tsx
git commit -m "feat(quiz): add weakness detail sub-components (header/review-progress/appearances)"
```

---

## Task 11: 약점 상세 화면 view (조립)

**Files:**
- Create: `features/quiz/components/weakness-detail-screen-view.tsx`

- [ ] **Step 1: view 작성**

Create `features/quiz/components/weakness-detail-screen-view.tsx`:

```tsx
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontFamilies } from '@/constants/typography';
import { WeaknessAccuracyChart } from '@/features/quiz/components/weakness-growth-chart';
import { WeaknessDetailAppearances } from '@/features/quiz/components/weakness-detail-appearances';
import { WeaknessDetailHeader } from '@/features/quiz/components/weakness-detail-header';
import { WeaknessDetailReviewProgress } from '@/features/quiz/components/weakness-detail-review-progress';
import type { UseWeaknessDetailScreenResult } from '@/features/quiz/hooks/use-weakness-detail-screen';

const MIN_CHART_POINTS = 3;

function chartDataPointCount(item: NonNullable<UseWeaknessDetailScreenResult['item']>): number {
  let count = 0;
  if (item.diagnosticAccuracy != null) count += 1;
  count += Object.keys(item.reviewAccuracyByStage).length;
  return count;
}

export function WeaknessDetailScreenView({
  loading,
  notFound,
  item,
  appearances,
  onPracticeNow,
  onBack,
}: UseWeaknessDetailScreenResult) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.appBar}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="뒤로"
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.appBarTitle} numberOfLines={1}>
          {item?.weaknessLabel ?? '약점 상세'}
        </Text>
        <View style={styles.appBarRightSpacer} />
      </View>

      {loading || item == null ? (
        <View style={styles.loadingWrap}>
          {notFound ? (
            <Text style={styles.notFound}>약점 정보를 찾을 수 없어요.</Text>
          ) : (
            <ActivityIndicator />
          )}
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <WeaknessDetailHeader item={item} />
            <View style={styles.divider} />
            <WeaknessDetailReviewProgress stage={item.stage} completed={item.completed} />
            <View style={styles.divider} />

            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>정답률 추이</Text>
              {chartDataPointCount(item) >= MIN_CHART_POINTS ? (
                <WeaknessAccuracyChart items={[item]} />
              ) : (
                <Text style={styles.chartPlaceholder}>
                  기록이 더 쌓이면 보여드릴게요.
                </Text>
              )}
            </View>
            <View style={styles.divider} />

            <WeaknessDetailAppearances appearances={appearances} />
          </ScrollView>

          <View style={styles.ctaWrap}>
            <Pressable
              onPress={onPracticeNow}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.ctaText}>
                {item.completed ? '다시 연습하기' : '지금 바로 연습하기'}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F2E7' },
  appBar: {
    height: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backArrow: {
    fontFamily: FontFamilies.bold,
    fontSize: 28,
    color: '#1C2C19',
    width: 32,
    textAlign: 'center',
  },
  appBarTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: '#1C2C19',
    flex: 1,
    textAlign: 'center',
  },
  appBarRightSpacer: { width: 32 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: {
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    color: 'rgba(72, 67, 58, 0.7)',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  divider: {
    height: 1,
    backgroundColor: 'rgba(41, 59, 39, 0.08)',
    marginHorizontal: 16,
  },
  chartSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: '#1C2C19',
  },
  chartPlaceholder: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: 'rgba(72, 67, 58, 0.55)',
    paddingVertical: 24,
    textAlign: 'center',
  },
  ctaWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  cta: {
    backgroundColor: '#1C2C19',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    color: '#F6F2E7',
  },
});
```

> **Note:** 색상 (`#F6F2E7`, `#1C2C19`) 은 다시다 톤을 그대로 차용. 다른 화면과 다르면 그 화면의 톤을 따른다.

- [ ] **Step 2: 타입체크 전체 통과**

Run: `npx tsc --noEmit`
Expected: 에러 0건.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/weakness-detail-screen-view.tsx
git commit -m "feat(quiz): assemble weakness detail screen view (header/progress/chart/appearances/CTA)"
```

---

## Task 12: 전체 테스트 + 시뮬레이터 검증

- [ ] **Step 1: 전체 jest 통과 확인**

Run: `npx jest 2>&1 | tail -10`
Expected: 모든 테스트 PASS, 신규 테스트 14건 (severity 8 + appearances 6) 포함.

- [ ] **Step 2: 전체 타입체크 통과**

Run: `npx tsc --noEmit`
Expected: 에러 0건.

- [ ] **Step 3: 시뮬레이터 빌드 + 실행**

Run: `npx expo prebuild --clean && npx expo run:ios`
Expected: 빌드 성공, 시뮬레이터에 앱 띄움.

- [ ] **Step 4: 수동 검증 시나리오**

홈 화면에서 다음을 확인:

1. **"내 약점" 카드 시각** — 우측에 4단계 점이 아닌 심각도 점 (●●● / ●● / ●) + "단골 약점" / "자주 등장" / "가끔 등장" 라벨, 우측 끝에 ▸ 화살표
2. **카드 탭** — 약점 상세 화면이 push로 열림
3. **상세 화면 헤더** — 토픽 칩 + 약점명 + 심각도 + "최근 5번 중 N번 등장"
4. **복습 진도** — 4단계 점이 stage에 맞춰 채워짐, 다음 복습 안내
5. **정답률 추이** — 데이터 점 ≥3 이면 차트, 미만이면 placeholder
6. **등장 기록** — 모의고사/진단 회차 라벨 리스트
7. **"지금 바로 연습하기" 탭** — `/quiz/practice?weaknessId=...` 로 이동
8. **뒤로 가기** — 홈으로 돌아옴
9. **모의고사만 푼 신규 사용자** — 홈 "내 약점" 섹션 노출 (게이트 완화 검증)
10. **잘못된 weaknessId URL 직접 진입** — 홈으로 자동 redirect

- [ ] **Step 5: 문제 없으면 docs/PROGRESS.md 업데이트 + 커밋**

`docs/PROGRESS.md` 의 "## 로그" 섹션 맨 위에 다음 추가:

```markdown
### 2026.04.29

**약점 누적 집계 뷰 + 상세 화면 (Phase 2) 구현 완료**

- 홈 "내 약점" 카드 재설계: 4단계 점 → 심각도 점 (●●● 단골 / ●● 자주 / ● 가끔)
- 약점 상세 화면 신규 (`app/quiz/weakness/[weaknessId]`): 헤더 / 복습 진도 / 정답률 추이 (재사용) / 등장 기록 / "지금 바로 연습하기" CTA
- 일정과 무관하게 약점 연습 진입 가능해짐 ("맨날 못하는 구조" 해결)
- 섹션 노출 게이트 완화: `latestDiagnosticSummary` → `items.length > 0` (모의고사만 풀어도 노출)
- 신규 순수 함수: `weakness-severity.ts` (8 tests), `weakness-appearances.ts` (6 tests)
- 검증: TS 에러 0건, jest 전체 PASS, 시뮬레이터 시나리오 10개 통과
```

```bash
git add docs/PROGRESS.md
git commit -m "docs(progress): record Phase 2 weakness cumulative + detail screen completion"
```

---

## 회귀 / 위험 점검 체크리스트

구현 완료 후 마지막 점검:

- [ ] **Phase 1 흐름 무영향:** 모의고사 풀고 진단 완료 후, 다음 날 홈 "오늘의 복습"에 약점이 정상 등장하는지 (Phase 1 회귀 테스트)
- [ ] **약점 연습 → 학습 이력 정상 기록:** "지금 바로 연습하기" 로 푼 약점 연습이 `recordAttempt` 로 정상 저장되는지 (`weakness-practice` source)
- [ ] **ReviewTask stage 진행 무영향:** 일정 외 시점의 약점 연습이 day1→day3→day7→day30 진행에 끼어들지 않는지
- [ ] **딥링크/구버전 호환:** 옛날 카드 컴포넌트를 임포트하던 곳이 다른 화면에 없는지 (`grep -rn "WeaknessProgressItem" features/`)

---

## Phase 3 보류 항목 (이번 구현 대상 아님)

- 정답률 추이 차트의 인터랙션 (점 탭 → 회차 상세)
- 회차별 틀린 문제 목록 (몇 번 문제 틀렸는지)
- 약점 상세 화면용 차트 신규 디자인 (현재는 재사용에 한정)
- 푸시 알림 능동 권유 ("함수의 극한, 오늘 한번 더?")
