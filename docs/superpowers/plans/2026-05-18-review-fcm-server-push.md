# 복습 알림 서버 주도 푸시 (2단계, FCM) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인증 사용자에게 앱 실행과 무관하게 서버(Expo Push)가 KST 아침/저녁으로 "오늘 due 미완료 복습" 알림을 보내고, 인증 사용자의 로컬 알림은 비활성화해 중복을 차단한다.

**Architecture:** 1단계가 만든 task별 `users/{accountKey}/reviewTasks` 문서를 `onSchedule`(KST 7:30/20:00) 함수가 `collectionGroup`으로 조회 → accountKey dedupe → 슬롯 가드 → `users/{accountKey}.pushTokens`로 Expo Push API 배치 발송. 클라는 인증 사용자만 토큰 등록 + 로컬 예약 비활성·기존 예약 1회 취소. 발송 on/off는 Firestore `config/notifications.enabled` 런타임 게이트.

**Tech Stack:** Firebase Functions v2 (`onRequest`, `onSchedule`), firebase-admin Firestore, zod, Expo Push API(`exp.host`), expo-notifications/expo-constants(클라), node:test(functions 단위), jest(클라 단위).

**Spec:** `docs/superpowers/specs/2026-05-18-review-fcm-server-push-design.md` (커밋 `fbed02b`)

---

## 설계 결정: 카피 공유 (스펙 §3.4 보정)

스펙은 "카피를 순수 함수로 추출해 클라/서버 공유"를 의도했으나, `functions/`는
앱과 **별도 패키지/tsconfig**라 `features/` 직접 import는 빌드 인프라 변경을
요구한다(YAGNI 위반·범위 누수). 대신:

- 클라 카피 로직을 `features/quiz/notifications/review-reminder-copy.ts`로 추출.
- 서버에 **동일 로직** `functions/src/review-reminder-copy.ts`를 둔다.
- **드리프트 방지는 빌드 결합이 아니라 테스트로**: 양쪽 테스트가 동일한
  기대 문자열 상수를 검증한다(문자열은 스펙에 고정). 한쪽 변경 시 테스트가
  깨지도록 기대값을 명시.

이 결정은 의도적이며, 크로스 패키지 import의 빌드 리스크를 회피한다.

## File Structure

**서버 (functions/src/)**
- `review-reminder-core.ts` (신규) — 순수 로직: 날짜 경계 계산, accountKey
  dedupe, 슬롯 가드 판정, 토큰 upsert/prune, 무효 토큰 제거, Expo 메시지
  청크, zod 스키마. 단위 테스트 대상.
- `review-reminder-copy.ts` (신규) — 순수: 슬롯/라벨 → {title, body}.
- `push-token-store.ts` (신규) — Firestore I/O: `users/{accountKey}` 문서의
  `pushTokens` 읽기/쓰기. 코어 순수 함수를 사용.
- `register-push-token.ts` (신규) — `onRequest` 얇은 핸들러.
- `send-review-reminders.ts` (신규) — `onSchedule` 2개(morning/evening)
  + 오케스트레이터(게이트 읽기·collectionGroup·발송·정리).
- `expo-push-client.ts` (신규) — `exp.host` fetch 얇은 래퍼.
- `index.ts` (수정) — export 3건 추가.

**클라 (features/)**
- `features/quiz/notifications/review-reminder-copy.ts` (신규) — 순수 카피.
- `features/quiz/notifications/review-notification-scheduler.ts` (수정) —
  카피 로직을 위 모듈 사용으로 치환.
- `features/learning/register-push-token-api.ts` (신규) — 토큰 등록 API
  클라이언트.
- `features/quiz/hooks/use-notification-opt-in.ts` (수정) — 인증 분기:
  토큰 등록 + 기존 `review_*` 1회 취소 + 로컬 예약 스킵.
- `constants/env.ts` (수정) — `EXPO_PUBLIC_REGISTER_PUSH_TOKEN_URL`.

**테스트**
- `functions/tests/review-reminder-core.test.ts` (신규, node:test)
- `functions/tests/review-reminder-copy.test.ts` (신규, node:test)
- `features/quiz/notifications/review-reminder-copy.test.ts` (신규, jest)
- `features/learning/register-push-token-api.test.ts` (신규, jest)
- `features/quiz/hooks/use-notification-opt-in.test.ts` (수정, jest)

**테스트 명령**
- functions: `cd functions && npm test` (tsc test 빌드 후 `node --test`
  로 전체 실행. 함수 미정의 시 컴파일 에러로 FAIL — 1단계와 동일 관례.)
- 클라: `npx jest <path> --runTestsByPath`

---

## Task 1: 서버 — 날짜 경계 + dedupe 순수 함수

**Files:**
- Create: `functions/src/review-reminder-core.ts`
- Test: `functions/tests/review-reminder-core.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`functions/tests/review-reminder-core.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeReminderDateBounds,
  dedupeAccountKeys,
} from '../src/review-reminder-core';

// scheduledFor는 UTC ...Z ISO (addDays = new Date().toISOString()).
// 현행 로컬 due 판정 scheduledFor.slice(0,10) === todayLabel 과 1:1.
test('computeReminderDateBounds: 라벨 D 기준 [D T00:00:00.000Z, Dnext T00:00:00.000Z)', () => {
  const { gte, lt } = computeReminderDateBounds('2026-05-19');
  assert.equal(gte, '2026-05-19T00:00:00.000Z');
  assert.equal(lt, '2026-05-20T00:00:00.000Z');
});

test('computeReminderDateBounds: 월말 경계 롤오버', () => {
  const { gte, lt } = computeReminderDateBounds('2026-05-31');
  assert.equal(gte, '2026-05-31T00:00:00.000Z');
  assert.equal(lt, '2026-06-01T00:00:00.000Z');
});

test('경계 의미: UTC 15:00~23:59 완료 task가 누락되지 않음', () => {
  // 완료 2026-05-18T16:00Z → day1 scheduledFor 2026-05-19T16:00:00.000Z.
  // 로컬은 slice(0,10)="2026-05-19"를 due로 봄. 같은 라벨 범위에 포함돼야.
  const { gte, lt } = computeReminderDateBounds('2026-05-19');
  const scheduledFor = '2026-05-19T16:00:00.000Z';
  assert.equal(scheduledFor >= gte && scheduledFor < lt, true);
});

