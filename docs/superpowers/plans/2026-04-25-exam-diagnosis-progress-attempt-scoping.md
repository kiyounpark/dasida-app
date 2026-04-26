# 모의고사 약점 분석 진행 데이터 회차별 분리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AsyncStorage에 저장되는 모의고사 약점 분석 진행 데이터를 `examId`만이 아니라 `attemptId` 기준으로도 스코프해, 같은 시험을 재응시할 때 이전 회차의 완료 상태가 새 회차 결과 화면에 잘못 표시되는 버그를 수정한다.

**Architecture:** AsyncStorage 키 포맷을 `dasida/exam-diagnosis/{examId}/{YYYY-MM-DD}-{attemptId}` 로 변경. `getDiagnosisProgress`, `markProblemDiagnosed` 시그니처가 attempt scope 객체를 받도록 변경. 옛날 키(`dasida/exam-diagnosis/{examId}` 형태)는 결과 화면 첫 진입 시 한 번 삭제하는 마이그레이션 함수 추가. `useExamDiagnosis` 훅은 `useExamSession`에서 attempt 정보를 직접 읽어 호출 사이트 변경을 최소화한다.

**Tech Stack:** TypeScript, AsyncStorage(@react-native-async-storage/async-storage), Expo/React Native, Jest(jest-expo preset)

**Spec:** `docs/superpowers/specs/2026-04-25-exam-diagnosis-progress-attempt-scoping-design.md`

---

## 변경 파일 맵

| 파일 | 역할 | 변경 유형 |
|------|------|---------|
| `features/quiz/exam/exam-diagnosis-progress.ts` | AsyncStorage I/O 로직 | Modify (시그니처 + 키 생성 로직 + 신규 purge 함수) |
| `features/quiz/exam/exam-diagnosis-progress.test.ts` | 단위 테스트 | Create |
| `features/quiz/exam/hooks/use-exam-result-screen.ts` | 결과 화면 훅 | Modify (호출 인자 + legacy purge effect) |
| `features/quiz/exam/hooks/use-exam-diagnosis.ts` | 진단 세션 훅 | Modify (markProblemDiagnosed 호출 인자) |

---

### Task 1: `exam-diagnosis-progress.ts`에 단위 테스트 작성

**Files:**
- Create: `features/quiz/exam/exam-diagnosis-progress.test.ts`

이 모듈은 순수 I/O 래퍼라 단위 테스트가 가장 효과적이다. AsyncStorage가 jest.setup.js에서 이미 mock 되어 있으므로 그대로 활용한다.

- [ ] **Step 1: 테스트 파일 생성 (실패하는 테스트)**

`features/quiz/exam/exam-diagnosis-progress.test.ts`를 새로 만들고 다음 내용을 작성한다.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getDiagnosisProgress,
  markProblemDiagnosed,
  purgeLegacyDiagnosisKey,
  type ExamDiagnosisProgress,
} from './exam-diagnosis-progress';

const mockedAsyncStorage = jest.mocked(AsyncStorage);

const SCOPE = {
  examId: 'exam-x',
  attemptId: 'attempt-123',
  // 2026-04-25 15:00 UTC == 2026-04-26 00:00 KST → 키 라벨은 KST 기준 "2026-04-26"
  attemptDateISO: '2026-04-25T15:00:00.000Z',
};
const EXPECTED_KEY = 'dasida/exam-diagnosis/exam-x/2026-04-26-attempt-123';
const LEGACY_KEY = 'dasida/exam-diagnosis/exam-x';

