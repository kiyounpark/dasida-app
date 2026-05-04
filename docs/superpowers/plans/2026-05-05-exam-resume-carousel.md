# 모의고사 분석 이어보기 캐러셀 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 화면 "이어서 분석하기" 카드를 단일 시험 → 최근 3건 시험 캐러셀로 확장한다. 시험 A 분석 미완료 상태에서 시험 B 응시해도 시험 A 진입점이 홈에 유지되도록 데이터 모델과 UI를 변경한다.

**Architecture:** AsyncStorage 단일 객체(`LatestExamAttemptSummary | null`) → 배열(`LatestExamAttemptSummary[]`, 최대 3건). `computeAnalysisInProgressState`는 입력으로 attempt 배열과 attemptId별 progress 맵을 받아 출력으로 `items: AnalysisInProgressItem[]`을 반환. 홈 화면은 items 길이에 따라 단일 카드(현재 동작 그대로) 또는 horizontal swipe 캐러셀(`FlatList horizontal pagingEnabled` + 도트 인디케이터)을 렌더링.

**Tech Stack:** TypeScript, React Native, Expo Router, AsyncStorage, Jest 29

**Spec:** `docs/superpowers/specs/2026-05-05-exam-resume-carousel-design.md`

---

## File Structure

### Modify
- `features/quiz/exam/latest-exam-attempt-store.ts` — 단수 → 배열, 마이그레이션, in-place update, 3-cap, completed 제거
- `features/quiz/exam/exam-analysis-in-progress.ts` — 입출력 시그니처를 배열 기반으로 변경
- `features/quiz/hooks/use-quiz-hub-screen.ts` — 신규 store 호출 + items 배열 핸들링
- `features/quiz/components/quiz-hub-screen-view.tsx` — 단일 카드 vs 캐러셀 분기 렌더
- `features/quiz/exam/hooks/use-exam-result-screen.ts` — `saveLatestExamAttempt` → 신규 시그니처 호출
- `features/history/hooks/use-history-screen.ts` — `computeAnalysisInProgressState` 신규 시그니처 호출 + items[0] 렌더 유지

### Create
- `features/quiz/exam/__tests__/latest-exam-attempt-store.test.ts` — 마이그레이션, prepend, in-place, cap
- `features/quiz/exam/__tests__/exam-analysis-in-progress.test.ts` — 0/1/N items, 완료된 attempt 필터링
- `features/quiz/exam/components/exam-analysis-resume-carousel.tsx` — `FlatList horizontal pagingEnabled` 래퍼 + 도트 인디케이터 (단일 인디케이터 컴포넌트 inline)

---

## Task 1: latest-exam-attempt-store — 테스트 (RED)

**Files:**
- Create: `features/quiz/exam/__tests__/latest-exam-attempt-store.test.ts`

**참고:** AsyncStorage는 `jest.setup.js`에서 자동 mock된다. `jest.mocked(AsyncStorage)` 패턴으로 호출 검증.

- [ ] **Step 1.1: 테스트 파일 생성 — 신규 API 시나리오 전부 작성**

```typescript
// features/quiz/exam/__tests__/latest-exam-attempt-store.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getLatestExamAttempts,
  prependLatestExamAttempt,
} from '../latest-exam-attempt-store';
import type { LatestExamAttemptSummary } from '../exam-analysis-in-progress';

const mockedAsyncStorage = jest.mocked(AsyncStorage);
const ACCOUNT = 'acc';
const KEY = `dasida/latest-exam-attempt/${ACCOUNT}`;
const LEGACY_KEY = 'dasida/latest-exam-attempt';

function attempt(
  examId: string,
  attemptId: string,
  attemptDateISO: string,
  wrong: number[] = [1, 2],
): LatestExamAttemptSummary {
  return {
    examId,
    attemptId,
    attemptDateISO,
    wrongProblemNumbers: wrong,
    result: { examId, attemptId, completedAt: attemptDateISO } as never,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getLatestExamAttempts', () => {
  it('빈 저장소 → 빈 배열', async () => {
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    expect(await getLatestExamAttempts(ACCOUNT)).toEqual([]);
  });

  it('legacy 단일 객체 저장값 → 길이 1 배열로 마이그레이션', async () => {
    const legacy = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z');
    mockedAsyncStorage.getItem
      .mockResolvedValueOnce(null) // new key empty
      .mockResolvedValueOnce(JSON.stringify(legacy)); // legacy key has single object

    const result = await getLatestExamAttempts(ACCOUNT);

    expect(result).toEqual([legacy]);
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      KEY,
      JSON.stringify(legacy),
    );
    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith(LEGACY_KEY);
  });

  it('새 키에 단일 객체가 저장돼 있으면 → 길이 1 배열로 정규화', async () => {
    const single = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z');
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(single));

    expect(await getLatestExamAttempts(ACCOUNT)).toEqual([single]);
  });

  it('새 키에 배열이 저장돼 있으면 → 그대로 반환', async () => {
    const arr = [
      attempt('exam-B', 'b1', '2026-05-02T00:00:00Z'),
      attempt('exam-A', 'a1', '2026-05-01T00:00:00Z'),
    ];
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(arr));

    expect(await getLatestExamAttempts(ACCOUNT)).toEqual(arr);
  });

  it('손상된 JSON → 빈 배열 (안전 fallback)', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce('not json');
    expect(await getLatestExamAttempts(ACCOUNT)).toEqual([]);
  });
});

describe('prependLatestExamAttempt', () => {
  it('빈 배열 → 길이 1', async () => {
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z');

    await prependLatestExamAttempt(ACCOUNT, a);

    const lastSet = mockedAsyncStorage.setItem.mock.calls.at(-1);
    expect(lastSet?.[0]).toBe(KEY);
    expect(JSON.parse(lastSet?.[1] as string)).toEqual([a]);
  });

  it('새 attemptId → 맨 앞 prepend', async () => {
    const existing = [attempt('exam-A', 'a1', '2026-05-01T00:00:00Z')];
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existing));
    const b = attempt('exam-B', 'b1', '2026-05-02T00:00:00Z');

    await prependLatestExamAttempt(ACCOUNT, b);

    const written = JSON.parse(
      mockedAsyncStorage.setItem.mock.calls.at(-1)?.[1] as string,
    );
    expect(written).toEqual([b, existing[0]]);
  });

  it('동일 attemptId → 기존 위치에서 in-place 업데이트', async () => {
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', [1, 2]);
    const b = attempt('exam-B', 'b1', '2026-05-02T00:00:00Z');
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([b, a]));

    const aUpdated = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', [1, 2, 3]);
    await prependLatestExamAttempt(ACCOUNT, aUpdated);

    const written = JSON.parse(
      mockedAsyncStorage.setItem.mock.calls.at(-1)?.[1] as string,
    );
    expect(written).toEqual([b, aUpdated]);
  });

  it('4번째 신규 attempt → 가장 오래된 것이 빠지고 길이 3 유지', async () => {
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z');
    const b = attempt('exam-B', 'b1', '2026-05-02T00:00:00Z');
    const c = attempt('exam-C', 'c1', '2026-05-03T00:00:00Z');
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([c, b, a]));

    const d = attempt('exam-D', 'd1', '2026-05-04T00:00:00Z');
    await prependLatestExamAttempt(ACCOUNT, d);

    const written = JSON.parse(
      mockedAsyncStorage.setItem.mock.calls.at(-1)?.[1] as string,
    );
    expect(written).toEqual([d, c, b]); // a 탈락
    expect(written).toHaveLength(3);
  });
});

```

