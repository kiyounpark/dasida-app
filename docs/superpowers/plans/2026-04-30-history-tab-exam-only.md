# 기록 탭 학평/모의고사 전용화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "내 기록"(=기록) 탭을 학평·모의고사·수능 응시 이력 전용 화면으로 재정의하여, 모의고사 응시 결과가 즉시 가시화되도록 한다.

**Architecture:** `features/history` 3-파일 구조(hook + insights + view) 그대로 유지하되, 데이터 소스를 `source: 'diagnostic'` → `source: 'featured-exam'`으로 전환하고, 히어로/이력 카드/빈 상태를 재구성한다. quiz hub의 `ExamAnalysisResumeCard`와 동일한 store/context를 재사용해 책임 분리는 유지한다.

**Tech Stack:** TypeScript, React Native, expo-router, Jest (Korean describe/it), `@/features/learner/provider`, `@/features/quiz/exam/*` 분석 상태 모듈

**Spec:** `docs/superpowers/specs/2026-04-30-history-tab-exam-only-design.md`

**v1 범위 조정 (spec 대비):**
- `LearningAttempt`에 per-question `diagnosisCompleted`가 없으므로 상태 배지는 `attempt.primaryWeaknessId` 기반의 2-state(`완료` / `미시작`) + latest attempt 한정 `진행 중 N/M`으로 산출.
- "최근 시험 이력" 항목은 v1에서 display-only (탭 동작 없음). 분석 재개는 히어로 CTA만 노출. 후속 spec에서 임의 attempt 결과 hydrate 추가.

---

## File Structure

### Modify
- `features/history/history-insights.ts` — `buildHero` 재작성(누적 성취), `buildPulseItems` 제거, `buildExamHistoryItems` 신설, 시그니처 변경
- `features/history/hooks/use-history-screen.ts` — `loadRecentAttempts` source 변경, `useFocusEffect` + 5초 throttle, `analysisState` 통합, `onPrimaryAction` 재작성
- `features/history/components/history-screen-view.tsx` — 히어로 재디자인(인라인), "최근 시험 이력" 섹션 인라인 신설, 빈 상태 카드 인라인 추가

### Create
- `features/history/history-insights.test.ts` — `buildHero` / `buildExamHistoryItems` 단위 테스트

### Delete
- 없음

---

## Task 1: 새 타입 정의 및 buildHero 테스트 셸

**Files:**
- Modify: `features/history/history-insights.ts`
- Create: `features/history/history-insights.test.ts`

- [ ] **Step 1: history-insights.ts 상단 import에 `AnalysisInProgressState` 추가**

`features/history/history-insights.ts` 1~5줄 import 블록 바로 아래에 추가:

```ts
import type { AnalysisInProgressState } from '@/features/quiz/exam/exam-analysis-in-progress';
```

- [ ] **Step 2: 새 타입 정의 (기존 타입 위에 추가, 기존 타입은 일단 보존)**

`features/history/history-insights.ts`의 기존 `HistoryHeroState` 정의 바로 위(line 6 근처)에 새 타입을 export. 기존 타입은 Task 3에서 한 번에 정리한다.

```ts
export type HistoryHeroStateV2 = {
  examAttempts: number;
  averageAccuracyValue: string; // '—' | 'N%'
  topWeaknesses: Array<{
    weaknessId: WeaknessId;
    label: string;
    count: number;
  }>;
  ctaKind: 'resume_analysis' | null;
  ctaLabel: string | null;
};

export type HistoryExamHistoryItem = {
  attemptId: string;
  examId: string;
  examTitle: string;
  occurredAtLabel: string;
  accuracyLabel: string;
  status: 'completed' | 'in_progress' | 'not_started';
  statusLabel: string;
  isLatest: boolean;
};

export type HistoryScreenInsightsV2 = {
  isEmpty: boolean;
  hero: HistoryHeroStateV2;
  weaknessProgress: HistoryWeaknessProgressItem[];
  examHistory: HistoryExamHistoryItem[];
};
```

- [ ] **Step 3: 테스트 파일 셸 생성**

Create `features/history/history-insights.test.ts`:

```ts
import type { LearningAttempt } from '@/features/learning/types';
import type { LearnerSummaryCurrent } from '@/features/learning/types';
import type { WeaknessId } from '@/data/diagnosisMap';
import type { AnalysisInProgressState } from '@/features/quiz/exam/exam-analysis-in-progress';

const w = (s: string) => s as unknown as WeaknessId;

function makeSummary(overrides: Partial<LearnerSummaryCurrent> = {}): LearnerSummaryCurrent {
  return {
    accountKey: 'acc1',
    updatedAt: '2026-04-30T00:00:00.000Z',
    repeatedWeaknesses: [],
    dueReviewTasks: [],
    featuredExamState: { examId: '', status: 'not_started' },
    totals: { diagnosticAttempts: 0, featuredExamAttempts: 0, reviewAttempts: 0 },
    recentActivity: [],
    ...overrides,
  };
}

function makeExamAttempt(overrides: Partial<LearningAttempt> = {}): LearningAttempt {
  return {
    id: 'att1',
    accountKey: 'acc1',
    learnerId: 'learner1',
    source: 'featured-exam',
    sourceEntityId: 'g3-calc-mock-2025-09',
    gradeSnapshot: 'g3',
    startedAt: '2026-04-29T10:00:00.000Z',
    completedAt: '2026-04-29T11:00:00.000Z',
    questionCount: 30,
    correctCount: 25,
    wrongCount: 5,
    accuracy: 83,
    primaryWeaknessId: null,
    topWeaknesses: [],
    schemaVersion: 1,
    createdAt: '2026-04-29T11:00:00.000Z',
    ...overrides,
  };
}

const NOT_IN_PROGRESS: AnalysisInProgressState = { isInProgress: false };

describe('history-insights v2 placeholder', () => {
  it('컴파일 확인', () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest features/history/history-insights.test.ts`
Expected: 1 test passed (placeholder).

- [ ] **Step 5: Commit**

```bash
git add features/history/history-insights.ts features/history/history-insights.test.ts
git commit -m "chore(history): v2 타입 셸 + 테스트 파일 추가"
```

---

## Task 2: buildHeroV2 — 빈 상태 / 응시 0회 (TDD)

