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

import {
  collectInvalidTokensFromTickets,
  type ExpoPushTicket,
} from '../src/review-reminder-core';

test('collectInvalidTokensFromTickets: DeviceNotRegistered만 무효 집합', () => {
  const sent = ['ExponentPushToken[A]', 'ExponentPushToken[B]', 'ExponentPushToken[C]'];
  const tickets: ExpoPushTicket[] = [
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

import { buildPushMessages } from '../src/review-reminder-core';

test('buildPushMessages: 모든 메시지에 priority=high, channelId=default 부여 — Android 저우선 채널 묵음 회귀 방지', () => {
  const tokens = ['ExponentPushToken[A]', 'ExponentPushToken[B]'];
  const messages = buildPushMessages(
    tokens,
    { title: 'T', body: 'B' },
    'morning',
    'task-1',
  );
  assert.equal(messages.length, 2);
  for (const m of messages) {
    assert.equal(m.priority, 'high');
    assert.equal(m.channelId, 'default');
    assert.equal(m.sound, 'default');
    assert.equal(m.title, 'T');
    assert.equal(m.body, 'B');
    assert.equal(m.data?.notificationType, 'review_reminder');
    assert.equal(m.data?.slot, 'morning');
  }
  assert.equal(messages[0].to, 'ExponentPushToken[A]');
  assert.equal(messages[1].to, 'ExponentPushToken[B]');
});

test('buildPushMessages: slot이 data에 그대로 전달 (evening)', () => {
  const [m] = buildPushMessages(['ExponentPushToken[X]'], { title: 't', body: 'b' }, 'evening', 'task-x');
  assert.equal(m.data?.notificationType, 'review_reminder');
  assert.equal(m.data?.slot, 'evening');
});

import { pickRepresentativeTaskIdByAccount } from '../src/review-reminder-core';

// 서버는 collectionGroup으로 모든 계정의 오늘 task를 한 번에 가져오므로,
// 계정별 대표 taskId(첫 번째 미완료 task)를 뽑아 푸시 페이로드에 실어야 한다.
test('pickRepresentativeTaskIdByAccount: 계정별로 첫 task id를 매핑', () => {
  const docs = [
    { accountKey: 'user:a', taskId: 't1' },
    { accountKey: 'user:b', taskId: 't2' },
    { accountKey: 'user:a', taskId: 't3' },
  ];
  const map = pickRepresentativeTaskIdByAccount(docs);
  assert.equal(map.get('user:a'), 't1');
  assert.equal(map.get('user:b'), 't2');
});

// 알림 탭 → 복습 세션 라우팅을 위해 클라가 data.taskId를 요구한다
// (app/_layout.tsx의 notification response handler). taskId가 빠지면
// 인증 사용자 서버 푸시 경로에서 탭이 무동작이 되는 회귀가 발생.
test('buildPushMessages: data.taskId가 페이로드에 포함된다 — 탭 라우팅 회귀 방지', () => {
  const messages = buildPushMessages(
    ['ExponentPushToken[A]'],
    { title: 'T', body: 'B' },
    'morning',
    'task-123',
  );
  assert.equal(messages[0].data?.taskId, 'task-123');
});
