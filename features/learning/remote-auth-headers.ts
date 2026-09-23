import type { AuthClient } from '@/features/auth/auth-client';

import { createRemoteAuthHeaders } from './firebase-learning-history-api';

/**
 * 사진 분석(analyzePhoto)에 싣는 계정 헤더. 다른 서버 함수와 같은 셋이라
 * 서버가 같은 검증으로 본다 — 지금은 사용량 원장에 적기만 하고, 과금을 켤 때 서버만 바꾸면 된다.
 * 인증 정보를 못 받아도 던지지 않는다. 헤더 때문에 학생 사진 분석이 멈추면 안 된다.
 */
export function createGetRemoteAuthHeaders(authClient: AuthClient) {
  return async function getRemoteAuthHeaders(accountKey: string): Promise<Record<string, string>> {
    try {
      return createRemoteAuthHeaders(await authClient.getRemoteAuthContext(accountKey));
    } catch (error) {
      console.warn('[getRemoteAuthHeaders] failed', error);
      return { 'x-dasida-account-key': accountKey };
    }
  };
}
