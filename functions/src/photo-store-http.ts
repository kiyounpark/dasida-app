import {
  authenticateLearningHistoryRequest,
  LearningHistoryAuthError,
} from './learning-history-auth';
import { RETRYABLE_CODES, type ApiErrorCode, type ApiErrorResponse } from './photo-store-contract';

/**
 * 1.0.11 사진 저장 함수 다섯(save/getConsent · savePhotoNote · listPhotoNotes · getPhotoNoteImage)이
 * 같이 쓰는 응답·인증 꼴 (줄 0). 세 줄이 같은 오류 모양에서 출발하게 한다.
 */

type JsonResponse = { status(code: number): { json(body: unknown): unknown } };
type RequestHeaders = Record<string, string | string[] | undefined>;

export function sendApiError(
  response: JsonResponse,
  status: number,
  code: ApiErrorCode,
  error: string,
): void {
  const body: ApiErrorResponse = { error, code, retryable: RETRYABLE_CODES.has(code) };
  response.status(status).json(body);
}

/**
 * 계정 헤더 + Bearer를 확인하고 firebase 계정만 통과시킨다(운영엔 익명이 없다).
 * 통과하면 accountKey, 막히면 응답을 이미 보냈으니 null.
 */
export async function requireFirebaseAccount(
  headers: RequestHeaders,
  accountKey: string,
  response: JsonResponse,
): Promise<string | null> {
  // 공용 인증을 부르기 전에 막는다 — 공용 함수는 `user:`가 아닌 키 + 세션 비밀이면 거절 전에
  // users/{키}/private/auth를 써 버린다(learning-history-auth.ts). `user:` 키는 그 안에서 Firestore를 안 건드린다.
  if (!accountKey.startsWith('user:')) {
    sendApiError(response, 403, 'UNAUTHORIZED', 'Authenticated users only');
    return null;
  }

  try {
    const auth = await authenticateLearningHistoryRequest(headers, accountKey);
    if (auth.kind !== 'firebase') {
      sendApiError(response, 403, 'UNAUTHORIZED', 'Authenticated users only');
      return null;
    }
    return auth.accountKey;
  } catch (error) {
    if (error instanceof LearningHistoryAuthError) {
      sendApiError(response, error.status, 'UNAUTHORIZED', error.message);
      return null;
    }
    throw error;
  }
}