test('dedupeAccountKeys: 중복 제거, 입력 순서 보존', () => {
  assert.deepEqual(
    dedupeAccountKeys(['user:a', 'user:b', 'user:a', 'user:c']),
    ['user:a', 'user:b', 'user:c'],
  );
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd functions && npm test`
Expected: FAIL — `review-reminder-core` 모듈/`computeReminderDateBounds` 미존재로 tsc 컴파일 에러.

- [ ] **Step 3: 최소 구현**

`functions/src/review-reminder-core.ts`:

```ts
export type ReminderSlot = 'morning' | 'evening';

export function computeReminderDateBounds(todayLabel: string): {
  gte: string;
  lt: string;
} {
  const [y, m, d] = todayLabel.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return { gte: start.toISOString(), lt: next.toISOString() };
}

export function dedupeAccountKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd functions && npm test`
Expected: PASS (4 tests).

- [ ] **Step 5: 커밋**

```bash
git add functions/src/review-reminder-core.ts functions/tests/review-reminder-core.test.ts
git commit -m "feat(fcm): 복습 알림 날짜 경계+dedupe 순수 함수"
```

---

## Task 2: 서버 — 슬롯 가드 + 무효 토큰 제거 순수 함수

**Files:**
- Modify: `functions/src/review-reminder-core.ts`
- Test: `functions/tests/review-reminder-core.test.ts` (추가)

- [ ] **Step 1: 실패 테스트 추가**

`functions/tests/review-reminder-core.test.ts` 하단에 추가:

```ts
import {
  shouldSendForSlot,
  recordSlotSent,
  removeInvalidTokens,
  type ReminderSentLog,
} from '../src/review-reminder-core';

test('shouldSendForSlot: 미발송이면 true', () => {
  assert.equal(shouldSendForSlot(undefined, '2026-05-19', 'morning'), true);
  assert.equal(shouldSendForSlot({}, '2026-05-19', 'morning'), true);
});

test('shouldSendForSlot: 같은 날짜+슬롯 이미 발송이면 false', () => {
  const log: ReminderSentLog = { '2026-05-19': { morning: true } };
  assert.equal(shouldSendForSlot(log, '2026-05-19', 'morning'), false);
  assert.equal(shouldSendForSlot(log, '2026-05-19', 'evening'), true);
});

test('recordSlotSent: 슬롯 기록 + 오늘/어제만 유지(가지치기)', () => {
  const log: ReminderSentLog = {
    '2026-05-10': { morning: true, evening: true },
    '2026-05-18': { morning: true },
  };
  const next = recordSlotSent(log, '2026-05-19', 'evening');
  assert.equal(next['2026-05-19'].evening, true);
  assert.equal(next['2026-05-18'].morning, true); // 어제 유지
  assert.equal(next['2026-05-10'], undefined); // 오래된 것 제거
});

test('removeInvalidTokens: DeviceNotRegistered 토큰만 제거', () => {
  const tokens = [
    { token: 'ExponentPushToken[A]', platform: 'ios' as const, updatedAt: '2026-05-18T00:00:00.000Z' },
    { token: 'ExponentPushToken[B]', platform: 'android' as const, updatedAt: '2026-05-18T00:00:00.000Z' },
  ];
  const result = removeInvalidTokens(tokens, new Set(['ExponentPushToken[B]']));
  assert.deepEqual(result.map((t) => t.token), ['ExponentPushToken[A]']);
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd functions && npm test`
Expected: FAIL — `shouldSendForSlot` 등 미존재 컴파일 에러.

- [ ] **Step 3: 최소 구현**

`functions/src/review-reminder-core.ts`에 추가:

```ts
export type ReminderSentLog = Record<
  string,
  { morning?: true; evening?: true }
>;

export type PushTokenRecord = {
  token: string;
  platform: 'ios' | 'android';
  updatedAt: string;
};

export function shouldSendForSlot(
  log: ReminderSentLog | undefined,
  dateLabel: string,
  slot: ReminderSlot,
): boolean {
  return !log?.[dateLabel]?.[slot];
}

export function recordSlotSent(
  log: ReminderSentLog | undefined,
  dateLabel: string,
  slot: ReminderSlot,
): ReminderSentLog {
  const base: ReminderSentLog = { ...(log ?? {}) };
  base[dateLabel] = { ...(base[dateLabel] ?? {}), [slot]: true };

  // 오늘(dateLabel)과 어제만 유지.
  const [y, m, d] = dateLabel.split('-').map(Number);
  const yesterday = new Date(Date.UTC(y, m - 1, d - 1))
    .toISOString()
    .slice(0, 10);
  const keep = new Set([dateLabel, yesterday]);
  for (const key of Object.keys(base)) {
    if (!keep.has(key)) delete base[key];
  }
  return base;
}

export function removeInvalidTokens(
  tokens: PushTokenRecord[],
  invalid: Set<string>,
): PushTokenRecord[] {
  return tokens.filter((t) => !invalid.has(t.token));
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd functions && npm test`
Expected: PASS (8 tests 누적).

- [ ] **Step 5: 커밋**

```bash
git add functions/src/review-reminder-core.ts functions/tests/review-reminder-core.test.ts
git commit -m "feat(fcm): 슬롯 가드+무효 토큰 제거 순수 함수"
```

---

## Task 3: 서버 — 토큰 upsert/prune + 등록 스키마

**Files:**
- Modify: `functions/src/review-reminder-core.ts`
- Test: `functions/tests/review-reminder-core.test.ts` (추가)

- [ ] **Step 1: 실패 테스트 추가**

```ts
import {
  upsertPushToken,
  RegisterPushTokenRequestSchema,
  MAX_PUSH_TOKENS,
} from '../src/review-reminder-core';

test('upsertPushToken: 신규 추가', () => {
  const next = upsertPushToken([], {
    token: 'ExponentPushToken[A]',
    platform: 'ios',
    updatedAt: '2026-05-18T00:00:00.000Z',
  });
  assert.equal(next.length, 1);
});

test('upsertPushToken: 동일 token이면 updatedAt만 갱신(중복 추가 안 함)', () => {
  const prev = [
    { token: 'ExponentPushToken[A]', platform: 'ios' as const, updatedAt: '2026-05-10T00:00:00.000Z' },
  ];
  const next = upsertPushToken(prev, {
    token: 'ExponentPushToken[A]',
    platform: 'ios',
    updatedAt: '2026-05-18T00:00:00.000Z',
  });
  assert.equal(next.length, 1);
  assert.equal(next[0].updatedAt, '2026-05-18T00:00:00.000Z');
});

test('upsertPushToken: 상한 초과 시 가장 오래된 updatedAt 제거', () => {
  const prev = Array.from({ length: MAX_PUSH_TOKENS }, (_, i) => ({
    token: `ExponentPushToken[${i}]`,
    platform: 'ios' as const,
    updatedAt: `2026-05-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
  }));
  const next = upsertPushToken(prev, {
    token: 'ExponentPushToken[NEW]',
    platform: 'android',
    updatedAt: '2026-06-01T00:00:00.000Z',
  });
  assert.equal(next.length, MAX_PUSH_TOKENS);
  assert.equal(next.some((t) => t.token === 'ExponentPushToken[NEW]'), true);
  assert.equal(next.some((t) => t.token === 'ExponentPushToken[0]'), false);
});

test('RegisterPushTokenRequestSchema: 정상 통과', () => {
  const r = RegisterPushTokenRequestSchema.safeParse({
    accountKey: 'user:abc',
    token: 'ExponentPushToken[xxxxxxxx]',
    platform: 'ios',
  });
  assert.equal(r.success, true);
});

test('RegisterPushTokenRequestSchema: 형식 위반 reject', () => {
  assert.equal(
    RegisterPushTokenRequestSchema.safeParse({
      accountKey: 'user:abc',
      token: 'not-an-expo-token',
      platform: 'ios',
    }).success,
    false,
  );
  assert.equal(
    RegisterPushTokenRequestSchema.safeParse({
      accountKey: 'user:abc',
      token: 'ExponentPushToken[x]',
      platform: 'windows',
    }).success,
    false,
  );
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd functions && npm test`
Expected: FAIL — 미존재 export 컴파일 에러.

- [ ] **Step 3: 최소 구현**

`functions/src/review-reminder-core.ts`에 추가 (상단 import에 zod):

```ts
import { z } from 'zod';

export const MAX_PUSH_TOKENS = 10;

export function upsertPushToken(
  prev: PushTokenRecord[],
  next: PushTokenRecord,
): PushTokenRecord[] {
  const existingIdx = prev.findIndex((t) => t.token === next.token);
  let merged: PushTokenRecord[];
  if (existingIdx >= 0) {
    merged = prev.slice();
    merged[existingIdx] = { ...merged[existingIdx], ...next };
  } else {
    merged = [...prev, next];
  }
  if (merged.length <= MAX_PUSH_TOKENS) return merged;
  return merged
    .slice()
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .slice(merged.length - MAX_PUSH_TOKENS);
}

export const RegisterPushTokenRequestSchema = z.object({
  accountKey: z.string().min(1).max(200),
  token: z.string().regex(/^ExponentPushToken\[.+\]$/),
  platform: z.enum(['ios', 'android']),
});

export type RegisterPushTokenRequest = z.infer<
  typeof RegisterPushTokenRequestSchema
>;
```

- [ ] **Step 4: 통과 확인**

Run: `cd functions && npm test`
Expected: PASS (13 tests 누적).

- [ ] **Step 5: 커밋**

```bash
git add functions/src/review-reminder-core.ts functions/tests/review-reminder-core.test.ts
git commit -m "feat(fcm): 토큰 upsert/prune+등록 스키마"
```

---

## Task 4: 서버 — Expo 메시지 청크 + 카피

**Files:**
- Modify: `functions/src/review-reminder-core.ts`
- Create: `functions/src/review-reminder-copy.ts`
- Test: `functions/tests/review-reminder-core.test.ts`, `functions/tests/review-reminder-copy.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`functions/tests/review-reminder-core.test.ts`에 추가:

```ts
import { chunkExpoMessages } from '../src/review-reminder-core';

test('chunkExpoMessages: 100건 단위로 분할', () => {
  const msgs = Array.from({ length: 250 }, (_, i) => ({ to: `t${i}` }));
  const chunks = chunkExpoMessages(msgs, 100);
  assert.deepEqual(chunks.map((c) => c.length), [100, 100, 50]);
});

test('chunkExpoMessages: 빈 입력 → 빈 배열', () => {
  assert.deepEqual(chunkExpoMessages([], 100), []);
});
```

`functions/tests/review-reminder-copy.test.ts` (신규):

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildReviewReminderCopy } from '../src/review-reminder-copy';

// 스펙 고정 문자열. 클라 review-reminder-copy.test.ts와 동일 기대값 —
// 한쪽 변경 시 양쪽 테스트가 깨져 드리프트 감지.
test('아침 + 라벨 있음', () => {
  const c = buildReviewReminderCopy('morning', '판별식 계산 실수');
  assert.equal(c.title, '벌써 잊혀지고 있어요. 판별식 계산 실수, 지금 3분이면 돼요');
  assert.equal(c.body, '오늘 안 하면 내일 처음부터예요');
});

test('아침 + 라벨 없음', () => {
  const c = buildReviewReminderCopy('morning', undefined);
  assert.equal(c.title, '벌써 잊혀지고 있어요. 지금 3분이면 돼요');
  assert.equal(c.body, '오늘 안 하면 내일 처음부터예요');
});

test('저녁 + 라벨 있음', () => {
  const c = buildReviewReminderCopy('evening', '판별식 계산 실수');
  assert.equal(c.title, '판별식 계산 실수, 오늘 자기 전 마지막 기회예요');
  assert.equal(c.body, '잠들기 전 3분, 기억이 굳어져요');
});

test('저녁 + 라벨 없음', () => {
  const c = buildReviewReminderCopy('evening', undefined);
  assert.equal(c.title, '오늘 복습 마감, 자기 전 3분만요');
  assert.equal(c.body, '잠들기 전 3분, 기억이 굳어져요');
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd functions && npm test`
Expected: FAIL — `chunkExpoMessages`/`review-reminder-copy` 미존재.

- [ ] **Step 3: 최소 구현**

`functions/src/review-reminder-core.ts`에 추가:

```ts
export function chunkExpoMessages<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
```

`functions/src/review-reminder-copy.ts` (신규):

```ts
import type { ReminderSlot } from './review-reminder-core';

// 카피 단일 출처(서버). 클라
// features/quiz/notifications/review-reminder-copy.ts 와 문자열 동일해야
// 하며, 양쪽 단위 테스트가 동일 기대값으로 드리프트를 막는다.
export function buildReviewReminderCopy(
  slot: ReminderSlot,
  label: string | undefined,
): { title: string; body: string } {
  if (slot === 'morning') {
    return {
      title: label
        ? `벌써 잊혀지고 있어요. ${label}, 지금 3분이면 돼요`
        : '벌써 잊혀지고 있어요. 지금 3분이면 돼요',
      body: '오늘 안 하면 내일 처음부터예요',
    };
  }
  return {
    title: label
      ? `${label}, 오늘 자기 전 마지막 기회예요`
      : '오늘 복습 마감, 자기 전 3분만요',
    body: '잠들기 전 3분, 기억이 굳어져요',
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd functions && npm test`
Expected: PASS (core 15 + copy 4).

- [ ] **Step 5: 커밋**

```bash
git add functions/src/review-reminder-core.ts functions/src/review-reminder-copy.ts functions/tests/review-reminder-core.test.ts functions/tests/review-reminder-copy.test.ts
git commit -m "feat(fcm): Expo 메시지 청크+서버 카피 모듈"
```

---

## Task 5: 서버 — push-token-store + registerPushToken 함수

**Files:**
- Create: `functions/src/push-token-store.ts`
- Create: `functions/src/register-push-token.ts`
- Modify: `functions/src/index.ts`

I/O(Firestore) 래퍼라 1단계 관례대로 **단위 모킹 미사용**, Expo 스모크로
검증. 순수 로직은 Task 1~4에서 이미 커버.

- [ ] **Step 1: push-token-store 작성**

`functions/src/push-token-store.ts` (신규):

```ts
import { getFirestore } from 'firebase-admin/firestore';

import {
  upsertPushToken,
  type PushTokenRecord,
  type ReminderSentLog,
} from './review-reminder-core';

function userRef(accountKey: string) {
  return getFirestore().collection('users').doc(accountKey);
}

export async function getUserPushState(accountKey: string): Promise<{
  pushTokens: PushTokenRecord[];
  reminderSentLog: ReminderSentLog;
}> {
  const snap = await userRef(accountKey).get();
  const data = snap.data() ?? {};
  return {
    pushTokens: Array.isArray(data.pushTokens) ? data.pushTokens : [],
    reminderSentLog:
      data.reminderSentLog && typeof data.reminderSentLog === 'object'
        ? data.reminderSentLog
        : {},
  };
}

export async function savePushToken(
  accountKey: string,
  record: PushTokenRecord,
): Promise<void> {
  const { pushTokens } = await getUserPushState(accountKey);
  const next = upsertPushToken(pushTokens, record);
  await userRef(accountKey).set({ pushTokens: next }, { merge: true });
}

export async function writePushTokens(
  accountKey: string,
  pushTokens: PushTokenRecord[],
): Promise<void> {
  await userRef(accountKey).set({ pushTokens }, { merge: true });
}

export async function writeReminderSentLog(
  accountKey: string,
  reminderSentLog: ReminderSentLog,
): Promise<void> {
  await userRef(accountKey).set({ reminderSentLog }, { merge: true });
}
```

- [ ] **Step 2: registerPushToken 핸들러 작성**

`functions/src/register-push-token.ts` (신규) — `save-review-tasks.ts` 패턴 미러:

```ts
import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';

import {
  authenticateLearningHistoryRequest,
  LearningHistoryAuthError,
} from './learning-history-auth';
import { RegisterPushTokenRequestSchema } from './review-reminder-core';
import { savePushToken } from './push-token-store';

export const registerPushTokenHandler = onRequest(
  { region: 'asia-northeast3', timeoutSeconds: 30, cors: true, invoker: 'public' },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const parsed = RegisterPushTokenRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response
        .status(400)
        .json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    try {
      const authContext = await authenticateLearningHistoryRequest(
        request.headers as Record<string, string | string[] | undefined>,
        parsed.data.accountKey,
      );
      if (authContext.kind !== 'firebase') {
        response.status(403).json({ error: 'Authenticated users only' });
        return;
      }

      await savePushToken(authContext.accountKey, {
        token: parsed.data.token,
        platform: parsed.data.platform,
        updatedAt: new Date().toISOString(),
      });
      response.status(200).json({ ok: true });
    } catch (error) {
      if (error instanceof LearningHistoryAuthError) {
        response.status(error.status).json({ error: error.message });
        return;
      }
      logger.error('registerPushToken failed', error);
      response.status(500).json({ error: 'Failed to register push token' });
    }
  },
);
```

- [ ] **Step 3: index.ts에 export 추가**

`functions/src/index.ts`의 `export { saveReviewTasksHandler ... }` 줄 다음에 추가:

```ts
export { registerPushTokenHandler as registerPushToken } from './register-push-token';
```

- [ ] **Step 4: 빌드 검증**

Run: `cd functions && npm run lint`
Expected: tsc 에러 0.

- [ ] **Step 5: 커밋**

```bash
git add functions/src/push-token-store.ts functions/src/register-push-token.ts functions/src/index.ts
git commit -m "feat(fcm): registerPushToken 함수+토큰 스토어"
```

---

## Task 6: 서버 — Expo Push 클라이언트 래퍼

**Files:**
- Create: `functions/src/expo-push-client.ts`
- Modify: `functions/src/review-reminder-core.ts` (응답 파서 순수 함수)
- Test: `functions/tests/review-reminder-core.test.ts`

- [ ] **Step 1: 실패 테스트 추가 (응답 파서)**

`functions/tests/review-reminder-core.test.ts`에 추가:

```ts
import { collectInvalidTokensFromTickets } from '../src/review-reminder-core';

test('collectInvalidTokensFromTickets: DeviceNotRegistered만 무효 집합', () => {
  const sent = ['ExponentPushToken[A]', 'ExponentPushToken[B]', 'ExponentPushToken[C]'];
  const tickets = [
    { status: 'ok' },
    { status: 'error', details: { error: 'DeviceNotRegistered' } },
    { status: 'error', details: { error: 'MessageRateExceeded' } },
  ];
  const invalid = collectInvalidTokensFromTickets(sent, tickets);
  assert.deepEqual([...invalid], ['ExponentPushToken[B]']);
});

test('collectInvalidTokensFromTickets: 길이 불일치 안전(짧은 쪽 기준)', () => {
  const invalid = collectInvalidTokensFromTickets(['ExponentPushToken[A]'], []);
  assert.equal(invalid.size, 0);
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd functions && npm test`
Expected: FAIL — `collectInvalidTokensFromTickets` 미존재.

- [ ] **Step 3: 최소 구현**

`functions/src/review-reminder-core.ts`에 추가:

```ts
export type ExpoPushTicket = {
  status: 'ok' | 'error';
  details?: { error?: string };
};

export function collectInvalidTokensFromTickets(
  sentTokens: string[],
  tickets: ExpoPushTicket[],
): Set<string> {
  const invalid = new Set<string>();
  const n = Math.min(sentTokens.length, tickets.length);
  for (let i = 0; i < n; i++) {
    if (
      tickets[i].status === 'error' &&
      tickets[i].details?.error === 'DeviceNotRegistered'
    ) {
      invalid.add(sentTokens[i]);
    }
  }
  return invalid;
}
```

`functions/src/expo-push-client.ts` (신규):

```ts
export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data: Record<string, unknown>;
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendExpoPushChunk(
  messages: ExpoPushMessage[],
): Promise<{ data?: { status: string; details?: { error?: string } }[] }> {
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });
  if (!response.ok) {
    throw new Error(`Expo push failed: ${response.status}`);
  }
  return (await response.json()) as {
    data?: { status: string; details?: { error?: string } }[];
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd functions && npm test`
Expected: PASS (core 17 + copy 4).

- [ ] **Step 5: 커밋**

```bash
git add functions/src/expo-push-client.ts functions/src/review-reminder-core.ts functions/tests/review-reminder-core.test.ts
git commit -m "feat(fcm): Expo Push 클라이언트+티켓 파서"
```

---

## Task 7: 서버 — sendReviewReminders 오케스트레이터 + onSchedule

**Files:**
- Create: `functions/src/send-review-reminders.ts`
- Modify: `functions/src/index.ts`

오케스트레이터는 Firestore/네트워크 I/O라 단위 모킹 미사용 — Expo 스모크
검증(1단계 관례). 순수 단계는 Task 1~6에서 커버됨. weaknessId→라벨은
서버에 diagnosisMap이 없으므로 **task.weaknessLabel(있으면) 우선, 없으면
무라벨**로 단순화(스펙 카피 라벨 옵션과 일치, 무라벨 카피 존재).

- [ ] **Step 1: 오케스트레이터 작성**

`functions/src/send-review-reminders.ts` (신규):

```ts
import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';

import {
  chunkExpoMessages,
  collectInvalidTokensFromTickets,
  computeReminderDateBounds,
  dedupeAccountKeys,
  recordSlotSent,
  removeInvalidTokens,
  shouldSendForSlot,
  type ReminderSlot,
} from './review-reminder-core';
import { buildReviewReminderCopy } from './review-reminder-copy';
import { sendExpoPushChunk, type ExpoPushMessage } from './expo-push-client';
import {
  getUserPushState,
  writePushTokens,
  writeReminderSentLog,
} from './push-token-store';

function todayLabelKst(now: Date): string {
  // 사용자 전원 KST 가정(스펙). KST = UTC+9.
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

async function isSendingEnabled(): Promise<boolean> {
  const snap = await getFirestore()
    .collection('config')
    .doc('notifications')
    .get();
  return snap.exists && snap.data()?.enabled === true;
}

export async function runReviewReminders(
  slot: ReminderSlot,
  now: Date,
): Promise<void> {
  if (!(await isSendingEnabled())) {
    logger.info('reviewReminders gate off — skip', { slot });
    return;
  }

  const dateLabel = todayLabelKst(now);
  const { gte, lt } = computeReminderDateBounds(dateLabel);

  const snap = await getFirestore()
    .collectionGroup('reviewTasks')
    .where('completed', '==', false)
    .where('scheduledFor', '>=', gte)
    .where('scheduledFor', '<', lt)
    .get();

  const accountKeys = dedupeAccountKeys(
    snap.docs
      .map((d) => d.ref.parent.parent?.id)
      .filter((id): id is string => Boolean(id)),
  );

  for (const accountKey of accountKeys) {
    try {
      const { pushTokens, reminderSentLog } = await getUserPushState(accountKey);
      if (pushTokens.length === 0) continue;
      if (!shouldSendForSlot(reminderSentLog, dateLabel, slot)) continue;

      const { title, body } = buildReviewReminderCopy(slot, undefined);
      const sentTokens = pushTokens.map((t) => t.token);
      const messages: ExpoPushMessage[] = sentTokens.map((to) => ({
        to,
        title,
        body,
        sound: 'default',
        data: { notificationType: 'review_reminder', slot },
      }));

      const invalid = new Set<string>();
      let tokenCursor = 0;
      for (const chunk of chunkExpoMessages(messages, 100)) {
        const result = await sendExpoPushChunk(chunk);
        const tickets = result.data ?? [];
        const chunkTokens = sentTokens.slice(
          tokenCursor,
          tokenCursor + chunk.length,
        );
        for (const tk of collectInvalidTokensFromTickets(chunkTokens, tickets)) {
          invalid.add(tk);
        }
        tokenCursor += chunk.length;
      }

      if (invalid.size > 0) {
        await writePushTokens(
          accountKey,
          removeInvalidTokens(pushTokens, invalid),
        );
      }
      await writeReminderSentLog(
        accountKey,
        recordSlotSent(reminderSentLog, dateLabel, slot),
      );
    } catch (error) {
      logger.error('reviewReminders per-account failed', { accountKey, error });
    }
  }
}

const scheduleOptions = {
  region: 'asia-northeast3' as const,
  timeZone: 'Asia/Seoul' as const,
};

export const sendReviewRemindersMorning = onSchedule(
  { ...scheduleOptions, schedule: '30 7 * * *' },
  async () => {
    await runReviewReminders('morning', new Date());
  },
);

export const sendReviewRemindersEvening = onSchedule(
  { ...scheduleOptions, schedule: '0 20 * * *' },
  async () => {
    await runReviewReminders('evening', new Date());
  },
);
```

- [ ] **Step 2: index.ts export 추가**

`functions/src/index.ts`의 registerPushToken export 다음에 추가:

```ts
export {
  sendReviewRemindersMorning,
  sendReviewRemindersEvening,
} from './send-review-reminders';
```

- [ ] **Step 3: 빌드 검증**

Run: `cd functions && npm run lint && npm test`
Expected: tsc 0, 기존 테스트 전부 PASS (회귀 없음).

- [ ] **Step 4: 커밋**

```bash
git add functions/src/send-review-reminders.ts functions/src/index.ts
git commit -m "feat(fcm): sendReviewReminders 오케스트레이터+onSchedule"
```

---

## Task 8: 클라 — 카피 모듈 추출 + 기존 스케줄러 치환

**Files:**
- Create: `features/quiz/notifications/review-reminder-copy.ts`
- Create: `features/quiz/notifications/review-reminder-copy.test.ts`
- Modify: `features/quiz/notifications/review-notification-scheduler.ts`

- [ ] **Step 1: 실패 테스트 작성**

`features/quiz/notifications/review-reminder-copy.test.ts` (신규) — 서버
`functions/tests/review-reminder-copy.test.ts`와 **동일 기대값**:

```ts
import { buildReviewReminderCopy } from './review-reminder-copy';

describe('buildReviewReminderCopy (클라/서버 카피 동기)', () => {
  it('아침 + 라벨 있음', () => {
    expect(buildReviewReminderCopy('morning', '판별식 계산 실수')).toEqual({
      title: '벌써 잊혀지고 있어요. 판별식 계산 실수, 지금 3분이면 돼요',
      body: '오늘 안 하면 내일 처음부터예요',
    });
  });
  it('아침 + 라벨 없음', () => {
    expect(buildReviewReminderCopy('morning', undefined)).toEqual({
      title: '벌써 잊혀지고 있어요. 지금 3분이면 돼요',
      body: '오늘 안 하면 내일 처음부터예요',
    });
  });
  it('저녁 + 라벨 있음', () => {
    expect(buildReviewReminderCopy('evening', '판별식 계산 실수')).toEqual({
      title: '판별식 계산 실수, 오늘 자기 전 마지막 기회예요',
      body: '잠들기 전 3분, 기억이 굳어져요',
    });
  });
  it('저녁 + 라벨 없음', () => {
    expect(buildReviewReminderCopy('evening', undefined)).toEqual({
      title: '오늘 복습 마감, 자기 전 3분만요',
      body: '잠들기 전 3분, 기억이 굳어져요',
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest features/quiz/notifications/review-reminder-copy.test.ts --runTestsByPath`
Expected: FAIL — 모듈 미존재.

- [ ] **Step 3: 카피 모듈 작성**

`features/quiz/notifications/review-reminder-copy.ts` (신규):

```ts
export type ReminderSlot = 'morning' | 'evening';

// 카피 단일 출처(클라). 서버 functions/src/review-reminder-copy.ts 와
// 문자열 동일해야 하며, 양쪽 단위 테스트가 동일 기대값으로 드리프트 차단.
export function buildReviewReminderCopy(
  slot: ReminderSlot,
  label: string | undefined,
): { title: string; body: string } {
  if (slot === 'morning') {
    return {
      title: label
        ? `벌써 잊혀지고 있어요. ${label}, 지금 3분이면 돼요`
        : '벌써 잊혀지고 있어요. 지금 3분이면 돼요',
      body: '오늘 안 하면 내일 처음부터예요',
    };
  }
  return {
    title: label
      ? `${label}, 오늘 자기 전 마지막 기회예요`
      : '오늘 복습 마감, 자기 전 3분만요',
    body: '잠들기 전 3분, 기억이 굳어져요',
  };
}
```

- [ ] **Step 4: 기존 스케줄러를 카피 모듈 사용으로 치환**

`features/quiz/notifications/review-notification-scheduler.ts`에서 상단 import 추가:

```ts
import { buildReviewReminderCopy } from '@/features/quiz/notifications/review-reminder-copy';
```

`scheduleReviewNotifications` 내 카피 블록을 교체. 다음 줄들을 삭제:

```ts
  const morningTitle = label
    ? `벌써 잊혀지고 있어요. ${label}, 지금 3분이면 돼요`
    : '벌써 잊혀지고 있어요. 지금 3분이면 돼요';
  const morningBody = '오늘 안 하면 내일 처음부터예요';

  const eveningTitle = label
    ? `${label}, 오늘 자기 전 마지막 기회예요`
    : '오늘 복습 마감, 자기 전 3분만요';
  const eveningBody = '잠들기 전 3분, 기억이 굳어져요';
```

대체:

```ts
  const morning = buildReviewReminderCopy('morning', label);
  const evening = buildReviewReminderCopy('evening', label);
  const morningTitle = morning.title;
  const morningBody = morning.body;
  const eveningTitle = evening.title;
  const eveningBody = evening.body;
```

- [ ] **Step 5: 통과 + 회귀 확인**

Run: `npx jest features/quiz/notifications --runTestsByPath`
Expected: 신규 카피 4 PASS + 기존 `review-notification-scheduler` 테스트 PASS.

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/notifications/review-reminder-copy.ts features/quiz/notifications/review-reminder-copy.test.ts features/quiz/notifications/review-notification-scheduler.ts
git commit -m "refactor(fcm): 복습 알림 카피 모듈 추출+스케줄러 치환"
```

---

## Task 9: 클라 — 토큰 등록 API + env

**Files:**
- Modify: `constants/env.ts`
- Create: `features/learning/register-push-token-api.ts`
- Create: `features/learning/register-push-token-api.test.ts`

- [ ] **Step 1: env 추가**

`constants/env.ts`의 `learningHistorySaveReviewTasksUrl` 정의 다음에 추가:

```ts
export const registerPushTokenUrl = (
  process.env.EXPO_PUBLIC_REGISTER_PUSH_TOKEN_URL ?? ''
).trim();
```

- [ ] **Step 2: 실패 테스트 작성**

`features/learning/register-push-token-api.test.ts` (신규):

```ts
import { createRegisterPushToken } from './register-push-token-api';

function makeAuthClient(kind: 'firebase' | 'anonymous') {
  return {
    getRemoteAuthContext: jest.fn().mockResolvedValue(
      kind === 'firebase'
        ? { kind, accountKey: 'user:abc', idToken: 'idtok' }
        : { kind, accountKey: 'anon:1', requestSecret: 'sec' },
    ),
  } as any;
}

describe('createRegisterPushToken', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('firebase 인증: POST로 토큰 전송, Authorization 헤더 포함', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    global.fetch = fetchMock as any;

    const register = createRegisterPushToken({
      authClient: makeAuthClient('firebase'),
      registerPushTokenUrl: 'https://fn/registerPushToken',
    });
    await register('user:abc', 'ExponentPushToken[X]', 'ios');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://fn/registerPushToken');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      accountKey: 'user:abc',
      token: 'ExponentPushToken[X]',
      platform: 'ios',
    });
    expect(init.headers.Authorization).toBe('Bearer idtok');
  });

  it('네트워크 실패 시 throw 안 함(베스트에포트)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as any;
    const register = createRegisterPushToken({
      authClient: makeAuthClient('firebase'),
      registerPushTokenUrl: 'https://fn/registerPushToken',
    });
    await expect(
      register('user:abc', 'ExponentPushToken[X]', 'ios'),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx jest features/learning/register-push-token-api.test.ts --runTestsByPath`
Expected: FAIL — 모듈 미존재.

- [ ] **Step 4: 최소 구현**

`features/learning/register-push-token-api.ts` (신규):

```ts
import type { AuthClient } from '@/features/auth/auth-client';

import { createRemoteAuthHeaders } from './firebase-learning-history-api';

type Dependencies = {
  authClient: AuthClient;
  registerPushTokenUrl: string;
};

export function createRegisterPushToken(deps: Dependencies) {
  return async function registerPushToken(
    accountKey: string,
    token: string,
    platform: 'ios' | 'android',
  ): Promise<void> {
    try {
      const authContext = await deps.authClient.getRemoteAuthContext(accountKey);
      if (authContext.kind !== 'firebase') return; // 인증 사용자만
      const headers = createRemoteAuthHeaders(authContext);
      const response = await fetch(deps.registerPushTokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ accountKey, token, platform }),
      });
      if (!response.ok) {
        console.warn('[registerPushToken] non-ok', response.status);
      }
    } catch (error) {
      // 베스트에포트: 다음 권한/포커스 사이클에서 재시도. 사용자 흐름 차단 금지.
      console.warn('[registerPushToken] failed', error);
    }
  };
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx jest features/learning/register-push-token-api.test.ts --runTestsByPath`
Expected: PASS (2 tests).

- [ ] **Step 6: 커밋**

```bash
git add constants/env.ts features/learning/register-push-token-api.ts features/learning/register-push-token-api.test.ts
git commit -m "feat(fcm): 클라 토큰 등록 API+env"
```

---

## Task 10: 클라 — opt-in 훅 인증 분기 (토큰 등록 + 로컬 취소/스킵)

**Files:**
- Modify: `features/quiz/hooks/use-notification-opt-in.ts`
- Modify: `features/quiz/hooks/use-notification-opt-in.test.ts`
- Reference: `features/quiz/hooks/use-result-screen.ts:119` (호출부 — accountKey만 넘김; 시그니처 유지)

`useNotificationOptIn`은 현재 `accountKey`만 받는다. 인증 여부는
`authClient.getRemoteAuthContext(accountKey)`의 `kind === 'firebase'`로 판정
(provider가 이미 단일 authClient 보유; 훅에 주입). 인증이면: ① Expo push
token 취득 → 등록 ② 기존 `review_*` 로컬 알림 1회 취소 ③ 로컬 예약 스킵.
게스트/익명: 기존 로컬 예약 유지.

- [ ] **Step 1: 실패 테스트 추가**

`features/quiz/hooks/use-notification-opt-in.test.ts`에 케이스 추가
(기존 mock 패턴 유지; 아래는 핵심 동작 단언):

```ts
// 인증 사용자: onEnable 시 토큰 등록 호출 + scheduleReviewNotifications 미호출
it('인증 사용자: 권한 grant 시 토큰 등록 + 로컬 예약 스킵 + 기존 취소', async () => {
  const registerPushToken = jest.fn().mockResolvedValue(undefined);
  const scheduleSpy = jest.spyOn(scheduler, 'scheduleReviewNotifications');
  const cancelSpy = jest
    .spyOn(scheduler, 'cancelAllReviewNotifications')
    .mockResolvedValue(undefined);
  jest
    .spyOn(Notifications, 'getExpoPushTokenAsync')
    .mockResolvedValue({ data: 'ExponentPushToken[X]' } as any);

  const { result } = renderHook(() =>
    useNotificationOptIn({
      accountKey: 'user:abc',
      hasWeaknesses: true,
      isAuthenticated: true,
      registerPushToken,
    }),
  );
  await act(async () => {
    await result.current.onEnable();
  });

  expect(registerPushToken).toHaveBeenCalledWith(
    'user:abc',
    'ExponentPushToken[X]',
    expect.stringMatching(/ios|android/),
  );
  expect(cancelSpy).toHaveBeenCalled();
  expect(scheduleSpy).not.toHaveBeenCalled();
});

// 게스트: 기존 동작 유지 — scheduleReviewNotifications 호출
it('게스트: 기존 로컬 예약 유지', async () => {
  const scheduleSpy = jest
    .spyOn(scheduler, 'scheduleReviewNotifications')
    .mockResolvedValue(undefined);
  const { result } = renderHook(() =>
    useNotificationOptIn({
      accountKey: 'anon:1',
      hasWeaknesses: true,
      isAuthenticated: false,
      registerPushToken: jest.fn(),
    }),
  );
  await act(async () => {
    await result.current.onEnable();
  });
  expect(scheduleSpy).toHaveBeenCalled();
});
```

(테스트 상단에 `import * as scheduler from '@/features/quiz/notifications/review-notification-scheduler'` 및 `import * as Notifications from 'expo-notifications'` 추가. 기존 테스트의 mock 설정과 병합.)

- [ ] **Step 2: 실패 확인**

Run: `npx jest features/quiz/hooks/use-notification-opt-in.test.ts --runTestsByPath`
Expected: FAIL — 신규 파라미터/`cancelAllReviewNotifications` 미존재.

- [ ] **Step 3: 스케줄러에 cancel 헬퍼 추가**

`features/quiz/notifications/review-notification-scheduler.ts`에 추가
(`rescheduleAllReviewNotifications`의 취소 로직 재사용·노출):

```ts
export async function cancelAllReviewNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const reviewIds = scheduled
    .map((n) => n.identifier)
    .filter((id) => id.startsWith(NOTIFICATION_ID_PREFIX));
  await Promise.all(
    reviewIds.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
    ),
  );
}
```

그리고 `rescheduleAllReviewNotifications` 내 동일 취소 블록을
`await cancelAllReviewNotifications();` 호출로 치환(중복 제거, 동작 동일).

- [ ] **Step 4: 훅 인증 분기 구현**

`features/quiz/hooks/use-notification-opt-in.ts` 교체:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import {
  cancelAllReviewNotifications,
  requestNotificationPermission,
  scheduleReviewNotifications,
} from '@/features/quiz/notifications/review-notification-scheduler';

import type { NotificationOptInCardState } from '@/features/quiz/components/notification-opt-in-card';

const reviewStore = new LocalReviewTaskStore();

type RegisterPushToken = (
  accountKey: string,
  token: string,
  platform: 'ios' | 'android',
) => Promise<void>;

type Params = {
  accountKey: string | undefined;
  hasWeaknesses: boolean;
  isAuthenticated: boolean;
  registerPushToken: RegisterPushToken;
};

type Result = {
  state: NotificationOptInCardState;
  onEnable: () => Promise<void>;
  onDismiss: () => void;
};

async function activateForAuthenticated(
  accountKey: string,
  registerPushToken: RegisterPushToken,
): Promise<void> {
  // 중복 차단: 인증 사용자는 서버가 발송 주도 → 기존 로컬 예약 1회 취소.
  await cancelAllReviewNotifications().catch((err: unknown) => {
    console.warn('[useNotificationOptIn] cancel failed', err);
  });
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const platform = Platform.OS === 'android' ? 'android' : 'ios';
    await registerPushToken(accountKey, data, platform);
  } catch (err: unknown) {
    console.warn('[useNotificationOptIn] expo push token failed', err);
  }
}

async function activateForGuest(accountKey: string): Promise<void> {
  await scheduleReviewNotifications(accountKey, reviewStore).catch(
    (err: unknown) => {
      console.warn('[useNotificationOptIn] schedule failed', err);
    },
  );
}

export function useNotificationOptIn({
  accountKey,
  hasWeaknesses,
  isAuthenticated,
  registerPushToken,
}: Params): Result {
  const [state, setState] = useState<NotificationOptInCardState>('dismissed');
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const activate = useCallback(
    async (key: string) => {
      if (isAuthenticated) {
        await activateForAuthenticated(key, registerPushToken);
      } else {
        await activateForGuest(key);
      }
    },
    [isAuthenticated, registerPushToken],
  );

  useEffect(() => {
    let cancelled = false;
    if (!accountKey || !hasWeaknesses) {
      setState('dismissed');
      return () => {
        cancelled = true;
      };
    }

    void Notifications.getPermissionsAsync()
      .then(async ({ status }) => {
        if (cancelled) return;
        if (status === 'granted') {
          setState('granted');
          if (cancelled) return;
          await activate(accountKey);
          return;
        }
        if (status === 'denied') {
          setState('denied');
          return;
        }
        setState('idle');
      })
      .catch((err: unknown) => {
        console.warn('[useNotificationOptIn] getPermissionsAsync failed', err);
        if (!cancelled) setState('dismissed');
      });

    return () => {
      cancelled = true;
    };
  }, [accountKey, hasWeaknesses, activate]);

  const onEnable = useCallback(async () => {
    if (!accountKey) return;
    setState('requesting');
    const granted = await requestNotificationPermission().catch(() => false);
    if (!mountedRef.current) return;
    if (granted) {
      setState('granted');
      if (!mountedRef.current) return;
      await activate(accountKey);
    } else {
      setState('denied');
    }
  }, [accountKey, activate]);

  const onDismiss = useCallback(() => {
    setState('dismissed');
  }, []);

  return { state, onEnable, onDismiss };
}
```

- [ ] **Step 5: 호출부 배선**

`features/quiz/hooks/use-result-screen.ts:119` 의 `useNotificationOptIn({...})`
호출에 `isAuthenticated`와 `registerPushToken` 전달. 같은 파일에서
`useCurrentLearner()`의 `session`으로 인증 여부를, provider가 노출하는
`registerPushToken`을 사용. provider(`features/learner/provider.tsx`)에
다음을 추가:

```ts
// import 추가
import { createRegisterPushToken } from '@/features/learning/register-push-token-api';
import { registerPushTokenUrl } from '@/constants/env';

// authClient 생성부(53행) 근처
const registerPushToken = createRegisterPushToken({
  authClient,
  registerPushTokenUrl,
});

// context value(344행 부근, reviewTaskStore 옆)에 추가
registerPushToken,
```

그리고 provider의 context 타입(`reviewTaskStore: ReviewTaskStore;` 옆,
129행 부근)에 추가:

```ts
registerPushToken: (
  accountKey: string,
  token: string,
  platform: 'ios' | 'android',
) => Promise<void>;
```

`use-result-screen.ts`에서:

```ts
const { session, registerPushToken } = useCurrentLearner();
// ...
const optIn = useNotificationOptIn({
  accountKey,
  hasWeaknesses,
  isAuthenticated: session?.status === 'authenticated',
  registerPushToken,
});
```

- [ ] **Step 6: 통과 + 회귀 확인**

Run: `npx jest features/quiz/hooks/use-notification-opt-in.test.ts --runTestsByPath`
Expected: 신규 2 PASS + 기존 케이스 PASS.

Run: `npx tsc --noEmit`
Expected: 0 에러(provider/use-result-screen 배선 포함).

- [ ] **Step 7: 커밋**

```bash
git add features/quiz/hooks/use-notification-opt-in.ts features/quiz/hooks/use-notification-opt-in.test.ts features/quiz/notifications/review-notification-scheduler.ts features/learner/provider.tsx features/quiz/hooks/use-result-screen.ts
git commit -m "feat(fcm): opt-in 인증 분기 — 토큰 등록+로컬 취소/스킵"
```

---

## Task 11: 클라 — 허브 훅 인증 시 reschedule 스킵

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts:85-95`

`use-quiz-hub-screen.ts`는 마운트 시 `applyOverduePenalties` 후
`rescheduleAllReviewNotifications`를 호출한다(91행). 인증 사용자는 로컬
재예약을 하면 안 되고, **기존 예약은 취소**해야 한다(중복 차단).
`session.status`로 분기.

- [ ] **Step 1: 분기 구현**

`features/quiz/hooks/use-quiz-hub-screen.ts` 상단 import 수정:

```ts
import {
  cancelAllReviewNotifications,
  rescheduleAllReviewNotifications,
} from '@/features/quiz/notifications/review-notification-scheduler';
```

85–95행의 effect 교체:

```ts
  useEffect(() => {
    const accountKey = session?.accountKey;
    if (!accountKey) {
      return;
    }
    const isAuthenticated = session?.status === 'authenticated';
    applyOverduePenalties(accountKey, hubReviewStore).then(() => {
      if (isAuthenticated) {
        // 인증 사용자는 서버가 발송 주도 — 로컬 재예약 금지, 기존 예약 취소.
        void cancelAllReviewNotifications().catch(console.warn);
      } else {
        void rescheduleAllReviewNotifications(accountKey, hubReviewStore).catch(
          console.warn,
        );
      }
      void refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accountKey]);
```

- [ ] **Step 2: 회귀 확인**

Run: `npx tsc --noEmit`
Expected: 0 에러.

Run: `npx jest features/quiz --runTestsByPath` (해당 디렉터리 기존 스위트)
Expected: 회귀 없음(전부 PASS).

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts
git commit -m "feat(fcm): 허브 진입 시 인증 사용자 로컬 재예약 스킵+취소"
```

---

## Task 12: 전체 검증 + 핸드오프 문서

**Files:**
- Modify: `docs/PROGRESS.md` (1단계와 동형으로 1줄 기록)

- [ ] **Step 1: 전체 테스트 그린**

Run: `cd functions && npm test && cd .. && npx jest --runTestsByPath features/quiz/notifications/review-reminder-copy.test.ts features/learning/register-push-token-api.test.ts features/quiz/hooks/use-notification-opt-in.test.ts`
Expected: functions 전부 PASS, 클라 신규/수정 스위트 PASS.

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit && cd functions && npm run lint`
Expected: 양쪽 0 에러.

- [ ] **Step 3: PROGRESS 기록**

`docs/PROGRESS.md`에 1줄 추가(기존 형식 따름):

```
- 2026-05-18 복습 알림 서버 주도 푸시 2단계(FCM): Expo Push + onSchedule(KST 7:30/20:00) + Firestore 게이트. 인증=서버/로컬 비활성, 게스트=로컬.
```

- [ ] **Step 4: 커밋**

```bash
git add docs/PROGRESS.md
git commit -m "docs(progress): FCM 2단계 구현 완료 기록"
```

- [ ] **Step 5: 사용자 핸드오프 안내 (출력만, 명령 실행 금지)**

다음을 사용자에게 그대로 안내한다(스펙 §8 순서):

```
구현·테스트 그린 완료. 아래는 당신이 직접 해야 실제 동작합니다(순서 엄수):

0. (필수) Android FCM V1 키 업로드 — 현재 미등록 확인됨:
   - Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키(JSON)
   - eas credentials -p android → production → Push Notifications (FCM V1)
     → 위 JSON 업로드 → 재확인
   (iOS APNs·EAS projectId는 검증 완료, 작업 불필요.)
1. (선행) 1단계 배포: firebase deploy --only functions:saveReviewTasks
   → 출력 URL을 EXPO_PUBLIC_SAVE_REVIEW_TASKS_URL 설정 → 1단계 스모크.
2. 2단계 함수 배포:
   firebase deploy --only functions:registerPushToken,functions:sendReviewRemindersMorning,functions:sendReviewRemindersEvening
3. 토큰 URL 설정 + 앱 재빌드:
   registerPushToken 출력 URL → EXPO_PUBLIC_REGISTER_PUSH_TOKEN_URL → 새 빌드.
4. 인덱스 생성: sendReviewReminders 첫 실행 로그의 Firestore 복합 인덱스
   생성 링크(reviewTasks: completed ASC, scheduledFor ASC) 1클릭.
5. 푸시 수신 스모크: 새 빌드 권한 grant → 토큰 등록 확인 → 알림 수신.
6. 메인 스위치 ON: Firestore 콘솔에서 config/notifications 문서
   { enabled: true } 생성/설정. 문제 시 enabled: false 로 즉시 차단.
```

---

## Self-Review

**1. Spec coverage**
- §3.1 Expo Push 경로 → Task 6,7 ✅
- §3.2 클라 토큰 등록 + 인증 로컬 비활성 + **전환 시 기존 취소** → Task 9,10,11 ✅
- §3.3 registerPushToken 함수 → Task 5 ✅
- §3.4 sendReviewReminders + 게이트 + collectionGroup + 경계 규칙 → Task 1,7 ✅
- §3.5 게이트(Firestore config + env) → Task 7(런타임 게이트), Task 9(env) ✅
- §3.6 인덱스 → Task 12 핸드오프(콘솔 생성, 스펙대로) ✅
- §4 데이터 흐름 → Task 7 오케스트레이터 ✅
- §5 리스크: 중복(Task 10,11), 경계(Task 1), 멱등 슬롯가드(Task 2),
  무효 토큰(Task 2,6), 1단계 미배포 안전실패(게이트+토큰0 → Task 7) ✅
- §6 테스트: 서버 순수(Task 1-4,6), 클라(Task 8-10), 회귀(Task 8,11),
  스모크(Task 12 핸드오프) ✅
- §7 영향 파일 — 전부 태스크에 매핑 ✅
- §8 핸드오프(자격증명 0 포함) → Task 12 Step 5 ✅

**2. Placeholder scan** — TBD/TODO/“적절히”/빈 코드 없음. 모든 코드 단계에
실제 코드 포함. ✅

**3. Type consistency**
- `ReminderSlot`: core(서버) 정의, copy(서버)·copy(클라) 각 자체 정의 —
  의도된 패키지 분리(설계 결정 섹션). 문자열 동기는 테스트로 고정.
- `PushTokenRecord`/`ReminderSentLog`: core 정의 → push-token-store,
  send-review-reminders에서 동일 import ✅
- `RegisterPushTokenRequestSchema`: core 정의 → register-push-token 사용 ✅
- `createRegisterPushToken` 시그니처: Task 9 정의 = Task 10 provider 배선 =
  use-notification-opt-in `RegisterPushToken` 타입 일치 ✅
- `cancelAllReviewNotifications`: Task 10 Step3 신설 → Task 10/11에서 사용 ✅
- onSchedule export 명(`sendReviewRemindersMorning/Evening`) = Task 7 정의 =
  Task 12 배포 명령 일치 ✅

이슈 없음. 계획 확정.
