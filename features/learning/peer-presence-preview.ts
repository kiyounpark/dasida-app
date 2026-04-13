import type { PreviewSeedState } from '@/features/learner/types';

import type { PeerPresenceSnapshot } from './types';

const previewPeerMap: Record<Exclude<PreviewSeedState, 'fresh'>, PeerPresenceSnapshot> = {
  'diagnostic-complete': {
    updatedAt: new Date('2026-03-13T07:00:00.000Z').toISOString(),
    peers: [
      { id: 'peer-minseo', nickname: '민서', avatarSeed: 'minseo', statusText: '오늘 복습 시작' },
      { id: 'peer-hyunwoo', nickname: '현우', avatarSeed: 'hyunwoo', statusText: '오답 복기 완료' },
      { id: 'peer-yuna', nickname: '유나', avatarSeed: 'yuna', statusText: '대표 세트 다시 풂' },
    ],
  },
  'review-available': {
    updatedAt: new Date('2026-03-13T08:30:00.000Z').toISOString(),
    peers: [
      { id: 'peer-jiwoo', nickname: '지우', avatarSeed: 'jiwoo', statusText: 'Day 3 복습 완료' },
      { id: 'peer-seojun', nickname: '서준', avatarSeed: 'seojun', statusText: '실전 세트 이어 풀기' },
      { id: 'peer-harin', nickname: '하린', avatarSeed: 'harin', statusText: '오답 복기 시작' },
    ],
  },
  'review-day3-available': {
    updatedAt: new Date('2026-03-13T08:30:00.000Z').toISOString(),
    peers: [
      { id: 'peer-jiwoo', nickname: '지우', avatarSeed: 'jiwoo', statusText: 'Day 3 복습 완료' },
      { id: 'peer-seojun', nickname: '서준', avatarSeed: 'seojun', statusText: '실전 세트 이어 풀기' },
      { id: 'peer-harin', nickname: '하린', avatarSeed: 'harin', statusText: '오답 복기 시작' },
    ],
  },
  'review-day7-available': {
    updatedAt: new Date('2026-03-13T08:30:00.000Z').toISOString(),
    peers: [
      { id: 'peer-jiwoo', nickname: '지우', avatarSeed: 'jiwoo', statusText: 'Day 7 복습 완료' },
      { id: 'peer-seojun', nickname: '서준', avatarSeed: 'seojun', statusText: '실전 세트 이어 풀기' },
      { id: 'peer-harin', nickname: '하린', avatarSeed: 'harin', statusText: '오답 복기 시작' },
    ],
  },
  'review-day30-available': {
    updatedAt: new Date('2026-03-13T08:30:00.000Z').toISOString(),
    peers: [
      { id: 'peer-jiwoo', nickname: '지우', avatarSeed: 'jiwoo', statusText: 'Day 30 복습 완료' },
      { id: 'peer-seojun', nickname: '서준', avatarSeed: 'seojun', statusText: '실전 세트 이어 풀기' },
      { id: 'peer-harin', nickname: '하린', avatarSeed: 'harin', statusText: '오답 복기 시작' },
    ],
  },
  'exam-in-progress': {
    updatedAt: new Date('2026-03-13T09:15:00.000Z').toISOString(),
    peers: [
      { id: 'peer-yejun', nickname: '예준', avatarSeed: 'yejun', statusText: '실전 세트 12번까지 진행' },
      { id: 'peer-somin', nickname: '소민', avatarSeed: 'somin', statusText: '오늘 복습 먼저 완료' },
      { id: 'peer-doyoon', nickname: '도윤', avatarSeed: 'doyoon', statusText: '진단 결과 다시 확인' },
    ],
  },
  'practice-graduated': {
    updatedAt: new Date('2026-03-13T10:00:00.000Z').toISOString(),
    peers: [
      { id: 'peer-minseo', nickname: '민서', avatarSeed: 'minseo', statusText: '약점 연습 완료!' },
      { id: 'peer-seojun', nickname: '서준', avatarSeed: 'seojun', statusText: '실전 세트 도전 중' },
      { id: 'peer-harin', nickname: '하린', avatarSeed: 'harin', statusText: '복습 계획 세우는 중' },
    ],
  },
  'history-full': {
    updatedAt: new Date('2026-03-13T10:30:00.000Z').toISOString(),
    peers: [
      { id: 'peer-jiwoo', nickname: '지우', avatarSeed: 'jiwoo', statusText: 'Day 30 복습 완료' },
      { id: 'peer-hyunwoo', nickname: '현우', avatarSeed: 'hyunwoo', statusText: '정답률 75% 달성' },
      { id: 'peer-yuna', nickname: '유나', avatarSeed: 'yuna', statusText: '오늘 복습 3개 완료' },
    ],
  },
};

export function getPreviewPeerPresence(
  state: PreviewSeedState,
): PeerPresenceSnapshot | null {
  if (state === 'fresh') {
    return null;
  }

  return previewPeerMap[state];
}
