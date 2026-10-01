import type { SolveMethodId } from '@/data/diagnosisTree';

import type { MistakeTypeId } from '../types';

/**
 * 느낌 설문 보기 — web-proto/survey-data.js에서 옮겼다(유형 라벨·처방은 mistake-types.ts).
 * 원칙: 특정 문제의 숫자·식 금지(어떤 문제가 와도 성립), 분석이 아니라 느낌을 묻는다.
 */
export type SurveyOption = { type: MistakeTypeId; text: string };

/** 커스텀이 없는 방법은 이 문구 — 모든 방법에 실제 문구 보장 */
const DEFAULT_OPTIONS: SurveyOption[] = [
  { type: 'concept_gap', text: '이 방법의 원리 자체가 잘 안 잡혔어' },
  { type: 'calc_slip', text: '식은 세웠는데 계산에서 미끄러졌어' },
  { type: 'answer_read', text: '다 풀어놓고 마지막에 답을 잘못 쓴 것 같아' },
];

/** 방법별 커스텀 (그 방법의 언어로) — 검증하며 계속 추가한다 */
const BY_METHOD: Partial<Record<SolveMethodId, SurveyOption[]>> = {
  cps: [
    { type: 'concept_gap', text: '(x−a)² 꼴로 만드는 원리가 헷갈렸어' },
    { type: 'calc_slip', text: '식 변형하다가 계산에서 미끄러졌어' },
    { type: 'procedure_miss', text: '(x−a)²=k까지 갔는데 그다음 뭘 할지 몰랐어' },
  ],
  vertex: [
    { type: 'formula_recall', text: '-b/2a 공식이 가물가물했어' },
    { type: 'calc_slip', text: 'x 구하고 대입하다가 계산이 엉켰어' },
    { type: 'answer_read', text: '구한 값에서 뭘 답으로 쓸지 헷갈렸어' },
  ],
  limit: [
    { type: 'concept_gap', text: '극한을 어떻게 쪼개는지 개념이 안 잡혔어' },
    { type: 'calc_slip', text: '식 정리하다가 계산이 엉켰어' },
    { type: 'answer_read', text: '수렴인지 발산인지 마지막 판단이 헷갈렸어' },
  ],
};

/** 방법은 맞는데 오류를 못 찾은 날 전용: answer_read 힌트 버전 */
export const ANSWER_READ_HINT: SurveyOption = { type: 'answer_read', text: '마지막에 답 쓸 때 실수한 것 같아' };

/** 복사해서 준다 — 호출부가 힌트로 갈아끼워도 원본이 안 바뀌게 */
export function surveyOptionsFor(methodId: SolveMethodId | null): SurveyOption[] {
  const custom = methodId ? BY_METHOD[methodId] : undefined;
  return (custom ?? DEFAULT_OPTIONS).slice();
}