**삭제 함수 비포함 사유:** "분석 완료 시 카드 제거" 동작은 `computeAnalysisInProgressState`의 items 필터링(`diagnosedNotes.length >= totalNotes`)으로 이미 달성된다. AsyncStorage에서 명시 제거하지 않아도 화면 노출은 정확하고, 다음 신규 attempt prepend 시 cap에 의해 자연 도태된다. 추가 I/O 없는 단순한 해.

- [ ] **Step 1.2: 테스트 실행 — 컴파일 실패 확인 (RED)**

Run: `npx jest features/quiz/exam/__tests__/latest-exam-attempt-store.test.ts`

Expected: FAIL — `getLatestExamAttempts`, `prependLatestExamAttempt`, `removeLatestExamAttempt` not exported. 이는 의도된 RED 상태.

---

## Task 2: latest-exam-attempt-store — 구현 (GREEN) + caller 동기화

**Files:**
- Modify: `features/quiz/exam/latest-exam-attempt-store.ts`
- Modify: `features/quiz/exam/hooks/use-exam-result-screen.ts:19,84-90`
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts:17,124,126`

- [ ] **Step 2.1: store 본체 재작성**

`features/quiz/exam/latest-exam-attempt-store.ts` 전체를 다음으로 교체.

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LatestExamAttemptSummary } from './exam-analysis-in-progress';

const LEGACY_KEY = 'dasida/latest-exam-attempt';
const MAX_ATTEMPTS = 3;
const makeKey = (accountKey: string) => `dasida/latest-exam-attempt/${accountKey}`;

function isValidAttempt(v: unknown): v is LatestExamAttemptSummary {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.examId === 'string' &&
    typeof o.attemptId === 'string' &&
    typeof o.attemptDateISO === 'string' &&
    Array.isArray(o.wrongProblemNumbers)
  );
}

function parseStored(raw: string): LatestExamAttemptSummary[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(isValidAttempt);
    }
    if (isValidAttempt(parsed)) {
      // legacy single-object format
      return [parsed];
    }
    return [];
  } catch {
    return [];
  }
}

export async function getLatestExamAttempts(
  accountKey: string,
): Promise<LatestExamAttemptSummary[]> {
  try {
    const raw = await AsyncStorage.getItem(makeKey(accountKey));
    if (raw) return parseStored(raw);

    // one-shot migration from pre-multi-account legacy key
    const legacyRaw = await AsyncStorage.getItem(LEGACY_KEY);
    if (!legacyRaw) return [];
    const list = parseStored(legacyRaw);
    if (list.length > 0) {
      // write to new key first; if removeItem fails, migration safely reruns next launch
      await AsyncStorage.setItem(makeKey(accountKey), JSON.stringify(list));
    }
    await AsyncStorage.removeItem(LEGACY_KEY);
    return list;
  } catch {
    return [];
  }
}

export async function prependLatestExamAttempt(
  accountKey: string,
  attempt: LatestExamAttemptSummary,
): Promise<void> {
  try {
    const current = await getLatestExamAttempts(accountKey);
    const existingIdx = current.findIndex((a) => a.attemptId === attempt.attemptId);
    let next: LatestExamAttemptSummary[];
    if (existingIdx >= 0) {
      // in-place update; preserve existing order
      next = [...current];
      next[existingIdx] = attempt;
    } else {
      next = [attempt, ...current].slice(0, MAX_ATTEMPTS);
    }
    await AsyncStorage.setItem(makeKey(accountKey), JSON.stringify(next));
  } catch {}
}

```

