import {
  photoStoreUrl,
  type ApiErrorResponse,
  type ConsentDoc,
  type GetConsentResponse,
  type SaveConsentRequest,
  type SaveConsentResponse,
} from '@/functions/src/photo-store-contract';

import { isConsentDocLike } from './consent-store';

/**
 * saveConsent·getConsent 부르기 (1.0.11 1줄). 인증 헤더는 프로바이더의 getRemoteAuthHeaders —
 * 사진 분석과 같은 셋(x-dasida-account-key + Bearer)이다.
 * 실패는 전부 던진다. 오프라인·서버 오류를 어떻게 넘길지는 consent-sync가 정한다.
 */

const CONSENT_REQUEST_TIMEOUT_MS = 8_000;

export type ConsentRemote = {
  /** null = 서버에 문서가 없다(한 번도 안 봄) */
  fetch(accountKey: string): Promise<ConsentDoc | null>;
  save(request: SaveConsentRequest): Promise<ConsentDoc>;
};

export class ConsentApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: ApiErrorResponse['code'] | null,
  ) {
    super(message);
    this.name = 'ConsentApiError';
  }
}

async function requestJson(url: string, init: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONSENT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const payload = (await response.json().catch(() => null)) as Partial<ApiErrorResponse> | null;

    if (!response.ok) {
      throw new ConsentApiError(
        payload?.error ?? `Request failed (${response.status})`,
        response.status,
        payload?.code ?? null,
      );
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export function createConsentRemote(
  getRemoteAuthHeaders: (accountKey: string) => Promise<Record<string, string>>,
): ConsentRemote {
  return {
    async fetch(accountKey) {
      const headers = await getRemoteAuthHeaders(accountKey);
      const url = `${photoStoreUrl('getConsent')}?accountKey=${encodeURIComponent(accountKey)}`;
      const payload = (await requestJson(url, { method: 'GET', headers })) as GetConsentResponse | null;

      if (payload?.consent === null) return null;
      if (!payload || !isConsentDocLike(payload.consent)) {
        throw new ConsentApiError('Invalid consent response', 200, null);
      }
      return payload.consent;
    },

    async save(request) {
      const headers = await getRemoteAuthHeaders(request.accountKey);
      const payload = (await requestJson(photoStoreUrl('saveConsent'), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })) as SaveConsentResponse | null;

      if (!payload || !isConsentDocLike(payload.consent)) {
        throw new ConsentApiError('Invalid consent response', 200, null);
      }
      return payload.consent;
    },
  };
}