describe('exam-diagnosis-progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDiagnosisProgress', () => {
    it('attempt scope로 스코프된 키에서 진행 데이터를 읽는다', async () => {
      const stored: ExamDiagnosisProgress = { 5: 'formula_understanding' };
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(stored));

      const result = await getDiagnosisProgress(SCOPE);

      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith(EXPECTED_KEY);
      expect(result).toEqual(stored);
    });

    it('값이 없으면 빈 객체를 반환한다', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await getDiagnosisProgress(SCOPE);

      expect(result).toEqual({});
    });

    it('파싱 실패 시 빈 객체를 반환한다', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce('not-json');

      const result = await getDiagnosisProgress(SCOPE);

      expect(result).toEqual({});
    });

    it('다른 attemptId는 같은 examId여도 다른 키를 사용한다', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null);

      await getDiagnosisProgress({ ...SCOPE, attemptId: 'attempt-other' });

      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith(
        'dasida/exam-diagnosis/exam-x/2026-04-26-attempt-other',
      );
    });
  });

  describe('markProblemDiagnosed', () => {
    it('attempt scope로 스코프된 키에 진단 결과를 추가한다', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null);

      await markProblemDiagnosed(SCOPE, 7, 'calc_repeated_error');

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        EXPECTED_KEY,
        JSON.stringify({ 7: 'calc_repeated_error' }),
      );
    });

    it('기존 진행 데이터를 보존하며 새 진단을 머지한다', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ 3: 'formula_understanding' }),
      );

      await markProblemDiagnosed(SCOPE, 7, 'calc_repeated_error');

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        EXPECTED_KEY,
        JSON.stringify({
          3: 'formula_understanding',
          7: 'calc_repeated_error',
        }),
      );
    });
  });

  describe('purgeLegacyDiagnosisKey', () => {
    it('attemptId가 없는 옛날 키를 삭제한다', async () => {
      await purgeLegacyDiagnosisKey('exam-x');

      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith(LEGACY_KEY);
    });

    it('새 키 형태(서브패스 포함)는 건드리지 않는다', async () => {
      // removeItem('dasida/exam-diagnosis/exam-x')는 정확히 그 키만 지우고
      // 'dasida/exam-diagnosis/exam-x/2026-04-26-attempt-123' 같은 서브패스 키는
      // 별개 키이므로 영향 없다 (AsyncStorage는 정확 일치만 삭제).
      await purgeLegacyDiagnosisKey('exam-x');

      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledTimes(1);
      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith(LEGACY_KEY);
    });
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
npm test -- features/quiz/exam/exam-diagnosis-progress.test.ts
```

Expected: 컴파일 에러 또는 import 에러. `purgeLegacyDiagnosisKey`가 아직 export 되지 않았고, `getDiagnosisProgress`/`markProblemDiagnosed` 시그니처가 객체 인자가 아니므로 타입 에러 발생.

---

### Task 2: `exam-diagnosis-progress.ts` 시그니처 변경 + 신규 함수 추가

**Files:**
- Modify: `features/quiz/exam/exam-diagnosis-progress.ts` (전체 재작성)

- [ ] **Step 1: 현재 코드 확인**

`features/quiz/exam/exam-diagnosis-progress.ts`를 열어 현재 상태를 확인한다.

현재 코드:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';
import type { WeaknessId } from '@/data/diagnosisMap';

/**
 * 모의고사별 오답 진단 완료 목록을 AsyncStorage에 저장/조회한다.
 * key: dasida/exam-diagnosis/{examId}
 * value: { [problemNumber]: WeaknessId }
 */

export type ExamDiagnosisProgress = Record<number, WeaknessId>;

function storageKey(examId: string) {
  return StorageKeys.examDiagnosisProgressPrefix + examId;
}

let pendingWrite = Promise.resolve();

export async function getDiagnosisProgress(
  examId: string,
): Promise<ExamDiagnosisProgress> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(examId));
    if (!raw) return {};
    return JSON.parse(raw) as ExamDiagnosisProgress;
  } catch {
    return {};
  }
}

export async function markProblemDiagnosed(
  examId: string,
  problemNumber: number,
  weaknessId: WeaknessId,
): Promise<void> {
  pendingWrite = pendingWrite.then(async () => {
    const current = await getDiagnosisProgress(examId);
    const updated: ExamDiagnosisProgress = { ...current, [problemNumber]: weaknessId };
    await AsyncStorage.setItem(storageKey(examId), JSON.stringify(updated));
  });
  await pendingWrite;
}
```

- [ ] **Step 2: 새 시그니처로 재작성**

`features/quiz/exam/exam-diagnosis-progress.ts`의 내용을 다음으로 교체한다.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';
import type { WeaknessId } from '@/data/diagnosisMap';

/**
 * 모의고사 회차별 오답 진단 완료 목록을 AsyncStorage에 저장/조회한다.
 * key:   dasida/exam-diagnosis/{examId}/{YYYY-MM-DD}-{attemptId}
 *        - YYYY-MM-DD는 KST 기준, 라벨/디버깅용
 *        - attemptId가 회차 식별 책임
 * value: { [problemNumber]: WeaknessId }
 */

export type ExamDiagnosisProgress = Record<number, WeaknessId>;

export type ExamAttemptScope = {
  examId: string;
  attemptId: string;
  attemptDateISO: string; // ISO 타임스탬프 (예: result.completedAt)
};

function formatKstDate(iso: string): string {
  // 'en-CA' 로케일은 YYYY-MM-DD 포맷을 보장한다 (Intl 표준).
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

function storageKey(scope: ExamAttemptScope): string {
  const date = formatKstDate(scope.attemptDateISO);
  return `${StorageKeys.examDiagnosisProgressPrefix}${scope.examId}/${date}-${scope.attemptId}`;
}

function legacyStorageKey(examId: string): string {
  return StorageKeys.examDiagnosisProgressPrefix + examId;
}

let pendingWrite = Promise.resolve();

export async function getDiagnosisProgress(
  scope: ExamAttemptScope,
): Promise<ExamDiagnosisProgress> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(scope));
    if (!raw) return {};
    return JSON.parse(raw) as ExamDiagnosisProgress;
  } catch {
    return {};
  }
}