기존 export(`saveLatestExamAttempt`, `getLatestExamAttempt`)는 모두 제거. 호출처는 다음 단계에서 갱신.

분석 완료 시 명시적 제거 함수는 두지 않는다 (`computeAnalysisInProgressState` 필터링이 동일한 효과를 내므로 YAGNI).

- [ ] **Step 2.2: use-exam-result-screen.ts 호출처 갱신**

`features/quiz/exam/hooks/use-exam-result-screen.ts`에서:

라인 19 import 변경:
```typescript
// before
import { saveLatestExamAttempt } from '../latest-exam-attempt-store';
// after
import { prependLatestExamAttempt } from '../latest-exam-attempt-store';
```

라인 84-90 호출 변경:
```typescript
// before
void saveLatestExamAttempt(session.accountKey, {
  examId: result.examId,
  attemptId: result.attemptId,
  attemptDateISO: result.completedAt,
  wrongProblemNumbers: wrongNums,
  result,
});
// after
void prependLatestExamAttempt(session.accountKey, {
  examId: result.examId,
  attemptId: result.attemptId,
  attemptDateISO: result.completedAt,
  wrongProblemNumbers: wrongNums,
  result,
});
```

- [ ] **Step 2.3: use-quiz-hub-screen.ts 호출처 갱신 (잠정 — items[0]만 사용)**

이 단계에서는 `computeAnalysisInProgressState`는 아직 단수 시그니처. 따라서 가장 최근(인덱스 0) attempt만 추출해 기존 단수 path로 흘려보낸다. Task 4에서 시그니처 전체 변환한다.

`features/quiz/hooks/use-quiz-hub-screen.ts`에서:

라인 17 import 변경:
```typescript
// before
import { getLatestExamAttempt } from '@/features/quiz/exam/latest-exam-attempt-store';
// after
import { getLatestExamAttempts } from '@/features/quiz/exam/latest-exam-attempt-store';
```

라인 124-126:
```typescript
// before
const attempt = await getLatestExamAttempt(accountKey);
if (cancelled) return;
setLatestAttempt(attempt);
// after
const attempts = await getLatestExamAttempts(accountKey);
if (cancelled) return;
const attempt = attempts[0] ?? null;
setLatestAttempt(attempt);
```

- [ ] **Step 2.4: jest 실행 — store 테스트 GREEN, 다른 테스트 회귀 없음 확인**

Run: `npx jest features/quiz/exam/__tests__/latest-exam-attempt-store.test.ts`

Expected: PASS, 모든 케이스 통과.

Run: `npx jest`

Expected: 전체 테스트 PASS. 회귀 없음.

- [ ] **Step 2.5: typecheck**

Run: `npx tsc --noEmit`

Expected: 에러 0건.

- [ ] **Step 2.6: 커밋**

```bash
git add features/quiz/exam/latest-exam-attempt-store.ts \
        features/quiz/exam/__tests__/latest-exam-attempt-store.test.ts \
        features/quiz/exam/hooks/use-exam-result-screen.ts \
        features/quiz/hooks/use-quiz-hub-screen.ts
git commit -m "$(cat <<'EOF'
refactor(exam): latest-exam-attempt-store 단수 → 배열로 전환

- getLatestExamAttempts/prependLatestExamAttempt/removeLatestExamAttempt 신규 export
- legacy 단일 객체 저장값 자동 마이그레이션 (read 시 [obj]로 wrap)
- 동일 attemptId in-place 업데이트, 신규는 prepend, 최대 3건 cap
- 호출처는 잠정 attempts[0] 사용 (computeAnalysisInProgressState 변경은 다음 커밋)
EOF
)"
```

---

## Task 3: exam-analysis-in-progress — 테스트 (RED)

**Files:**
- Create: `features/quiz/exam/__tests__/exam-analysis-in-progress.test.ts`

- [ ] **Step 3.1: 테스트 작성**