**Files:**
- Modify: `features/history/history-insights.ts`
- Modify: `features/history/history-insights.test.ts`

- [ ] **Step 1: 빈 상태 테스트 작성**

`features/history/history-insights.test.ts`의 placeholder describe를 다음으로 교체:

```ts
import { buildHeroV2 } from './history-insights';

describe('buildHeroV2', () => {
  it('응시 0회: examAttempts 0, averageAccuracyValue "—", topWeaknesses [], cta null', () => {
    const hero = buildHeroV2({
      summary: makeSummary({ totals: { diagnosticAttempts: 0, featuredExamAttempts: 0, reviewAttempts: 0 } }),
      recentExamAttempts: [],
      analysisState: NOT_IN_PROGRESS,
    });

    expect(hero.examAttempts).toBe(0);
    expect(hero.averageAccuracyValue).toBe('—');
    expect(hero.topWeaknesses).toEqual([]);
    expect(hero.ctaKind).toBeNull();
    expect(hero.ctaLabel).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest features/history/history-insights.test.ts -t "buildHeroV2"`
Expected: FAIL — `buildHeroV2 is not a function`.

- [ ] **Step 3: 최소 구현**

`features/history/history-insights.ts` 파일 끝에 추가:

```ts
export function buildHeroV2(input: {
  summary: LearnerSummaryCurrent;
  recentExamAttempts: LearningAttempt[];
  analysisState: AnalysisInProgressState;
}): HistoryHeroStateV2 {
  const { summary } = input;
  const examAttempts = summary.totals.featuredExamAttempts;

  return {
    examAttempts,
    averageAccuracyValue: '—',
    topWeaknesses: [],
    ctaKind: null,
    ctaLabel: null,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest features/history/history-insights.test.ts -t "buildHeroV2"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/history/history-insights.ts features/history/history-insights.test.ts
git commit -m "feat(history): buildHeroV2 빈 상태 처리"
```

---

## Task 3: buildHeroV2 — 평균 정답률 (TDD)

**Files:**
- Modify: `features/history/history-insights.ts`
- Modify: `features/history/history-insights.test.ts`

- [ ] **Step 1: 평균 정답률 테스트 추가**

`describe('buildHeroV2', ...)` 안에 case 2개 추가:

```ts
  it('1회 응시: averageAccuracyValue "83%"', () => {
    const hero = buildHeroV2({
      summary: makeSummary({
        totals: { diagnosticAttempts: 0, featuredExamAttempts: 1, reviewAttempts: 0 },
      }),
      recentExamAttempts: [makeExamAttempt({ accuracy: 83 })],
      analysisState: NOT_IN_PROGRESS,
    });

    expect(hero.examAttempts).toBe(1);
    expect(hero.averageAccuracyValue).toBe('83%');
  });

  it('3회 응시: 정답률 평균을 반올림하여 표시 (84+72+90 → 82%)', () => {
    const hero = buildHeroV2({
      summary: makeSummary({
        totals: { diagnosticAttempts: 0, featuredExamAttempts: 3, reviewAttempts: 0 },
      }),
      recentExamAttempts: [
        makeExamAttempt({ id: 'a1', accuracy: 84 }),
        makeExamAttempt({ id: 'a2', accuracy: 72 }),
        makeExamAttempt({ id: 'a3', accuracy: 90 }),
      ],
      analysisState: NOT_IN_PROGRESS,
    });

    expect(hero.averageAccuracyValue).toBe('82%');
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest features/history/history-insights.test.ts -t "buildHeroV2"`
Expected: 2 FAIL (`expected '83%' but got '—'`).

- [ ] **Step 3: 평균 정답률 로직 구현**

`features/history/history-insights.ts`의 `buildHeroV2` 본문을 다음으로 교체:

```ts
export function buildHeroV2(input: {
  summary: LearnerSummaryCurrent;
  recentExamAttempts: LearningAttempt[];
  analysisState: AnalysisInProgressState;
}): HistoryHeroStateV2 {
  const { summary, recentExamAttempts } = input;
  const examAttempts = summary.totals.featuredExamAttempts;

  let averageAccuracyValue = '—';
  if (recentExamAttempts.length > 0) {
    const total = recentExamAttempts.reduce((sum, a) => sum + a.accuracy, 0);
    const avg = Math.round(total / recentExamAttempts.length);
    averageAccuracyValue = `${avg}%`;
  }

  return {
    examAttempts,
    averageAccuracyValue,
    topWeaknesses: [],
    ctaKind: null,
    ctaLabel: null,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest features/history/history-insights.test.ts -t "buildHeroV2"`
Expected: 3 PASS (총 누적).

- [ ] **Step 5: Commit**

```bash
git add features/history/history-insights.ts features/history/history-insights.test.ts
git commit -m "feat(history): buildHeroV2 평균 정답률 계산"
```

---

## Task 4: buildHeroV2 — 약점 TOP 3 (TDD)

**Files:**
- Modify: `features/history/history-insights.ts`
- Modify: `features/history/history-insights.test.ts`

- [ ] **Step 1: 약점 TOP 3 테스트 추가**

```ts
  it('repeatedWeaknesses 상위 3개를 label과 함께 노출', () => {
    const hero = buildHeroV2({
      summary: makeSummary({
        totals: { diagnosticAttempts: 0, featuredExamAttempts: 5, reviewAttempts: 0 },
        repeatedWeaknesses: [
          { weaknessId: w('w_calc_def'), count: 8, lastSeenAt: '2026-04-29T00:00:00.000Z' },
          { weaknessId: w('w_calc_chain'), count: 5, lastSeenAt: '2026-04-28T00:00:00.000Z' },
          { weaknessId: w('w_calc_int'), count: 3, lastSeenAt: '2026-04-27T00:00:00.000Z' },
          { weaknessId: w('w_calc_lim'), count: 2, lastSeenAt: '2026-04-26T00:00:00.000Z' },
        ],
      }),
      recentExamAttempts: [makeExamAttempt({ accuracy: 80 })],
      analysisState: NOT_IN_PROGRESS,
    });

    expect(hero.topWeaknesses).toHaveLength(3);
    expect(hero.topWeaknesses[0]).toMatchObject({ count: 8 });
    expect(hero.topWeaknesses[1]).toMatchObject({ count: 5 });
    expect(hero.topWeaknesses[2]).toMatchObject({ count: 3 });
    // label은 diagnosisMap에서 lookup, 미존재 시 '알 수 없는 약점'
    expect(typeof hero.topWeaknesses[0].label).toBe('string');
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest features/history/history-insights.test.ts -t "buildHeroV2"`
Expected: FAIL (topWeaknesses [] 반환).

