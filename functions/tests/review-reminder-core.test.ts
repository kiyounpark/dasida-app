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
  assert.equal(next['2026-05-18'].morning, true);
  assert.equal(next['2026-05-10'], undefined);
});

test('removeInvalidTokens: DeviceNotRegistered 토큰만 제거', () => {
  const tokens = [
    { token: 'ExponentPushToken[A]', platform: 'ios' as const, updatedAt: '2026-05-18T00:00:00.000Z' },
    { token: 'ExponentPushToken[B]', platform: 'android' as const, updatedAt: '2026-05-18T00:00:00.000Z' },
  ];
  const result = removeInvalidTokens(tokens, new Set(['ExponentPushToken[B]']));
  assert.deepEqual(result.map((t) => t.token), ['ExponentPushToken[A]']);
});

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

import { chunkExpoMessages } from '../src/review-reminder-core';

test('chunkExpoMessages: 100건 단위로 분할', () => {
  const msgs = Array.from({ length: 250 }, (_, i) => ({ to: `t${i}` }));
  const chunks = chunkExpoMessages(msgs, 100);
  assert.deepEqual(chunks.map((c) => c.length), [100, 100, 50]);
});

test('chunkExpoMessages: 빈 입력 → 빈 배열', () => {
  assert.deepEqual(chunkExpoMessages([], 100), []);
});