```typescript
// features/quiz/exam/__tests__/exam-analysis-in-progress.test.ts
import type { WeaknessId } from '@/data/diagnosisMap';

import {
  computeAnalysisInProgressState,
  type LatestExamAttemptSummary,
} from '../exam-analysis-in-progress';

const w = (s: string) => s as unknown as WeaknessId;

function attempt(
  examId: string,
  attemptId: string,
  attemptDateISO: string,
  wrong: number[],
): LatestExamAttemptSummary {
  return {
    examId,
    attemptId,
    attemptDateISO,
    wrongProblemNumbers: wrong,
    result: { examId, attemptId, completedAt: attemptDateISO } as never,
  };
}

describe('computeAnalysisInProgressState', () => {
  it('빈 attempts 입력 → isInProgress: false', () => {
    expect(
      computeAnalysisInProgressState({
        latestAttempts: [],
        diagnosedProblemsByAttempt: {},
      }),
    ).toEqual({ isInProgress: false });
  });

  it('result null인 attempt는 items에서 제외', () => {
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', [1, 2]);
    const noResult = { ...a, result: null };
    expect(
      computeAnalysisInProgressState({
        latestAttempts: [noResult],
        diagnosedProblemsByAttempt: { a1: {} },
      }),
    ).toEqual({ isInProgress: false });
  });

  it('wrongProblemNumbers 빈 attempt → items에서 제외', () => {
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', []);
    expect(
      computeAnalysisInProgressState({
        latestAttempts: [a],
        diagnosedProblemsByAttempt: { a1: {} },
      }),
    ).toEqual({ isInProgress: false });
  });

  it('1건 입력, 진단 미완 → items.length 1', () => {
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', [1, 2, 3]);
    const state = computeAnalysisInProgressState({
      latestAttempts: [a],
      diagnosedProblemsByAttempt: { a1: { 1: w('w_x') } },
    });
    expect(state.isInProgress).toBe(true);
    if (!state.isInProgress) return;
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({
      examId: 'exam-A',
      attemptId: 'a1',
      noteCount: 1,
      totalNotes: 3,
    });
    expect(state.items[0].diagnosedNotes).toEqual([
      { problemNumber: 1, weaknessId: w('w_x') },
    ]);
  });

  it('3건 입력, 모두 진단 미완 → items.length 3, 입력 순서 유지', () => {
    const c = attempt('exam-C', 'c1', '2026-05-03T00:00:00Z', [1]);
    const b = attempt('exam-B', 'b1', '2026-05-02T00:00:00Z', [1]);
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', [1]);
    const state = computeAnalysisInProgressState({
      latestAttempts: [c, b, a],
      diagnosedProblemsByAttempt: { c1: {}, b1: {}, a1: {} },
    });
    expect(state.isInProgress).toBe(true);
    if (!state.isInProgress) return;
    expect(state.items.map((i) => i.attemptId)).toEqual(['c1', 'b1', 'a1']);
  });

  it('3건 입력, 그중 1건은 모두 진단 완료 → items.length 2 (완료 attempt 제외)', () => {
    const c = attempt('exam-C', 'c1', '2026-05-03T00:00:00Z', [1, 2]);
    const b = attempt('exam-B', 'b1', '2026-05-02T00:00:00Z', [1]); // 모두 완료
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', [1]);
    const state = computeAnalysisInProgressState({
      latestAttempts: [c, b, a],
      diagnosedProblemsByAttempt: {
        c1: { 1: w('w_x') },
        b1: { 1: w('w_y') },
        a1: {},
      },
    });
    expect(state.isInProgress).toBe(true);
    if (!state.isInProgress) return;
    expect(state.items.map((i) => i.attemptId)).toEqual(['c1', 'a1']);
  });

  it('모든 attempt 진단 완료 → isInProgress: false', () => {
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', [1]);
    expect(
      computeAnalysisInProgressState({
        latestAttempts: [a],
        diagnosedProblemsByAttempt: { a1: { 1: w('w_x') } },
      }),
    ).toEqual({ isInProgress: false });
  });

  it('diagnosedProblemsByAttempt에 키가 없는 attempt → 진단 0건으로 처리', () => {
    const a = attempt('exam-A', 'a1', '2026-05-01T00:00:00Z', [1, 2]);
    const state = computeAnalysisInProgressState({
      latestAttempts: [a],
      diagnosedProblemsByAttempt: {}, // a1 키 없음
    });
    expect(state.isInProgress).toBe(true);
    if (!state.isInProgress) return;
    expect(state.items[0].noteCount).toBe(0);
    expect(state.items[0].diagnosedNotes).toEqual([]);
  });
});
```

- [ ] **Step 3.2: 테스트 실행 — RED 확인**

Run: `npx jest features/quiz/exam/__tests__/exam-analysis-in-progress.test.ts`

Expected: FAIL — 신규 시그니처(`latestAttempts`, `diagnosedProblemsByAttempt`, `items`)는 아직 미구현.

---

## Task 4: exam-analysis-in-progress — 구현 (GREEN) + caller 동기화

**Files:**
- Modify: `features/quiz/exam/exam-analysis-in-progress.ts`
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts` (분석 상태 계산 블록 + render branch)
- Modify: `features/history/hooks/use-history-screen.ts:139-148`

- [ ] **Step 4.1: exam-analysis-in-progress.ts 재작성**

`features/quiz/exam/exam-analysis-in-progress.ts` 전체를 다음으로 교체.

```typescript
import type { WeaknessId } from '@/data/diagnosisMap';
import type { ExamResultSummary } from './types';

export type LatestExamAttemptSummary = {
  examId: string;
  attemptId: string;
  attemptDateISO: string;
  wrongProblemNumbers: number[];
  result: ExamResultSummary | null;
};

export type DiagnosedNote = {
  problemNumber: number;
  weaknessId: WeaknessId;
};

export type AnalysisInProgressItem = {
  examId: string;
  attemptId: string;
  attemptDateISO: string;
  noteCount: number;
  totalNotes: number;
  diagnosedNotes: DiagnosedNote[];
};

export type AnalysisInProgressInput = {
  latestAttempts: LatestExamAttemptSummary[];
  diagnosedProblemsByAttempt: Record<string, Record<number, WeaknessId>>;
};

export type AnalysisInProgressState =
  | { isInProgress: false }
  | { isInProgress: true; items: AnalysisInProgressItem[] };