- [ ] **Step 3: 약점 TOP 3 로직 구현**

`buildHeroV2` 본문 내부, return 직전에 추가:

```ts
  const topWeaknesses = (summary.repeatedWeaknesses ?? [])
    .slice(0, 3)
    .map((rw) => ({
      weaknessId: rw.weaknessId,
      label: getWeaknessLabel(rw.weaknessId),
      count: rw.count,
    }));
```

그리고 return 객체에서 `topWeaknesses: []` → `topWeaknesses`로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest features/history/history-insights.test.ts -t "buildHeroV2"`
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add features/history/history-insights.ts features/history/history-insights.test.ts
git commit -m "feat(history): buildHeroV2 약점 TOP 3"
```

---

## Task 5: buildHeroV2 — 분석 재개 CTA (TDD)

**Files:**
- Modify: `features/history/history-insights.ts`
- Modify: `features/history/history-insights.test.ts`

- [ ] **Step 1: CTA 테스트 추가**

```ts
  it('analysisState.isInProgress === true: ctaKind "resume_analysis", ctaLabel 노출', () => {
    const hero = buildHeroV2({
      summary: makeSummary({
        totals: { diagnosticAttempts: 0, featuredExamAttempts: 1, reviewAttempts: 0 },
      }),
      recentExamAttempts: [makeExamAttempt()],
      analysisState: {
        isInProgress: true,
        examId: 'g3-calc-mock-2025-09',
        attemptId: 'att1',
        noteCount: 2,
        totalNotes: 5,
        diagnosedNotes: [
          { problemNumber: 1, weaknessId: w('w_calc_def') },
          { problemNumber: 2, weaknessId: w('w_calc_chain') },
        ],
      },
    });

    expect(hero.ctaKind).toBe('resume_analysis');
    expect(hero.ctaLabel).toBe('이어서 분석하기 →');
  });

  it('analysisState.isInProgress === false: cta null', () => {
    const hero = buildHeroV2({
      summary: makeSummary({
        totals: { diagnosticAttempts: 0, featuredExamAttempts: 1, reviewAttempts: 0 },
      }),
      recentExamAttempts: [makeExamAttempt()],
      analysisState: NOT_IN_PROGRESS,
    });

    expect(hero.ctaKind).toBeNull();
    expect(hero.ctaLabel).toBeNull();
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest features/history/history-insights.test.ts -t "buildHeroV2"`
Expected: 첫 번째 CTA 케이스 FAIL (ctaKind null).

- [ ] **Step 3: CTA 분기 구현**

`buildHeroV2` 안 `topWeaknesses` 계산 직후에 추가:

```ts
  const ctaKind: HistoryHeroStateV2['ctaKind'] =
    input.analysisState.isInProgress ? 'resume_analysis' : null;
  const ctaLabel = ctaKind === 'resume_analysis' ? '이어서 분석하기 →' : null;
```

return 객체의 `ctaKind: null, ctaLabel: null` → `ctaKind, ctaLabel`로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest features/history/history-insights.test.ts -t "buildHeroV2"`
Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add features/history/history-insights.ts features/history/history-insights.test.ts
git commit -m "feat(history): buildHeroV2 분석 재개 CTA"
```

---

## Task 6: buildExamHistoryItems — 빈 입력 / 단일 attempt 매핑 (TDD)

**Files:**
- Modify: `features/history/history-insights.ts`
- Modify: `features/history/history-insights.test.ts`

- [ ] **Step 1: 빈/기본 매핑 테스트 추가**

테스트 파일 상단 import에 추가:

```ts
import { buildExamHistoryItems } from './history-insights';
```

새 describe 블록을 buildHeroV2 describe 아래에 추가:

```ts
describe('buildExamHistoryItems', () => {
  it('빈 attempts → 빈 배열', () => {
    expect(
      buildExamHistoryItems({
        recentExamAttempts: [],
        latestAttemptId: null,
        analysisState: NOT_IN_PROGRESS,
      }),
    ).toEqual([]);
  });

  it('1건 attempt: examTitle/accuracyLabel/occurredAtLabel/isLatest 매핑', () => {
    const items = buildExamHistoryItems({
      recentExamAttempts: [
        makeExamAttempt({
          id: 'att1',
          sourceEntityId: 'g3-calc-mock-2025-09',
          accuracy: 73,
          completedAt: '2025-09-04T13:00:00.000Z',
          primaryWeaknessId: null,
          wrongCount: 5,
        }),
      ],
      latestAttemptId: 'att1',
      analysisState: NOT_IN_PROGRESS,
    });

    expect(items).toHaveLength(1);
    expect(items[0].attemptId).toBe('att1');
    expect(items[0].examId).toBe('g3-calc-mock-2025-09');
    expect(items[0].examTitle).toContain('미적분');
    expect(items[0].accuracyLabel).toBe('정답률 73%');
    expect(items[0].isLatest).toBe(true);
    // occurredAtLabel은 한국어 날짜 포맷 (예: "9/4 오후 10:00") — 정확한 문자열은 환경 의존이라 비검증
    expect(typeof items[0].occurredAtLabel).toBe('string');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest features/history/history-insights.test.ts -t "buildExamHistoryItems"`
Expected: FAIL — `buildExamHistoryItems is not a function`.

- [ ] **Step 3: 함수 구현**

`features/history/history-insights.ts` 상단 import 블록 마지막에 추가:

```ts
import { EXAM_CATALOG_BY_ID } from '@/features/quiz/data/exam-catalog';
```

파일 끝에 추가:

```ts
export function buildExamHistoryItems(input: {
  recentExamAttempts: LearningAttempt[];
  latestAttemptId: string | null;
  analysisState: AnalysisInProgressState;
}): HistoryExamHistoryItem[] {
  const { recentExamAttempts, latestAttemptId, analysisState } = input;

  return recentExamAttempts.map((attempt) => {
    const examId = attempt.sourceEntityId ?? '';
    const examTitle = EXAM_CATALOG_BY_ID[examId]?.title ?? examId;
    const isLatest = attempt.id === latestAttemptId;

    let status: HistoryExamHistoryItem['status'];
    let statusLabel: string;
    if (isLatest && analysisState.isInProgress) {
      status = 'in_progress';
      statusLabel = `진행 중 ${analysisState.noteCount}/${analysisState.totalNotes}`;
    } else if (attempt.primaryWeaknessId !== null) {
      status = 'completed';
      statusLabel = '분석 완료';
    } else if (attempt.wrongCount === 0) {
      status = 'completed';
      statusLabel = '만점';
    } else {
      status = 'not_started';
      statusLabel = '분석 미시작';
    }

    return {
      attemptId: attempt.id,
      examId,
      examTitle,
      occurredAtLabel: formatDateTime(attempt.completedAt),
      accuracyLabel: `정답률 ${attempt.accuracy}%`,
      status,
      statusLabel,
      isLatest,
    };
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx jest features/history/history-insights.test.ts -t "buildExamHistoryItems"`
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add features/history/history-insights.ts features/history/history-insights.test.ts
git commit -m "feat(history): buildExamHistoryItems 기본 매핑"
```

---

## Task 7: buildExamHistoryItems — 상태 분기 (TDD)

**Files:**
- Modify: `features/history/history-insights.test.ts`

- [ ] **Step 1: 상태 분기 테스트 추가**

`describe('buildExamHistoryItems', ...)` 안에 추가:

```ts
  it('latest attempt + analysisInProgress: status "in_progress", "진행 중 N/M"', () => {
    const items = buildExamHistoryItems({
      recentExamAttempts: [
        makeExamAttempt({ id: 'att-latest', wrongCount: 5, primaryWeaknessId: null }),
      ],
      latestAttemptId: 'att-latest',
      analysisState: {
        isInProgress: true,
        examId: 'g3-calc-mock-2025-09',
        attemptId: 'att-latest',
        noteCount: 2,
        totalNotes: 5,
        diagnosedNotes: [],
      },
    });

    expect(items[0].status).toBe('in_progress');
    expect(items[0].statusLabel).toBe('진행 중 2/5');
  });

  it('primaryWeaknessId 있음: status "completed", "분석 완료"', () => {
    const items = buildExamHistoryItems({
      recentExamAttempts: [
        makeExamAttempt({ id: 'att1', primaryWeaknessId: w('w_calc_def'), wrongCount: 3 }),
      ],
      latestAttemptId: 'att1',
      analysisState: NOT_IN_PROGRESS,
    });

    expect(items[0].status).toBe('completed');
    expect(items[0].statusLabel).toBe('분석 완료');
  });

  it('wrongCount 0 (만점): status "completed", "만점"', () => {
    const items = buildExamHistoryItems({
      recentExamAttempts: [
        makeExamAttempt({ id: 'att1', primaryWeaknessId: null, wrongCount: 0, accuracy: 100 }),
      ],
      latestAttemptId: null,
      analysisState: NOT_IN_PROGRESS,
    });

    expect(items[0].status).toBe('completed');
    expect(items[0].statusLabel).toBe('만점');
  });

  it('primaryWeaknessId null + wrongCount > 0 + (latest 아니거나 analysis idle): status "not_started"', () => {
    const items = buildExamHistoryItems({
      recentExamAttempts: [
        makeExamAttempt({ id: 'att-old', primaryWeaknessId: null, wrongCount: 4 }),
        makeExamAttempt({ id: 'att-latest', primaryWeaknessId: null, wrongCount: 4 }),
      ],
      latestAttemptId: 'att-latest',
      analysisState: NOT_IN_PROGRESS,
    });

    expect(items[0].status).toBe('not_started');
    expect(items[0].statusLabel).toBe('분석 미시작');
    expect(items[1].status).toBe('not_started');
  });
