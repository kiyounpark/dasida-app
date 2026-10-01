// 골든 대본 — 웹(web-golden.test.ts)과 앱 대본 모듈이 같은 결과·같은 누름에서 같은 글자를 내는지 묶는다.
// 파일 하나 = 시나리오 하나: 입력(분석 결과·검산·diagnose·누름) + 녹음된 transcript.
// transcript는 옮기기 전 웹으로 녹음했다(B 커밋 2, GOLDEN_RECORD=1). 그 뒤로는 비교만 한다.
import fs from 'node:fs';
import path from 'node:path';

import type { AnalyzePhotoResult } from '../../types';

export const GOLDEN_DIR = path.join(__dirname, '../__fixtures__/golden');
/** 앱만의 갈래(약점 고르기 말풍선) — 웹에 없어 대본 모듈로 녹음했다 */
export const APP_GOLDEN_DIR = path.join(__dirname, '../__fixtures__/golden-app');
export const RECORD = process.env.GOLDEN_RECORD === '1';

/** 버튼은 화면에 뜬 글자(포매터 뒤)로 누른다 · 입력칸은 글자를 넣고 보낸다 · 가짜 시계를 민다 */
export type GoldenStep = string | { text: string } | { wait: number };

export type GoldenNote = {
  date: string;
  photo: boolean;
  quote: string;
  why: string;
  fix: string;
  checks: string;
  tags: string;
  weakness: string[];
  askLine: boolean;
};

/**
 * 단계 하나는 [누름 표식] → 대화에 붙은 것(DOM 순서) → 그 사이 이벤트(부른 순서) → 끝 상태 하나 순서로 적는다.
 * 끝 상태 = 버튼 · 입력칸 · 효과(다시 찍기) · 결말 · 없음(검산 대기 중).
 */
export type GoldenEntry =
  | { press: string }
  | { type: string }
  | { wait: number }
  | { coach: string[]; ask: boolean; cont?: true }
  | { me: string }
  | { card: { title: string; body: string } }
  | { note: GoldenNote }
  | { event: Record<string, unknown> }
  | { buttons: [string, string | null][] }
  | { input: { placeholder: string; maxLength: number; submit: string } }
  | { effect: 'restart' | 'retake_from_gate' }
  | { ending: 'note:success' | 'note:fail' | 'weakness' | 'closed' };

export type GoldenDoc = {
  result: AnalyzePhotoResult;
  /** 검산 응답 — 'match' · 서버 판정 글자('ambiguous'…) · 'pending'(영영 안 옴) */
  verdicts: { check?: string; retry?: string };
  /** diagnoseMethod 응답을 부른 순서대로. null = 요청 실패 */
  diagnose: (Record<string, unknown> | null)[];
  steps: GoldenStep[];
  transcript: GoldenEntry[] | null;
};

/** 대본이 내는 이벤트(의미가 공용인 것)만 골든에 적는다. 업로드·대기·스토어는 플랫폼 몫이라 뺀다 */
const SCRIPT_EVENTS = new Set([
  'method_confirm',
  'error_point_react',
  'quiz_verify',
  'check_answer',
  'survey_pick',
  'weakness_card_shown',
  'note_shown',
]);
/** 앱 골든(약점 고르기를 켠 대본)만 적는 이벤트 — 옮기기 전 웹엔 없던 것 */
const APP_EVENTS = new Set(['weakness_labeled', 'weakness_picked']);
/** 웹 어댑터가 덧붙이는 칸 — 대본 밖 */
const ADAPTER_PARAMS = ['submission_id', 'attempt'];

/** 검산 대기 ms는 100ms 단위로 적는다 — 골든이 묶는 건 "기다렸나(5초)·안 기다렸나(0)"이고, 정확한 ms는 러너 테스트가 잰다 */
const coarse = (value: unknown) => (typeof value === 'number' ? Math.round(value / 100) * 100 : value);

export function goldenEvent(
  name: string,
  params: Record<string, unknown>,
  { appEvents = false } = {},
): GoldenEntry | null {
  if (!SCRIPT_EVENTS.has(name) && !(appEvents && APP_EVENTS.has(name))) return null;
  const rest = { ...params };
  for (const key of ADAPTER_PARAMS) delete rest[key];
  if (name === 'quiz_verify') {
    rest.verify_ms = coarse(rest.verify_ms);
    rest.waited_ms = coarse(rest.waited_ms);
  }
  return { event: { name, ...rest } };
}

export function loadGoldens(dir = GOLDEN_DIR): [string, GoldenDoc][] {
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => [
      file.replace(/\.json$/, ''),
      JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as GoldenDoc,
    ]);
}

export function saveGolden(id: string, doc: GoldenDoc, dir = GOLDEN_DIR) {
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(doc, null, 2) + '\n');
}