export async function markProblemDiagnosed(
  scope: ExamAttemptScope,
  problemNumber: number,
  weaknessId: WeaknessId,
): Promise<void> {
  pendingWrite = pendingWrite.then(async () => {
    const current = await getDiagnosisProgress(scope);
    const updated: ExamDiagnosisProgress = { ...current, [problemNumber]: weaknessId };
    await AsyncStorage.setItem(storageKey(scope), JSON.stringify(updated));
  });
  await pendingWrite;
}

/**
 * 옛날 키 형태(`dasida/exam-diagnosis/{examId}`, attemptId 없음)를 한 번 삭제한다.
 * 결과 화면 첫 진입 시 호출 — 진단 이력은 백엔드 attempt 레코드에 보존되므로
 * AsyncStorage 캐시 삭제는 안전하다.
 */
export async function purgeLegacyDiagnosisKey(examId: string): Promise<void> {
  await AsyncStorage.removeItem(legacyStorageKey(examId));
}
```

- [ ] **Step 3: 단위 테스트 통과 확인**

```bash
npm test -- features/quiz/exam/exam-diagnosis-progress.test.ts
```

Expected: 모든 테스트 PASS (8개).

만약 KST 날짜 포맷 테스트가 실패하면, Node가 ICU 데이터 없이 빌드되어 `toLocaleDateString`이 timezone을 무시할 가능성이 있다. 그 경우 `formatKstDate`를 다음으로 교체:

```ts
function formatKstDate(iso: string): string {
  const utcMs = new Date(iso).getTime();
  const kstMs = utcMs + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(0, 10);
}
```

- [ ] **Step 4: TypeScript 타입 체크**

```bash
npm run typecheck
```

Expected: `use-exam-result-screen.ts`와 `use-exam-diagnosis.ts`에서 호출 인자 불일치로 타입 에러 발생. 다음 Task에서 수정.

- [ ] **Step 5: Commit (테스트 + 모듈 변경 함께)**

```bash
git add features/quiz/exam/exam-diagnosis-progress.ts features/quiz/exam/exam-diagnosis-progress.test.ts
git commit -m "refactor(exam): scope diagnosis progress storage by attemptId

AsyncStorage 키에 attemptId와 KST 날짜를 포함해 같은 examId의 회차 간
진행 데이터가 섞이지 않도록 분리한다.