```

- [ ] **Step 2: 테스트 통과 확인**

Run: `npx jest features/history/history-insights.test.ts -t "buildExamHistoryItems"`
Expected: 6 PASS (Task 6 의 2 + 신규 4).

기존 구현이 이미 모든 분기를 커버하므로 추가 구현 없이 통과해야 한다. FAIL 시 Task 6 구현을 점검.

- [ ] **Step 3: Commit**

```bash
git add features/history/history-insights.test.ts
git commit -m "test(history): buildExamHistoryItems 상태 분기 회귀 잠금"
```

---

## Task 8: buildHistoryInsights v2 (구버전 정리 + 새 시그니처)

**Files:**
- Modify: `features/history/history-insights.ts`
- Modify: `features/history/history-insights.test.ts`

- [ ] **Step 1: 새 시그니처 테스트 추가**

테스트 파일 상단 import에 추가:

```ts
import { buildHistoryInsightsV2 } from './history-insights';
```

새 describe 추가:

```ts
describe('buildHistoryInsightsV2', () => {
  it('응시 0회: isEmpty true', () => {
    const insights = buildHistoryInsightsV2({
      summary: makeSummary({
        totals: { diagnosticAttempts: 0, featuredExamAttempts: 0, reviewAttempts: 0 },
      }),
      recentExamAttempts: [],
      latestAttemptId: null,
      analysisState: NOT_IN_PROGRESS,
    });

    expect(insights.isEmpty).toBe(true);
  });

  it('응시 1회 이상: isEmpty false, hero/weaknessProgress/examHistory 채워짐', () => {
    const insights = buildHistoryInsightsV2({
      summary: makeSummary({
        totals: { diagnosticAttempts: 0, featuredExamAttempts: 1, reviewAttempts: 0 },
      }),
      recentExamAttempts: [makeExamAttempt({ accuracy: 80 })],
      latestAttemptId: 'att1',
      analysisState: NOT_IN_PROGRESS,
    });

    expect(insights.isEmpty).toBe(false);
    expect(insights.hero.examAttempts).toBe(1);
    expect(insights.examHistory).toHaveLength(1);
    expect(Array.isArray(insights.weaknessProgress)).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx jest features/history/history-insights.test.ts -t "buildHistoryInsightsV2"`
Expected: FAIL — undefined 함수.

- [ ] **Step 3: buildHistoryInsightsV2 구현**

`features/history/history-insights.ts` 파일 끝에 추가:

```ts
export function buildHistoryInsightsV2(input: {
  summary: LearnerSummaryCurrent;
  recentExamAttempts: LearningAttempt[];
  latestAttemptId: string | null;
  analysisState: AnalysisInProgressState;
}): HistoryScreenInsightsV2 {
  const { summary, recentExamAttempts, latestAttemptId, analysisState } = input;
  const isEmpty = summary.totals.featuredExamAttempts === 0;

  return {
    isEmpty,
    hero: buildHeroV2({ summary, recentExamAttempts, analysisState }),
    weaknessProgress: buildWeaknessProgress(summary),
    examHistory: buildExamHistoryItems({ recentExamAttempts, latestAttemptId, analysisState }),
  };
}
```

- [ ] **Step 4: 구버전 export 제거**

`features/history/history-insights.ts`에서 다음 항목들을 **삭제**:
- `HistoryHeroState` 타입(원본)
- `HistoryPulseItem` 타입
- `HistoryScreenInsights` 타입(원본)
- `buildHero` 함수(원본)
- `buildPulseItems` 함수
- `buildHistoryInsights` 함수(원본)

그리고 신규 타입의 `V2` 접미사를 제거하기 위해 일괄 rename:
- `HistoryHeroStateV2` → `HistoryHeroState`
- `HistoryScreenInsightsV2` → `HistoryScreenInsights`
- `buildHeroV2` → `buildHero`
- `buildHistoryInsightsV2` → `buildHistoryInsights`

테스트 파일도 동일하게 import 이름 업데이트 (`buildHeroV2` → `buildHero` 등).

- [ ] **Step 5: 전체 테스트 + 타입체크 통과 확인**

```bash
npx jest features/history/history-insights.test.ts
npm run typecheck
```

Expected: 모든 history-insights 테스트 PASS. typecheck 시 `features/history/hooks/use-history-screen.ts` / `features/history/components/history-screen-view.tsx`에서 구 타입 참조로 에러 발생 가능 — 다음 Task에서 마이그레이션하므로 **이 시점에서는 typecheck 에러를 허용**한다 (커밋만 진행).

- [ ] **Step 6: Commit**

```bash
git add features/history/history-insights.ts features/history/history-insights.test.ts
git commit -m "refactor(history): insights v2로 전환 (구버전 제거)"
```

---

## Task 9: use-history-screen.ts — 데이터 소스 + 분석 상태 통합

**Files:**
- Modify: `features/history/hooks/use-history-screen.ts`

- [ ] **Step 1: 파일 전체 교체**

`features/history/hooks/use-history-screen.ts`를 다음 내용으로 **전체 교체**:

```ts
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildHistoryInsights } from '@/features/history/history-insights';
import { useCurrentLearner } from '@/features/learner/provider';
import type { LearningAttempt } from '@/features/learning/types';
import {
  computeAnalysisInProgressState,
  type AnalysisInProgressState,
  type LatestExamAttemptSummary,
} from '@/features/quiz/exam/exam-analysis-in-progress';
import { getDiagnosisProgress } from '@/features/quiz/exam/exam-diagnosis-progress';
import { getLatestExamAttempt } from '@/features/quiz/exam/latest-exam-attempt-store';
import { useExamSession } from '@/features/quiz/exam/exam-session';

export type UseHistoryScreenResult = ReturnType<typeof useHistoryScreen>;

export function useHistoryScreen() {
  const { isReady, refresh, loadRecentAttempts, summary, session } = useCurrentLearner();
  const { hydrateResult } = useExamSession();
  const [recentExamAttempts, setRecentExamAttempts] = useState<LearningAttempt[]>([]);
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [latestAttempt, setLatestAttempt] = useState<LatestExamAttemptSummary | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisInProgressState>({ isInProgress: false });
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadAttempts = useCallback(async () => {
    if (!isReady || !summary?.accountKey) {
      if (!isMountedRef.current) return;
      setRecentExamAttempts([]);
      setIsLoadingAttempts(false);
      return;
    }

    setIsLoadingAttempts(true);
    try {
      const attempts = await loadRecentAttempts({
        source: 'featured-exam',
        limit: 5,
      });
      if (!isMountedRef.current) return;
      setRecentExamAttempts(attempts);
    } catch {
      if (!isMountedRef.current) return;
      setRecentExamAttempts([]);
    } finally {
      if (isMountedRef.current) setIsLoadingAttempts(false);
    }
  }, [isReady, loadRecentAttempts, summary?.accountKey]);

  useEffect(() => {
    void loadAttempts();
  }, [loadAttempts, summary?.updatedAt]);

  const isFirstFocusRef = useRef(true);
  const lastFocusRefreshAtRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      const now = Date.now();
      if (now - lastFocusRefreshAtRef.current < 5_000) return;
      lastFocusRefreshAtRef.current = now;
      void refresh();
      void loadAttempts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.accountKey]),
  );

  // 분석 상태 fetch — 포커스 시 재계산
  useFocusEffect(
    useCallback(() => {
      const accountKey = session?.accountKey;
      let cancelled = false;
      void (async () => {
        if (!accountKey) {
          setLatestAttempt(null);
          setAnalysisState({ isInProgress: false });
          return;
        }
        const attempt = await getLatestExamAttempt(accountKey);
        if (cancelled) return;
        setLatestAttempt(attempt);
        if (!attempt) {
          setAnalysisState({ isInProgress: false });
          return;
        }
        const diagnosed = await getDiagnosisProgress({
          examId: attempt.examId,
          attemptId: attempt.attemptId,
          attemptDateISO: attempt.attemptDateISO,
        });
        if (cancelled) return;
        setAnalysisState(
          computeAnalysisInProgressState({ latestAttempt: attempt, diagnosedProblems: diagnosed }),
        );
      })();
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.accountKey]),
  );

  const insights = useMemo(() => {
    if (!summary) return null;
    return buildHistoryInsights({
      summary,
      recentExamAttempts,
      latestAttemptId: latestAttempt?.attemptId ?? null,
      analysisState,
    });
  }, [summary, recentExamAttempts, latestAttempt?.attemptId, analysisState]);

  async function onRefresh() {
    setIsRefreshing(true);
    try {
      await refresh();
      await loadAttempts();
    } finally {
      setIsRefreshing(false);
    }
  }

  function onPrimaryAction() {
    if (!insights) return;

    if (insights.hero.ctaKind === 'resume_analysis') {
      if (!latestAttempt || !latestAttempt.result) return;
      const startIndex = analysisState.isInProgress ? analysisState.diagnosedNotes.length : 0;
      hydrateResult(latestAttempt.result);
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
      return;
    }
  }

  function onPressEmptyStateCta() {
    router.push('/(tabs)/quiz/exams');
  }

  return {
    insights,
    isLoadingAttempts,
    isReady,
    isRefreshing,
    onPrimaryAction,
    onPressEmptyStateCta,
    onRefresh,
  };
}
```

- [ ] **Step 2: 타입체크 확인**

Run: `npm run typecheck`
Expected: `features/history/components/history-screen-view.tsx`만 에러 (구 인사이트 모양 사용 중) — 정상. 그 외 hook/insights 영역 에러는 없어야 함.

- [ ] **Step 3: Commit**

```bash
git add features/history/hooks/use-history-screen.ts
git commit -m "refactor(history): hook을 featured-exam + analysisState 기반으로 전환"
```

---

## Task 10: history-screen-view.tsx — 빈 상태 카드

**Files:**
- Modify: `features/history/components/history-screen-view.tsx`

- [ ] **Step 1: view 파일 import 정리 + 새 props 받기**

`features/history/components/history-screen-view.tsx` 파일 상단 import 블록을 다음으로 교체:

```tsx
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { BrandTypography } from '@/constants/typography';
import { useIsTablet } from '@/hooks/use-is-tablet';
import type { UseHistoryScreenResult } from '@/features/history/hooks/use-history-screen';
```

기존 `getAccuracyBadgeStyle` 함수는 새 디자인에서 사용하지 않으므로 **삭제**한다.

- [ ] **Step 2: HistoryScreenView 시그니처 + 초기 가드 로직 교체**

기존 `export function HistoryScreenView(...)` 정의부터 첫 두 가드 분기(`!isReady`, `!insights`)까지를 다음으로 교체:

```tsx
export function HistoryScreenView({
  insights,
  isLoadingAttempts,
  isReady,
  isRefreshing,
  onPrimaryAction,
  onPressEmptyStateCta,
  onRefresh,
}: UseHistoryScreenResult) {
  const isTablet = useIsTablet();
  const insets = useSafeAreaInsets();

  if (!isReady) {
    return (
      <View style={styles.screen}>
        <View style={[styles.feedbackWrap, { paddingTop: insets.top + BrandSpacing.xxl }]}>
          <View style={styles.feedbackCard}>
            <Text selectable style={styles.feedbackTitle}>
              기록을 준비 중이에요
            </Text>
            <Text selectable style={styles.feedbackBody}>
              학평·모의고사 응시 이력을 불러오고 있습니다.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!insights) {
    return (
      <View style={styles.screen}>
        <View style={[styles.feedbackWrap, { paddingTop: insets.top + BrandSpacing.xxl }]}>
          <View style={styles.feedbackCard}>
            <Text selectable style={styles.feedbackTitle}>
              기록을 다시 불러와야 해요
            </Text>
            <Text selectable style={styles.feedbackBody}>
              현재 학습 상태를 완전히 복원하지 못했습니다. 한 번 더 불러오면 대부분 바로 해결됩니다.
            </Text>
            <BrandButton title="다시 불러오기" variant="neutral" onPress={() => void onRefresh()} />
          </View>
        </View>
      </View>
    );
  }

  if (insights.isEmpty) {
    return (
      <View style={styles.screen}>
        <View style={[styles.feedbackWrap, { paddingTop: insets.top + BrandSpacing.xxl }]}>
          <View style={styles.feedbackCard}>
            <Text selectable style={styles.feedbackTitle}>
              아직 학평/모의고사 기록이 없어요
            </Text>
            <Text selectable style={styles.feedbackBody}>
              첫 시험을 풀고 나면 응시 횟수, 정답률, 자주 발견된 약점이 여기에 쌓입니다.
            </Text>
            <BrandButton title="시험 풀러 가기 →" onPress={onPressEmptyStateCta} />
          </View>
        </View>
      </View>
    );
  }

  // 본문(누적 카드들)은 다음 task에서 작성
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + BrandSpacing.md },
          isTablet && styles.tabletContainer,
        ]}
        scrollIndicatorInsets={{ top: insets.top }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void onRefresh()}
            tintColor={BrandColors.primarySoft}
          />
        }
      >
        {/* 다음 Task에서 채워짐 */}
      </ScrollView>
    </View>
  );
}
```

`)`로 끝나는 기존 view 함수 본문 잔재가 남아 있을 수 있다. **함수 내부의 기존 hero/progressList/pulseList JSX 전체와 빈 상태 분기 전체를 위 코드로 깨끗하게 교체**해야 한다.

- [ ] **Step 3: 타입체크 확인**

Run: `npm run typecheck`
Expected: PASS (현재 `styles` 객체에 미사용 키가 남아 있어도 TS 에러는 아님).

- [ ] **Step 4: Commit**

```bash
git add features/history/components/history-screen-view.tsx
git commit -m "feat(history): 빈 상태 카드 + 초기 가드 분기 재작성"
```

---

## Task 11: history-screen-view.tsx — 히어로 카드 (누적 성취)

**Files:**
- Modify: `features/history/components/history-screen-view.tsx`

- [ ] **Step 1: 히어로 카드 JSX 추가**

Task 10에서 작성한 본문 ScrollView 안 `{/* 다음 Task에서 채워짐 */}` 자리에 다음을 추가:

```tsx
{/* 히어로 카드 — 누적 성취 */}
<View style={styles.heroCard}>
  <View style={styles.heroTopRow}>
    <View style={styles.heroMain}>
      <Text selectable style={styles.heroLabel}>총 응시</Text>
      <View style={styles.heroCountRow}>
        <Text selectable style={styles.heroCount}>{insights.hero.examAttempts}</Text>
        <Text selectable style={styles.heroCountUnit}>회</Text>
      </View>
      <Text selectable style={styles.heroSubtext}>학평·모의고사·수능 누적</Text>
    </View>
    <View style={styles.heroPanel}>
      <Text selectable style={styles.heroPanelLabel}>평균 정답률</Text>
      <Text selectable style={styles.heroPanelValue}>
        {isLoadingAttempts ? '—' : insights.hero.averageAccuracyValue}
      </Text>
      <Text selectable style={styles.heroPanelMeta}>최근 5회 평균</Text>
    </View>
  </View>

  {insights.hero.topWeaknesses.length > 0 ? (
    <View style={styles.heroWeaknessSection}>
      <Text selectable style={styles.heroSectionLabel}>자주 발견된 약점</Text>
      {insights.hero.topWeaknesses.map((item) => (
        <View key={item.weaknessId} style={styles.heroWeaknessRow}>
          <Text selectable style={styles.heroWeaknessLabel} numberOfLines={1}>
            {item.label}
          </Text>
          <View style={styles.heroWeaknessCountPill}>
            <Text selectable style={styles.heroWeaknessCountText}>{item.count}회</Text>
          </View>
        </View>
      ))}
    </View>
  ) : null}

  {insights.hero.ctaKind === 'resume_analysis' && insights.hero.ctaLabel ? (
    <BrandButton title={insights.hero.ctaLabel} onPress={onPrimaryAction} />
  ) : null}
