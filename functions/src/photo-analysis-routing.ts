import { z } from 'zod';

import type { RunAuth } from './photo-analysis-run-log';
import type { PhotoRunConsentFields } from './photo-store-contract';

// 사진 본 분석을 어느 길로 보낼지 (10.19 astra·Fable → 기윤 (a) · 정본 ~/dev/dasida-measure/2026-10-19-sonnet-switch/README.md).
// 'openai' = 지금까지의 mini · 'openrouter' = OpenRouter → Google Vertex(미국) Sonnet 5.5.
// 하나라도 아니면 mini — 실패하는 방향이 늘 옛 길이다.
export type PhotoAnalysisProvider = 'openai' | 'openrouter';

// 기윤이 콘솔에서 고치는 스위치 문서. 앱은 못 쓴다(클라이언트 규칙 밖 · 서버 admin만 읽음).
//   { provider: 'openai' | 'openrouter', onlyAccounts: string[] | null, updatedAt?: … }
// 문서가 없거나 모양이 틀리면 mini. onlyAccounts가 배열이면 그 계정만 새 길(기윤 폰 먼저), null이면 조건 맞는 학생 전원.
export const PHOTO_ROUTING_DOC_PATH = 'config/photoAnalysis';

const PhotoRoutingConfigSchema = z.object({
  provider: z.enum(['openai', 'openrouter']),
  onlyAccounts: z.array(z.string().min(1).max(200)).max(50).nullable(),
});

export type PhotoRoutingConfig = z.infer<typeof PhotoRoutingConfigSchema>;

export function parsePhotoRoutingConfig(data: unknown): PhotoRoutingConfig | null {
  const parsed = PhotoRoutingConfigSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/**
 * 새 길로 보낼 조건 = 스위치 켬 ∧ 인증된 계정 ∧ (onlyAccounts면 그 안) ∧ 지금 판의 분석 동의.
 * 동의는 판 2(이전받는 자에 OpenRouter·Google을 적은 문구)부터 — 판 1은 「OpenAI(미국)」까지만 허락했다.
 * analysisConsent는 runConsentLabels가 isConsentOn(…, 'analysis')로 찍은 값이라 판 비교가 이미 들어 있다.
 */
export function choosePhotoProvider(input: {
  config: PhotoRoutingConfig | null;
  auth: RunAuth | null;
  analysisConsent: PhotoRunConsentFields['analysisConsent'];
}): PhotoAnalysisProvider {
  const { config, auth, analysisConsent } = input;
  if (config?.provider !== 'openrouter') return 'openai';
  if (!auth?.authVerified || !auth.accountKey) return 'openai';
  if (config.onlyAccounts && !config.onlyAccounts.includes(auth.accountKey)) return 'openai';
  return analysisConsent === 'agreed' ? 'openrouter' : 'openai';
}

// 라우팅(스위치 문서 + 인증·동의)을 본 호출 앞에서 기다리는 상한 — 게이트(3~10초)와 같이 돌아 보통은 이미 끝나 있다.
// 넘기면 mini. 인증 대기 상한(RUN_AUTH_WAIT_MS)과 같은 2초
export const PHOTO_ROUTING_WAIT_MS = 2_000;

// 같은 요청 안 mini 폴백 — 새 길이 타임아웃이 아닌 이유로 실패했고 남은 마감이 이만큼 있을 때만 (Fable 2차 ③).
// 90초 = 10.18 측정 mini 최대 88.7초. 옛 앱(57초 예산)은 마감이 48초 이하라 자동으로 빠진다
export const MINI_FALLBACK_MIN_REMAINING_MS = 90_000;

export function shouldFallbackToMini(errorKind: string, remainingMs: number): boolean {
  return errorKind !== 'provider_timeout' && remainingMs >= MINI_FALLBACK_MIN_REMAINING_MS;
}