- 키 포맷: dasida/exam-diagnosis/{examId}/{YYYY-MM-DD}-{attemptId}
- getDiagnosisProgress/markProblemDiagnosed 시그니처에 ExamAttemptScope 도입
- purgeLegacyDiagnosisKey 추가 (옛날 키 마이그레이션용)

호출 사이트 업데이트는 후속 커밋.

Ref: docs/superpowers/specs/2026-04-25-exam-diagnosis-progress-attempt-scoping-design.md"
```

---

### Task 3: `use-exam-result-screen.ts` 호출 사이트 업데이트

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-result-screen.ts`

- [ ] **Step 1: 현재 import와 호출부 확인**

해당 파일의 다음 두 부분을 확인한다.

현재 import (line 9–13):
```ts
import {
  getDiagnosisProgress,
  type ExamDiagnosisProgress,
} from '../exam-diagnosis-progress';
```

(주의: 실제 파일에서는 별도 import 라인 — `import { getDiagnosisProgress, ... } from '../exam-diagnosis-progress';` 와 `import { getDiagnosisProgress } ... from '../exam-diagnosis-progress';` 형태 차이가 있을 수 있다. 현재 코드를 읽어 정확한 위치를 파악할 것.)

현재 호출 (line 64–69):
```ts
useFocusEffect(
  useCallback(() => {
    if (!result) return;
    getDiagnosisProgress(result.examId).then(setDiagnosedProblems);
  }, [result]),
);
```

- [ ] **Step 2: import에 `purgeLegacyDiagnosisKey` 추가**

import 라인을 다음과 같이 수정한다.

```ts
import {
  getDiagnosisProgress,
  purgeLegacyDiagnosisKey,
  type ExamDiagnosisProgress,
} from '../exam-diagnosis-progress';
```

- [ ] **Step 3: `getDiagnosisProgress` 호출을 attempt scope로 변경**

`useFocusEffect` 블록을 다음으로 수정한다.

```ts
useFocusEffect(
  useCallback(() => {
    if (!result) return;
    getDiagnosisProgress({
      examId: result.examId,
      attemptId: result.attemptId,
      attemptDateISO: result.completedAt,
    }).then(setDiagnosedProblems);
  }, [result]),
);
```

- [ ] **Step 4: 옛날 키 마이그레이션 effect 추가**

`useFocusEffect` 직전(또는 직후)에 한 번만 실행되는 effect를 추가한다. `result.examId`가 처음 셋팅될 때 1회 실행되면 충분하다.

```ts
// 옛날 키 형태(attemptId 없는 dasida/exam-diagnosis/{examId})를 한 번 정리.
// 진단 이력은 백엔드 attempt 레코드에 보존되므로 캐시 삭제는 안전하다.
useEffect(() => {
  if (!result?.examId) return;
  purgeLegacyDiagnosisKey(result.examId);
}, [result?.examId]);
```

- [ ] **Step 5: TypeScript 타입 체크**

```bash
npm run typecheck
```

Expected: 이 파일의 타입 에러는 사라지고, `use-exam-diagnosis.ts`에만 남아있다.

- [ ] **Step 6: Commit**

```bash
git add features/quiz/exam/hooks/use-exam-result-screen.ts
git commit -m "fix(exam): pass attempt scope to getDiagnosisProgress on result screen

ExamResultScreen이 결과 화면 진입 시 attemptId/completedAt까지 포함한
attempt scope로 진단 진행 데이터를 조회하도록 수정한다. 옛날 키
(attemptId 없는 형태)는 마운트 시 1회 정리한다.

Ref: docs/superpowers/specs/2026-04-25-exam-diagnosis-progress-attempt-scoping-design.md"
```

---