</View>
```

- [ ] **Step 2: 히어로 관련 styles 정리**

`StyleSheet.create({ ... })` 블록에서 다음을 보장한다:
- `heroCard`, `heroTopRow`, `heroMain`, `heroLabel`, `heroCountRow`, `heroCount`, `heroCountUnit`, `heroSubtext`, `heroPanel` (기존 키 재사용)
- 신규 키 추가:

```ts
heroPanelValue: {
  color: '#FFFFFF',
  fontSize: 22,
  fontWeight: '800',
  fontVariant: ['tabular-nums'],
},
heroPanelMeta: {
  color: 'rgba(255,255,255,0.45)',
  fontSize: 10,
},
heroWeaknessSection: {
  borderTopWidth: 1,
  borderTopColor: 'rgba(255,255,255,0.1)',
  paddingTop: 12,
  gap: 8,
},
heroSectionLabel: {
  color: 'rgba(255,255,255,0.5)',
  fontSize: 11,
  letterSpacing: 0.3,
},
heroWeaknessRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
},
heroWeaknessLabel: {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '600',
  flex: 1,
},
heroWeaknessCountPill: {
  backgroundColor: 'rgba(255,255,255,0.12)',
  borderRadius: 999,
  paddingHorizontal: 8,
  paddingVertical: 2,
},
heroWeaknessCountText: {
  color: '#FFFFFF',
  fontSize: 11,
  fontWeight: '700',
  fontVariant: ['tabular-nums'],
},
```

기존 키 중 더 이상 사용되지 않는 항목(`heroAccuracyRow`, `heroAccuracyLabel`, `heroAccuracyValue`, `heroAccuracyBadge`, `heroAccuracyBadgeText`, `heroPanelStagePill`, `heroPanelStageText`, `heroPanelWeakness`, `pulseList`, `pulseItem`, `pulseCopy`, `pulseTitle`, `pulseTime`, `pulseBadge`, `pulseBadgeKind`, `pulseBadgeText`, `pulseBadgeKindText`, `pulseBadgeValueText`)는 **삭제**.

- [ ] **Step 3: 시뮬레이터에서 빠른 시각 확인 (선택)**

```bash
npx expo run:ios
```

기록 탭 진입 시 응시 0회 또는 1회 이상 케이스에서 히어로 카드가 정상 렌더되는지 확인. (응시 1회는 시뮬에서 모의고사 1회 풀이 후 확인 가능 — 시간 부족하면 다음 task와 함께 한 번에 확인)

- [ ] **Step 4: typecheck 통과 확인**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/history/components/history-screen-view.tsx
git commit -m "feat(history): 히어로 카드 누적 성취 디자인"
```

