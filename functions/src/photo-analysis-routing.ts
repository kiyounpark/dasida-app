import { z } from 'zod';

import type { RunAuth } from './photo-analysis-run-log';

// 사진 본 분석을 어느 길로 보낼지 (10.19 · 정본 ~/dev/dasida-measure/2026-10-19-sonnet-switch/README.md).
// 'openai' = 지금까지의 mini · 'openrouter' = OpenRouter → Google Vertex(미국) Sonnet 5.5.
// 하나라도 아니면 mini — 실패하는 방향이 늘 옛 길이다.
//
// 동의 판으로 가르지 않는다 — 기윤 b안(10.19 19:2x 관제탑 방): 「당장이라도 틀린줄 찾기는 sonnet」.
// 방침 공개 → 서버 전원 Sonnet → 1.0.14 동의 문구 OTA → 1.0.15. (두 모델 안은 「판 2 재동의 학생만」이었다 — README)
export type PhotoAnalysisProvider = 'openai' | 'openrouter';

// 기윤이 콘솔에서 고치는 스위치 문서. 앱은 못 쓴다(클라이언트 규칙 밖 · 서버 admin만 읽음).
//   { provider: 'openai' | 'openrouter', onlyAccounts?: string[] | null, updatedAt?: … }
// 문서가 없거나 provider가 틀리면 mini. onlyAccounts가 배열이면 그 계정만 새 길(기윤 폰 먼저),
// 없거나 null이면 전원(앱·웹·인증 못 한 요청까지).
export const PHOTO_ROUTING_DOC_PATH = 'config/photoAnalysis';

const PhotoRoutingConfigSchema = z.object({
  provider: z.enum(['openai', 'openrouter']),
  // 칸을 빠뜨려도 조용히 mini가 되지 않게 — 없음 = null = 전원 (Fable 리뷰 기록만 3)
  onlyAccounts: z.array(z.string().min(1).max(200)).max(50).nullish(),
});

export type PhotoRoutingConfig = { provider: PhotoAnalysisProvider; onlyAccounts: string[] | null };

export function parsePhotoRoutingConfig(data: unknown): PhotoRoutingConfig | null {
  const parsed = PhotoRoutingConfigSchema.safeParse(data);
  return parsed.success ? { provider: parsed.data.provider, onlyAccounts: parsed.data.onlyAccounts ?? null } : null;
}

/** onlyAccounts를 보려면 인증을 기다려야 한다 — 전원이면 안 기다린다 */
export function routingNeedsAuth(config: PhotoRoutingConfig | null): boolean {
  return config?.provider === 'openrouter' && config.onlyAccounts !== null;
}

/**
 * 새 길로 보낼 조건 = 스위치 켬 ∧ (onlyAccounts면 인증된 그 계정).
 * auth는 onlyAccounts가 있을 때만 본다 — 2초 안에 인증이 안 끝났으면 null로 와서 mini.
 */
export function choosePhotoProvider(input: { config: PhotoRoutingConfig | null; auth: RunAuth | null }): PhotoAnalysisProvider {
  const { config, auth } = input;
  if (config?.provider !== 'openrouter') return 'openai';
  if (config.onlyAccounts === null) return 'openrouter';
  if (!auth?.authVerified || !auth.accountKey) return 'openai';
  return config.onlyAccounts.includes(auth.accountKey) ? 'openrouter' : 'openai';
}

// 라우팅(스위치 문서 + onlyAccounts면 인증)을 본 호출 앞에서 기다리는 상한 — 게이트(3~10초)와 같이 돌아 보통은 이미 끝나 있다.
// 넘기면 mini. 인증 대기 상한(RUN_AUTH_WAIT_MS)과 같은 2초
export const PHOTO_ROUTING_WAIT_MS = 2_000;

// 같은 요청 안 mini 폴백 — 새 길이 타임아웃이 아닌 이유로 실패했고 남은 마감이 이만큼 있을 때만 (Fable 2차 ③).
// 90초 = 10.18 측정 mini 최대 88.7초. 옛 앱(57초 예산)은 마감이 48초 이하라 자동으로 빠진다
export const MINI_FALLBACK_MIN_REMAINING_MS = 90_000;

export function shouldFallbackToMini(errorKind: string, remainingMs: number): boolean {
  return errorKind !== 'provider_timeout' && remainingMs >= MINI_FALLBACK_MIN_REMAINING_MS;
}