### Task 4: `use-exam-diagnosis.ts` 호출 사이트 업데이트

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-diagnosis.ts`

- [ ] **Step 1: 현재 코드 확인**

`useExamDiagnosis` 훅에서 `markProblemDiagnosed`를 호출하는 부분(line 286–290 근처)을 확인한다.

현재:
```ts
Promise.all([
  markProblemDiagnosed(examId, problemNumber, weaknessId),
  recordAttempt(
    buildExamDiagnosisAttemptInput({
      ...
```

`useExamSession`은 이미 같은 훅에서 `state` 형태로 사용 중이며 `state.result?.attemptId`, `state.result?.completedAt`을 가지고 있다.
(spec 결정사항: 호출 사이트 변경을 줄이기 위해 훅 파라미터를 추가하지 않고, 훅 내부에서 `useExamSession`으로 직접 읽는다.)

`use-exam-diagnosis.ts` 상단 import에 `useExamSession`이 이미 있는지 확인:

```bash
grep -n "useExamSession" features/quiz/exam/hooks/use-exam-diagnosis.ts
```

기대: `import { ... } from '../exam-session'` 형태로 이미 있을 것. 없다면 추가 필요(다음 Step에서 처리).

- [ ] **Step 2: 필요 시 `useExamSession` import 추가**

훅 상단에 다음 import가 없다면 추가한다.

```ts
import { useExamSession } from '../exam-session';
```

훅 본체 시작부에 다음을 추가한다(`useCurrentLearner` 다음 줄에 두면 자연스러움).

```ts
const { state: examState } = useExamSession();
```

(이미 동일 변수명이 쓰이고 있으면 그대로 활용. spec 의도는 attempt 정보 한 곳에서 읽기.)

- [ ] **Step 3: `markProblemDiagnosed` 호출을 attempt scope로 변경**

해당 호출을 다음으로 수정한다.

```ts
const attemptId = examState.result?.attemptId;
const attemptDateISO = examState.result?.completedAt;
if (!attemptId || !attemptDateISO) {
  // 결과 화면에서 진단 세션으로 진입하므로 result는 항상 존재한다 (방어용).
  return;
}

Promise.all([
  markProblemDiagnosed(
    { examId, attemptId, attemptDateISO },
    problemNumber,
    weaknessId,
  ),
  recordAttempt(
    buildExamDiagnosisAttemptInput({
      ...
    }),
  ),
])
```

(주의: 기존 코드의 `Promise.all` 체이닝 구조와 `.then(...)`/`.catch(...)`/`.finally(...)`는 그대로 유지. `attemptId`/`attemptDateISO` 가드만 effect 내 적절한 위치에 삽입.)

- [ ] **Step 4: TypeScript 타입 체크**

```bash
npm run typecheck
```

Expected: 에러 없이 통과.

- [ ] **Step 5: 단위 테스트 회귀 확인**

```bash
npm test -- features/quiz/exam/exam-diagnosis-progress.test.ts
```

Expected: 모든 테스트 PASS (이 단계에서 깨지면 안 됨).

- [ ] **Step 6: Commit**

```bash
git add features/quiz/exam/hooks/use-exam-diagnosis.ts
git commit -m "fix(exam): pass attempt scope to markProblemDiagnosed in diagnosis hook

useExamDiagnosis에서 진단 완료 시 markProblemDiagnosed에 attemptId와
completedAt을 함께 전달해, 회차별 진행 데이터가 분리되어 저장되도록 한다.
attempt 정보는 useExamSession에서 직접 읽어 호출 사이트 변경을 최소화한다.

Ref: docs/superpowers/specs/2026-04-25-exam-diagnosis-progress-attempt-scoping-design.md"
```

---

### Task 5: 시뮬레이터 빌드 + 수동 회귀 검증

**Files:** 없음 (디바이스/시뮬레이터 동작 확인)

> 이 PR은 패키지 추가/네이티브 변경이 없으므로 prebuild는 불필요. JS 변경만으로 충분.

- [ ] **Step 1: 시뮬레이터 실행**

```bash
npx expo run:ios
```

(이미 켜져 있으면 메트로 리로드만 해도 충분)

- [ ] **Step 2: 검증 1 — 새 회차에서 이전 회차 영향 없음**

1. 임의 모의고사 X를 1회차로 풀고 결과 화면 진입
2. 틀린 문제 하나를 "왜 틀렸지?"로 진단 완료 → 결과 화면으로 돌아오면 해당 문제만 "✓ 완료" 표시 확인
3. 같은 모의고사 X를 다시 풀어 2회차 결과 화면 진입
4. **확인**: 2회차에서 모든 틀린 문제가 "왜 틀렸지?" 상태(undone)로 시작하는지 (이전 회차의 ✓ 완료가 잘못 노출되지 않는지)
5. 2회차에서 진단을 진행 → 그 문제만 ✓ 완료로 표시되는지 확인

- [ ] **Step 3: 검증 2 — 회차 내 진행 상태 유지**

1. 결과 화면 진입 → 한 문제 분석 완료 → 결과 화면 자동 복귀 (`useFocusEffect` 갱신)
2. 다른 화면(홈 탭 등)으로 이동했다가 다시 결과 화면으로 돌아오기
3. **확인**: 같은 회차 내에서 이미 분석한 문제가 여전히 "✓ 완료"로 보이는지

- [ ] **Step 4: 검증 3 — 옛날 키 마이그레이션 (선택, 옛 빌드를 가진 환경에서만 가능)**

마이그레이션 검증은 옛 형태 키가 실제로 디스크에 존재할 때만 의미 있다. 다음 중 한 가지로 시뮬레이션:

- (가능 시) 마이그레이션 코드 적용 전 빌드를 한 번 실행해 옛날 키를 만들어둔 뒤, 새 빌드로 결과 화면 진입 → React Native Debugger 또는 임시 `console.log`로 `dasida/exam-diagnosis/{examId}` 키가 사라졌는지 확인
- 또는 단위 테스트(Task 1의 `purgeLegacyDiagnosisKey` 케이스)로 갈음

**확인**: 옛날 키 삭제 후에도 새 회차의 진행 데이터(서브패스 키)는 그대로 유지되는지

- [ ] **Step 5: TypeScript + 린트 + 전체 테스트 최종 확인**

```bash
npm run typecheck && npm run lint && npm test -- features/quiz/exam
```

Expected: 모두 PASS.

---

## Self-Review

**Spec coverage:**
- [x] AsyncStorage 키 포맷 변경 (`dasida/exam-diagnosis/{examId}/{YYYY-MM-DD}-{attemptId}`) → Task 2
- [x] `getDiagnosisProgress` / `markProblemDiagnosed` 시그니처에 attempt scope 도입 → Task 2
- [x] `purgeLegacyDiagnosisKey` 신규 함수 → Task 2 + Task 1 테스트
- [x] `use-exam-result-screen.ts`에서 attempt 정보 전달 + legacy purge → Task 3
- [x] `use-exam-diagnosis.ts`에서 `useExamSession` 통해 attempt 정보 읽어 전달 → Task 4
- [x] 옛날 키 마이그레이션: 첫 진입 시 삭제 → Task 3 (effect 추가) + Task 1 (단위 테스트)
- [x] 오래된 키 정리 정책 없음 (YAGNI) → 코드 변경 없음, spec에 명시
- [x] 검증 항목 (회차 분리 / 회차 내 유지 / 옛날 키 정리 / TypeScript) → Task 5 + Task 1

**Placeholder 스캔:** TBD/TODO 없음. 모든 Step에 실행 가능한 코드/명령 포함.

**Type consistency:**
- `ExamAttemptScope` 타입을 Task 2에서 정의 → Task 3, Task 4 호출부에서 `{ examId, attemptId, attemptDateISO }` 객체로 일관되게 사용
- `attemptDateISO`는 `result.completedAt`(string)에서 파생 — `ExamResultSummary.completedAt` 타입(`string`)과 일치
- `purgeLegacyDiagnosisKey(examId: string)` — Task 2 정의와 Task 3 호출 일치
- `getDiagnosisProgress(scope)` 반환 타입 `Promise<ExamDiagnosisProgress>` — `setDiagnosedProblems` state setter와 호환