---

## Task 12: history-screen-view.tsx — 약점 진행 단계 카드 (기존 유지)

**Files:**
- Modify: `features/history/components/history-screen-view.tsx`

- [ ] **Step 1: 히어로 카드 JSX 바로 아래에 약점 진행 단계 카드 JSX 추가**

```tsx
{/* 약점별 진행 단계 카드 */}
{insights.weaknessProgress.length > 0 ? (
  <View style={styles.card}>
    <Text selectable style={styles.cardKicker}>약점별 진행 단계</Text>
    <View style={styles.progressList}>
      {insights.weaknessProgress.map((item) => (
        <View key={item.weaknessId} style={styles.progressItem}>
          <View style={styles.progressItemHeader}>
            <Text selectable style={styles.progressItemLabel}>{item.label}</Text>
            <Text
              selectable
              style={[
                styles.progressItemMeta,
                item.isDue && styles.progressItemMetaDue,
              ]}>
              {item.stageLabel} · {item.nextLabel}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                item.isDue && styles.progressFillDue,
                { width: `${item.progressRatio * 100}%` },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  </View>
) : null}
```

`progressList`, `progressItem`, `progressItemHeader`, `progressItemLabel`, `progressItemMeta`, `progressItemMetaDue`, `progressTrack`, `progressFill`, `progressFillDue`, `card`, `cardKicker` 스타일은 기존 정의 그대로 유지한다.

