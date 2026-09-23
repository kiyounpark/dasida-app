import type { AuthClient } from '@/features/auth/auth-client';

import { createRemoteAuthHeaders } from './firebase-learning-history-api';

/**
 * 모바일 Firebase 토큰 갱신은 망이 멈추면 60초까지 간다(@firebase/auth DEFAULT_API_TIMEOUT_MS).
 * 캐시 토큰은 ms, 갱신은 보통 1~2초 — 5초면 느린 망의 헛 타임아웃은 적고 분석 시작은 안 붙잡는다.
 */
const REMOTE_AUTH_HEADERS_TIMEOUT_MS = 5_000;

/**
 * 사진 분석(analyzePhoto)에 싣는 계정 헤더. 다른 서버 함수와 같은 셋이라
 * 서버가 같은 검증으로 본다 — 지금은 사용량 원장에 적기만 하고, 과금을 켤 때 서버만 바꾸면 된다.
 * 인증 정보를 못 받거나 늦어도 던지지 않는다. 헤더 때문에 학생 사진 분석이 멈추면 안 된다.
 */
export function createGetRemoteAuthHeaders(authClient: AuthClient) {
  return async function getRemoteAuthHeaders(accountKey: string): Promise<Record<string, string>> {
    const keyOnly = { 'x-dasida-account-key': accountKey };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), REMOTE_AUTH_HEADERS_TIMEOUT_MS);
    });

    try {
      const context = await Promise.race([authClient.getRemoteAuthContext(accountKey), timeout]);
      if (!context) {
        console.warn('[getRemoteAuthHeaders] timed out — sending account key only');
        return keyOnly;
      }
      return createRemoteAuthHeaders(context);
    } catch (error) {
      console.warn('[getRemoteAuthHeaders] failed', error);
      return keyOnly;
    } finally {
      clearTimeout(timer);
    }
  };
}
