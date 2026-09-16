import type { RemoteAuthContext } from '@/features/auth/auth-client';

const REQUEST_TIMEOUT_MS = 25000;
const NETWORK_RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

export class LearningHistoryApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: 'NETWORK_ERROR' | 'TIMEOUT' | 'HTTP_ERROR' | 'UNAUTHORIZED',
  ) {
    super(message);
    this.name = 'LearningHistoryApiError';
  }
}

export function shouldUseLearningHistoryCacheFallback(error: unknown) {
  if (!(error instanceof LearningHistoryApiError)) {
    return false;
  }

  if (error.code !== 'HTTP_ERROR') {
    return error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT';
  }

  // 4xx는 보낸 데이터가 틀렸다는 뜻이라 재시도해도 같은 답이 온다.
  // 캐시로 덮어 성공처럼 처리하면 변경이 조용히 유실된다(복습 과제 소실).
  // 단 408·429는 일시적이라 폴백 대상으로 남긴다.
  const isPermanentClientError =
    error.status >= 400 &&
    error.status < 500 &&
    !NETWORK_RETRYABLE_STATUS_CODES.has(error.status);

  return !isPermanentClientError;
}

function isRetryableError(error: unknown) {
  return (
    error instanceof LearningHistoryApiError &&
    (error.code === 'NETWORK_ERROR' ||
      error.code === 'TIMEOUT' ||
      NETWORK_RETRYABLE_STATUS_CODES.has(error.status))
  );
}

async function parseErrorPayload(response: Response, url: string) {
  const payload = await response.json().catch(() => null);
  const errorMessage =
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof payload.error === 'string' &&
    payload.error
      ? payload.error
      : `Request failed (${response.status})`;

  if (response.status === 400 && payload && typeof payload === 'object' && 'details' in payload) {
    console.warn(`[LearningHistoryApi] 400 validation details (${url}):`, JSON.stringify(payload.details));
  }

  if (response.status === 401 || response.status === 403) {
    throw new LearningHistoryApiError(errorMessage, response.status, 'UNAUTHORIZED');
  }

  throw new LearningHistoryApiError(errorMessage, response.status, 'HTTP_ERROR');
}

function createTimeoutController(timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    controller,
    clear: () => clearTimeout(timeoutId),
  };
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readLearningHistoryApiJson<T>(
  url: string,
  options: RequestInit,
  retries = 1,
): Promise<T> {
  const { controller, clear } = createTimeoutController();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      await parseErrorPayload(response, url);
    }

    const payload = await response.json().catch(() => null);
    if (!payload) {
      throw new LearningHistoryApiError('Empty response payload', response.status, 'HTTP_ERROR');
    }

    return payload as T;
  } catch (error) {
    if (error instanceof LearningHistoryApiError) {
      if (retries > 0 && isRetryableError(error)) {
        await wait(300);
        return readLearningHistoryApiJson<T>(url, options, retries - 1);
      }

      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new LearningHistoryApiError(
        '요청 시간이 초과되었어요. 잠시 후 다시 시도해 주세요.',
        0,
        'TIMEOUT',
      );
      if (retries > 0) {
        await wait(300);
        return readLearningHistoryApiJson<T>(url, options, retries - 1);
      }
      throw timeoutError;
    }

    const networkError = new LearningHistoryApiError(
      '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
      0,
      'NETWORK_ERROR',
    );
    if (retries > 0) {
      await wait(300);
      return readLearningHistoryApiJson<T>(url, options, retries - 1);
    }
    throw networkError;
  } finally {
    clear();
  }
}

export function createRemoteAuthHeaders(authContext: RemoteAuthContext) {
  const headers: Record<string, string> = {
    'x-dasida-account-key': authContext.accountKey,
  };

  if (authContext.kind === 'firebase') {
    headers.Authorization = `Bearer ${authContext.idToken}`;
    return headers;
  }

  headers['x-dasida-session-secret'] = authContext.requestSecret;
  return headers;
}