- [ ] **Step 2: typecheck 통과 확인**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add features/history/components/history-screen-view.tsx
git commit -m "feat(history): 약점별 진행 단계 카드 재배치"
```

---

## Task 13: history-screen-view.tsx — 최근 시험 이력 카드 (신규)

**Files:**
- Modify: `features/history/components/history-screen-view.tsx`

- [ ] **Step 1: 약점 진행 단계 카드 JSX 바로 아래에 최근 시험 이력 카드 JSX 추가**

```tsx
{/* 최근 시험 이력 카드 */}
{insights.examHistory.length > 0 ? (
  <View style={styles.card}>
    <Text selectable style={styles.cardKicker}>최근 시험 이력</Text>
    <View style={styles.examHistoryList}>
      {insights.examHistory.map((item) => (
        <View key={item.attemptId} style={styles.examHistoryItem}>
          <View style={styles.examHistoryCopy}>
            <Text selectable style={styles.examHistoryTitle} numberOfLines={2}>
              {item.examTitle}
            </Text>
            <Text selectable style={styles.examHistoryMeta}>
              {item.occurredAtLabel} · {item.accuracyLabel}
            </Text>
          </View>
          <View style={[
            styles.examHistoryBadge,
            item.status === 'in_progress' && styles.examHistoryBadgeInProgress,
            item.status === 'completed' && styles.examHistoryBadgeCompleted,
            item.status === 'not_started' && styles.examHistoryBadgeNotStarted,
          ]}>
            <Text selectable style={[
              styles.examHistoryBadgeText,
              item.status === 'in_progress' && styles.examHistoryBadgeTextInProgress,
              item.status === 'completed' && styles.examHistoryBadgeTextCompleted,
              item.status === 'not_started' && styles.examHistoryBadgeTextNotStarted,
            ]}>
              {item.statusLabel}
            </Text>
          </View>
        </View>
      ))}
    </View>
  </View>
) : null}
```

- [ ] **Step 2: 신규 styles 추가**

`StyleSheet.create({ ... })` 블록에 추가:

```ts
examHistoryList: {
  gap: BrandSpacing.sm,
},
examHistoryItem: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: BrandSpacing.sm,
  paddingVertical: 6,
},
examHistoryCopy: {
  flex: 1,
  gap: 2,
},
examHistoryTitle: {
  ...BrandTypography.bodyStrong,
  color: BrandColors.text,
},
examHistoryMeta: {
  ...BrandTypography.tiny,
  color: BrandColors.mutedText,
},
examHistoryBadge: {
  borderRadius: 999,
  paddingHorizontal: 9,
  paddingVertical: 5,
  backgroundColor: '#EDF0E8',
},
examHistoryBadgeInProgress: {
  backgroundColor: 'rgba(224, 125, 16, 0.15)',
},
examHistoryBadgeCompleted: {
  backgroundColor: 'rgba(47, 158, 68, 0.15)',
},
examHistoryBadgeNotStarted: {
  backgroundColor: '#EDF0E8',
},
examHistoryBadgeText: {
  ...BrandTypography.tiny,
  color: BrandColors.primarySoft,
  fontWeight: '700',
},
examHistoryBadgeTextInProgress: {
  color: '#E07D10',
},
examHistoryBadgeTextCompleted: {
  color: BrandColors.success,
},
examHistoryBadgeTextNotStarted: {
  color: BrandColors.mutedText,
},
```

- [ ] **Step 3: typecheck 통과 확인**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add features/history/components/history-screen-view.tsx
git commit -m "feat(history): 최근 시험 이력 카드 신설"
```

---

## Task 14: 통합 검증 — typecheck + 단위 테스트 + 수동 시뮬레이션

**Files:**
- 없음 (검증만)

- [ ] **Step 1: 타입체크 전체 통과 확인**

Run: `npm run typecheck`
Expected: error 0건.

- [ ] **Step 2: 영향 범위 단위 테스트 통과 확인**

```bash
npx jest features/history features/quiz/exam/exam-analysis-in-progress.test.ts
```

Expected: 모두 PASS.

- [ ] **Step 3: lint 통과 확인**

Run: `npm run lint`
Expected: error 0건. (warning은 기존 누적 수치 대비 신규 추가 없음을 확인)

- [ ] **Step 4: iOS 시뮬레이터 수동 시나리오**

`npx expo run:ios` 후 다음 시나리오 모두 정상 동작 확인:

| 시나리오 | 기대 동작 |
| --- | --- |
| 응시 0회 사용자 → 기록 탭 | 빈 상태 카드 + "시험 풀러 가기 →" CTA |
| 빈 상태 CTA 탭 | `/(tabs)/quiz/exams` 진입 |
| 모의고사 1회 응시 후 → 기록 탭 | 응시 1회, 평균 정답률 노출, 약점 TOP 3 (있다면) |
| 모의고사 분석 미완료 상태 → 기록 탭 | 히어로에 "이어서 분석하기 →" CTA, 최근 시험 이력 첫 항목 "진행 중 N/M" 배지 |
| "이어서 분석하기" 탭 | quiz hub과 동일한 흐름으로 `/quiz/exam/diagnosis-session` 진입 |
| 모의고사 진단 완료 → 기록 탭 | 히어로 CTA 사라짐, 첫 항목 "분석 완료" 배지, 약점 진행 단계에 신규 약점 노출 |
| 다른 탭 갔다가 5초+ 경과 후 기록 탭 복귀 | 자동 새로고침 (콘솔에서 `loadAttempts` 호출 확인) |
| 졸업 전 사용자 → 기록 탭 | 응시 0회면 빈 상태 (의도된 동작) |

각 시나리오 결과를 PR 설명에 캡처/요약으로 첨부.

- [ ] **Step 5: 결과 종합 commit (필요 시)**

수동 검증 중 문제 발견 시 별도 커밋으로 수정. 문제 없으면 이 step은 skip.

- [ ] **Step 6: 종료 알림 (Slack)**

```bash
npm run notify:done -- "기록 탭 학평/모의고사 전용화 — Phase 1 구현 완료, 시뮬레이터 시나리오 검증 완료"
```

---

## Self-Review Notes

**Spec coverage:**
- 히어로 누적 성취 (응시 횟수/정답률/약점 TOP 3) → Task 2~5
- 약점별 진행 단계 (기존 유지) → Task 12
- 최근 시험 이력 (신규) → Task 6, 7, 13
- 빈 상태 → Task 10
- `useFocusEffect` + 5초 throttle → Task 9
- `loadRecentAttempts` source 변경 → Task 9
- 분석 재개 CTA → Task 5, 9 (`onPrimaryAction`)
- 약점 TOP 3 source 모호성 → 1차는 옵션 1(`summary.repeatedWeaknesses`)로 처리, spec과 정렬

**v1 미커버 (의도적 deferral):**
- 임의 attempt 결과 hydrate (탭 동작) — list는 display-only로 출시
- "진행 중 N/M" 배지를 latest가 아닌 attempt에도 보여주기

**상태 동기화 위험:**
- `latestAttempt`와 `analysisState` 두 useFocusEffect가 동시 진행 → race 가능. 하지만 `cancelled` 플래그가 각각 있고, 결과적 일관성은 유지된다 (둘 다 같은 store 읽음).

**잠재 typecheck 이슈:**
- Task 8 step 5에서 일시적 typecheck 실패를 허용한다 (구버전 export 제거 직후, view 마이그레이션 전). Task 10 완료 시점에 다시 통과해야 함. Task 14에서 최종 확인.