export function computeAnalysisInProgressState(
  input: AnalysisInProgressInput,
): AnalysisInProgressState {
  const { latestAttempts, diagnosedProblemsByAttempt } = input;

  const items: AnalysisInProgressItem[] = [];
  for (const attempt of latestAttempts) {
    if (attempt.result === null) continue;
    if (attempt.wrongProblemNumbers.length === 0) continue;

    const totalNotes = attempt.wrongProblemNumbers.length;
    const diagnosed = diagnosedProblemsByAttempt[attempt.attemptId] ?? {};
    const diagnosedNotes: DiagnosedNote[] = attempt.wrongProblemNumbers
      .filter((n) => diagnosed[n] !== undefined)
      .map((n) => ({ problemNumber: n, weaknessId: diagnosed[n]! }));

    if (diagnosedNotes.length >= totalNotes) continue; // 모두 진단 완료 → 카드에서 제외

    items.push({
      examId: attempt.examId,
      attemptId: attempt.attemptId,
      attemptDateISO: attempt.attemptDateISO,
      noteCount: diagnosedNotes.length,
      totalNotes,
      diagnosedNotes,
    });
  }

  if (items.length === 0) return { isInProgress: false };
  return { isInProgress: true, items };
}
```

- [ ] **Step 4.2: use-quiz-hub-screen.ts 갱신**

`features/quiz/hooks/use-quiz-hub-screen.ts`에서:

import 블록 (라인 10-17) 변경:
```typescript
import {
  computeAnalysisInProgressState,
  type AnalysisInProgressState,
  type AnalysisInProgressItem,
  type LatestExamAttemptSummary,
} from '@/features/quiz/exam/exam-analysis-in-progress';
import { buildResumeAnalysisQueue } from '@/features/quiz/exam/build-resume-analysis-queue';
import { getDiagnosisProgress } from '@/features/quiz/exam/exam-diagnosis-progress';
import { getLatestExamAttempts } from '@/features/quiz/exam/latest-exam-attempt-store';
```

state 정의 (라인 69) 변경:
```typescript
// before
const [latestAttempt, setLatestAttempt] = useState<LatestExamAttemptSummary | null>(null);
// after
const [latestAttempts, setLatestAttempts] = useState<LatestExamAttemptSummary[]>([]);
```

`useFocusEffect` 분석 상태 계산 블록 (라인 114-146) 통째로 교체:
```typescript
useFocusEffect(
  useCallback(() => {
    const accountKey = session?.accountKey;
    let cancelled = false;
    void (async () => {
      if (!accountKey) {
        setLatestAttempts([]);
        setAnalysisState({ isInProgress: false });
        return;
      }
      const attempts = await getLatestExamAttempts(accountKey);
      if (cancelled) return;
      setLatestAttempts(attempts);
      if (attempts.length === 0) {
        setAnalysisState({ isInProgress: false });
        return;
      }
      const diagnosedProblemsByAttempt: Record<string, Record<number, import('@/data/diagnosisMap').WeaknessId>> = {};
      for (const attempt of attempts) {
        diagnosedProblemsByAttempt[attempt.attemptId] = await getDiagnosisProgress({
          examId: attempt.examId,
          attemptId: attempt.attemptId,
          attemptDateISO: attempt.attemptDateISO,
        });
        if (cancelled) return;
      }
      setAnalysisState(
        computeAnalysisInProgressState({
          latestAttempts: attempts,
          diagnosedProblemsByAttempt,
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accountKey]),
);
```

`onResumeAnalysis`는 호출 측에서 어떤 attempt를 재개할지를 인자로 받도록 변경한다 (캐러셀 카드별로 다름).

`onResumeAnalysis` (라인 198-224)를 다음과 같이 교체:
```typescript
const onResumeAnalysis = useCallback(
  (attemptId: string) => {
    const attempt = latestAttempts.find((a) => a.attemptId === attemptId);
    if (!attempt || !attempt.result) return;
    if (!analysisState.isInProgress) return;

    const item = analysisState.items.find((i) => i.attemptId === attemptId);
    if (!item) return;

    const queue = buildResumeAnalysisQueue(
      attempt.wrongProblemNumbers,
      item.diagnosedNotes,
    );
    if (queue.length === 0) return;

    hydrateResult(attempt.result);

    router.push({
      pathname: '/quiz/exam/diagnosis-session',
      params: {
        examId: attempt.examId,
        wrongProblemNumbers: JSON.stringify(queue),
        startIndex: '0',
        totalNotes: String(attempt.wrongProblemNumbers.length),
        diagnosedCountBefore: String(item.diagnosedNotes.length),
      },
    });
  },
  [latestAttempts, analysisState, hydrateResult],
);
```

타입 export(`UseQuizHubScreenResult`)에서 `onResumeAnalysis` 시그니처를 `(attemptId: string) => void`로 갱신. 라인 41:
```typescript
// before
onResumeAnalysis: () => void;
// after
onResumeAnalysis: (attemptId: string) => void;
```

- [ ] **Step 4.3: use-history-screen.ts 갱신**

`features/history/hooks/use-history-screen.ts`의 `computeAnalysisInProgressState` 호출 블록 (라인 138-149)을 다음으로 변경:

```typescript
// before
setAnalysisState(
  computeAnalysisInProgressState({
    latestAttempt: {
      examId: latest.sourceEntityId ?? '',
      attemptId: latest.id,
      attemptDateISO: latest.completedAt,
      wrongProblemNumbers,
      result: resultSummary,
    },
    diagnosedProblems: diagnosed,
  }),
);
// after
setAnalysisState(
  computeAnalysisInProgressState({
    latestAttempts: [
      {
        examId: latest.sourceEntityId ?? '',
        attemptId: latest.id,
        attemptDateISO: latest.completedAt,
        wrongProblemNumbers,
        result: resultSummary,
      },
    ],
    diagnosedProblemsByAttempt: { [latest.id]: diagnosed },
  }),
);
```

History 화면이 어떤 데이터를 캐러셀로 노출하는지는 본 plan 범위 밖. 단일 attempt 시그니처를 유지하기 위해 길이 1 배열로 wrap만 한다. 이후 분석 상태를 사용하는 자리(`AnalysisInProgressState`를 소비하는 코드)도 `items[0]` 기준으로 갱신한다.

`features/history/hooks/use-history-screen.ts` 내에서 `analysisState.examId`, `analysisState.noteCount` 등 단수 필드를 직접 참조하는 코드가 있다면 `analysisState.items[0]?.examId` 패턴으로 변경. (변경 자리는 grep 후 확정.)

```bash
grep -n "analysisState\.\(examId\|attemptId\|noteCount\|totalNotes\|diagnosedNotes\)" \
  features/history/hooks/use-history-screen.ts
```

각 매치를 `analysisState.items[0]?.<field>` 또는 `analysisState.isInProgress ? analysisState.items[0].<field> : <fallback>` 형태로 대체.

- [ ] **Step 4.4: jest 실행 — 신규 테스트 GREEN, 회귀 없음**

Run: `npx jest features/quiz/exam/__tests__/exam-analysis-in-progress.test.ts`

Expected: PASS, 8개 케이스 전부.

Run: `npx jest`

Expected: 전체 GREEN.

- [ ] **Step 4.5: typecheck**

Run: `npx tsc --noEmit`

Expected: 에러 0건.

- [ ] **Step 4.6: 커밋**

```bash
git add features/quiz/exam/exam-analysis-in-progress.ts \
        features/quiz/exam/__tests__/exam-analysis-in-progress.test.ts \
        features/quiz/hooks/use-quiz-hub-screen.ts \
        features/history/hooks/use-history-screen.ts
git commit -m "$(cat <<'EOF'
refactor(exam): computeAnalysisInProgressState 입출력 시그니처 배열화

- 입력: latestAttempt(단수) + diagnosedProblems → latestAttempts[] + diagnosedProblemsByAttempt
- 출력: 단수 필드 → items[] (각 attempt별 noteCount/totalNotes/diagnosedNotes)
- 모두 진단 완료된 attempt는 items에서 제외
- onResumeAnalysis는 attemptId 인자로 분기
- 호출처 use-quiz-hub-screen, use-history-screen 동기화
EOF
)"
```

---

## Task 5: 캐러셀 컴포넌트 — exam-analysis-resume-carousel

**Files:**
- Create: `features/quiz/exam/components/exam-analysis-resume-carousel.tsx`

캐러셀 패턴은 `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx`의 `FlatList horizontal pagingEnabled bounces={false} showsHorizontalScrollIndicator={false}` 설정을 그대로 재사용한다.

`ExamAnalysisResumeCard`는 무수정. 컴포넌트 자체는 props (`examTitle`, `noteCount`, `totalNotes`, `onPress`)를 받는다.

도트 인디케이터는 별도 컴포넌트 분리 안 함 — 본 파일 안에 inline 함수로 작성.

- [ ] **Step 5.1: 컴포넌트 작성**

```tsx
// features/quiz/exam/components/exam-analysis-resume-carousel.tsx
import { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { BrandColors, BrandSpacing } from '@/constants/brand';

import { ExamAnalysisResumeCard } from './exam-analysis-resume-card';

export type ExamAnalysisResumeCarouselItem = {
  attemptId: string;
  examTitle: string;
  noteCount: number;
  totalNotes: number;
};

export type ExamAnalysisResumeCarouselProps = {
  items: ExamAnalysisResumeCarouselItem[];
  onPressItem: (attemptId: string) => void;
};

export function ExamAnalysisResumeCarousel({
  items,
  onPressItem,
}: ExamAnalysisResumeCarouselProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  // 캐러셀 페이지 폭 = windowWidth - 좌우 페이지 패딩 (홈 스크롤뷰 padding과 일치)
  // FlatList가 차지하는 부모 컨테이너 너비를 직접 측정해 페이지 단위 계산.
  const onMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number }; layoutMeasurement: { width: number } } }) => {
      const pageWidth = e.nativeEvent.layoutMeasurement.width;
      if (pageWidth <= 0) return;
      const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      setActiveIndex(Math.max(0, Math.min(items.length - 1, idx)));
    },
    [items.length],
  );

  if (items.length === 0) return null;

  // 단일 항목: 캐러셀/도트 없이 카드 1개만 (현재 동작과 동일)
  if (items.length === 1) {
    const only = items[0];
    return (
      <ExamAnalysisResumeCard
        examTitle={only.examTitle}
        noteCount={only.noteCount}
        totalNotes={only.totalNotes}
        onPress={() => onPressItem(only.attemptId)}
      />
    );
  }

  return (
    <View>
      <FlatList
        data={items}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(it) => it.attemptId}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => (
          <View style={{ width: windowWidth - BrandSpacing.md * 2 }}>
            <ExamAnalysisResumeCard
              examTitle={item.examTitle}
              noteCount={item.noteCount}
              totalNotes={item.totalNotes}
              onPress={() => onPressItem(item.attemptId)}
            />
          </View>
        )}
      />
      <View style={styles.dots}>
        {items.map((it, idx) => (
          <View
            key={it.attemptId}
            style={[
              styles.dot,
              idx === activeIndex ? styles.dotActive : null,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: BrandSpacing.sm,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.examForestBorder,
  },
  dotActive: {
    backgroundColor: BrandColors.primary,
    width: 16,
  },
});
```

**주의:** `BrandSpacing.md`가 페이지 좌우 padding과 다를 수 있다. 다음 단계에서 실제 부모 padding을 확인하고 맞춘다 (Step 6에서 컴포넌트 사용 시 부모 layout을 grep으로 확인).

- [ ] **Step 5.2: typecheck**

Run: `npx tsc --noEmit`

Expected: 에러 0건.

- [ ] **Step 5.3: 커밋**

```bash
git add features/quiz/exam/components/exam-analysis-resume-carousel.tsx
git commit -m "feat(exam): exam-analysis-resume-carousel 컴포넌트 신규

items 배열 길이 1이면 단일 카드 렌더(현재 동작 동일), 2개 이상이면
horizontal swipe + 도트 인디케이터. ExamAnalysisResumeCard는 무수정 재사용."
```

---

## Task 6: 홈 화면 view에 캐러셀 연결

**Files:**
- Modify: `features/quiz/components/quiz-hub-screen-view.tsx:17,222-235`

- [ ] **Step 6.1: import 변경**

라인 17 부근에서 기존:
```typescript
import { ExamAnalysisResumeCard } from '@/features/quiz/exam/components/exam-analysis-resume-card';
```

다음으로 변경:
```typescript
import {
  ExamAnalysisResumeCarousel,
  type ExamAnalysisResumeCarouselItem,
} from '@/features/quiz/exam/components/exam-analysis-resume-carousel';
```

`ExamAnalysisResumeCard` import는 제거 (carousel 내부에서 사용).

- [ ] **Step 6.2: 렌더 분기 교체**

라인 222-229의 `ExamAnalysisResumeCard` 렌더 블록을 다음으로 교체:

```tsx
{showAnalysisResumeCard && analysisState.isInProgress ? (
  <ExamAnalysisResumeCarousel
    items={analysisState.items.map<ExamAnalysisResumeCarouselItem>((item) => ({
      attemptId: item.attemptId,
      examTitle: getExamTitle(item.examId),
      noteCount: item.noteCount,
      totalNotes: item.totalNotes,
    }))}
    onPressItem={onResumeAnalysis}
  />
) : null}
```

- [ ] **Step 6.3: CollectedNotesList 조정**

라인 230-235의 `CollectedNotesList` 블록은 단일 attempt의 `diagnosedNotes`를 받았었다. 다중 attempt에서는 어느 attempt의 노트를 보여줄지 모호하므로, **첫 번째(가장 최근) attempt의 노트만 표시**한다.

```tsx
{showCollectedNotes && analysisState.isInProgress && analysisState.items[0] ? (
  <CollectedNotesList
    notes={analysisState.items[0].diagnosedNotes}
    resolveLabel={resolveLabel}
  />
) : null}
```

이 행동은 spec의 "Out of Scope: 4건 이상 미완료 시험을 추적하는 기능"과 부합한다. 캐러셀 active page에 따라 노트 리스트가 바뀌는 동기화는 본 plan 범위 밖 (현재 캐러셀은 active index를 자체 state로 보유하므로, 외부 노출이 필요하면 후속 작업).

- [ ] **Step 6.4: BrandSpacing 정합성 확인**

캐러셀 페이지 폭이 부모 ScrollView/Container의 좌우 padding과 어긋나면 카드가 짤려 보인다. 부모 padding을 확인:

```bash
grep -n "padding\|paddingHorizontal" features/quiz/components/quiz-hub-screen-view.tsx | head -10
```

부모가 `paddingHorizontal: BrandSpacing.md`이면 Task 5의 컴포넌트는 그대로 OK. 다르면 `exam-analysis-resume-carousel.tsx`의 `windowWidth - BrandSpacing.md * 2` 계산을 부모 실제 padding 값으로 갱신한다. 부모 padding이 그대로 캐러셀에 전달되지 않는 구조라면 `onLayout`으로 컨테이너 폭을 측정해 사용한다.

대안 (가장 안전): 캐러셀 컴포넌트가 `onLayout`으로 자체 폭을 측정해 페이지 단위로 사용하도록 변경.

```tsx
// exam-analysis-resume-carousel.tsx 본체에 추가
const [containerWidth, setContainerWidth] = useState(0);
// ... return의 외부 View에 onLayout
<View onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
  {containerWidth > 0 ? (
    <FlatList ... />
  ) : null}
</View>
// renderItem에서 width를 `containerWidth`로 사용
```

`useWindowDimensions` 의존을 제거하고 부모 폭에 자동 적응하게 한다. 이 변경을 Step 5의 코드에 적용하려면 본 단계에서 `exam-analysis-resume-carousel.tsx`도 수정한다.

- [ ] **Step 6.5: typecheck + jest**

Run: `npx tsc --noEmit && npx jest`

Expected: 둘 다 GREEN.

- [ ] **Step 6.6: 커밋**

```bash
git add features/quiz/components/quiz-hub-screen-view.tsx \
        features/quiz/exam/components/exam-analysis-resume-carousel.tsx
git commit -m "feat(home): 분석 이어보기 캐러셀을 quiz-hub-screen-view에 연결

items.length 1이면 단일 카드(회귀 0), 2-3이면 swipe 캐러셀.
CollectedNotesList는 가장 최근 attempt의 노트만 표시 (캐러셀 active 동기화는 후속)."
```

---

## Task 7: 실기기 스모크 테스트

**Files:** 없음 (수동 검증)

- [ ] **Step 7.1: prebuild + 시뮬레이터 빌드**

```bash
npx expo prebuild --clean
npx expo run:ios
```

- [ ] **Step 7.2: 시나리오 — 시험 1건만 (회귀 검증)**

1. 새 계정 또는 기존 단일 attempt 상태에서 앱 진입
2. 모의고사 1개 응시 → 결과 화면 → 1-2 문제 분석 → 홈 복귀
3. 홈에서 "이어서 분석하기" 카드가 **1개만** 보이고 도트 인디케이터 **없음** (단일 카드 렌더)
4. 카드 탭 → 분석 화면 진입 → 정상 동작

- [ ] **Step 7.3: 시나리오 — 시험 2건 (다중 카드 검증)**

1. Step 7.2의 상태에서 시험 B를 새로 응시 → 2-3 문제 분석 → 홈 복귀
2. 홈에 카드가 보이고 **도트 2개** 표시
3. 첫 페이지 = 시험 B (가장 최근), 우측 스와이프 → 두 번째 페이지 = 시험 A
4. 각 카드를 탭하면 해당 시험의 분석 세션이 열리는지 확인

- [ ] **Step 7.4: 시나리오 — 마이그레이션**

1. 본 작업 직전 빌드(단일 객체 저장 시점)에서 분석 미완료 1건이 있는 상태로 종료
2. 신 빌드로 업데이트 진입 (시뮬레이터: 앱 다시 빌드, 데이터 보존 모드)
3. 홈 카드가 **1개로 정상 보존**, 도트 없음, 탭 시 분석 재개 가능

- [ ] **Step 7.5: 시나리오 — 4번째 시험으로 가장 오래된 것 drop**

1. 시험 A, B, C 순으로 미완료 분석 3건 만든다 (캐러셀 도트 3개)
2. 시험 D 응시 → 분석 1문제 → 홈
3. 도트 3개 그대로, 페이지는 D, C, B 순. 시험 A 카드는 사라짐
4. 시험 탭 → 시험 A 결과 화면 직접 진입 → "약점 분석" 진행률 그대로 (= `exam-diagnosis-progress` 데이터 보존 확인)

- [ ] **Step 7.6: 회귀 — 분석 완료 시 카드 자동 제거**

1. 어느 한 카드의 분석을 끝까지 완료
2. 홈 복귀 → 해당 카드가 사라짐. 남은 게 1건이면 도트 없는 단일 카드, 0건이면 카드 영역 자체 비표시.

> **참고:** Step 7.6은 `removeLatestExamAttempt` 호출 시점에 의존한다. 분석 세션 완료 → result 화면 복귀 → 다음 useFocusEffect에서 `getLatestExamAttempts` 재조회. 이때 모든 wrong이 진단되면 `computeAnalysisInProgressState`가 해당 attempt를 items에서 제외하므로 카드는 자동으로 빠진다. AsyncStorage에 남아있어도 화면에서는 안 보이며, 다음 시험 응시 시 prepend 후 cap에 의해 자연 도태.
>
> 명시적인 `removeLatestExamAttempt` 호출이 필요한지 여부: 본 plan에서는 호출하지 **않는다**. 이유: items 필터링이 이미 같은 효과를 내고, AsyncStorage I/O를 추가하지 않는 것이 단순. 만약 스토리지 부피가 문제가 되면 후속 정리 작업으로 도입.

- [ ] **Step 7.7: 종료 알림 + commit**

기능 변경 없으면 추가 commit 없음. 다만 본 plan 검증이 끝났음을 PROGRESS에 기록하려면:

```bash
npm run notify:done -- "exam-resume-carousel 스모크 검증 완료"
```

---

## Task 8: 최종 정합성 점검 + push

**Files:** 없음 (검증 + push)

- [ ] **Step 8.1: 전체 typecheck + jest**

```bash
npx tsc --noEmit
npx jest
```

Expected: 둘 다 GREEN.

- [ ] **Step 8.2: 빌드 확인 (Expo)**

```bash
npx expo prebuild --clean
```

오류 없이 완료되는지 확인.

- [ ] **Step 8.3: lint (있는 경우)**

```bash
npm run lint 2>/dev/null || echo "no lint script"
```

- [ ] **Step 8.4: push + 로그**

```bash
git push origin "$(git branch --show-current)"
npm run log:commit
```

- [ ] **Step 8.5: Notion 페이지 업데이트**

Notion "DASIDA 개발 기록" 데이터베이스의 본 spec 페이지에서:
- 상태: 기획중 → 구현완료
- 구현완료일: 오늘 (2026-05-05 또는 최종 commit 일자)
- Spec/Plan 필드: GitHub permalink (커밋 해시 포함)
- 본문 `## 완료 메모`: 특이사항 (회귀 없음, 마이그레이션 OK 등)

> **참고:** 현재 Notion API 토큰이 invalid(401) 상태. 토큰 갱신 후 진행하거나 수동 업데이트.
