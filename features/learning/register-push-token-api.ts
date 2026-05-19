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
