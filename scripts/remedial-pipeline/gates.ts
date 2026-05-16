/**
 * Remedial pipeline 게이트 단일 출처 (Single source of truth).
 *
 * 신규 게이트 추가 시 이 파일만 수정하면 자동으로:
 * - check-triggers.ts 가 약점별 누락 게이트 감지
 * - record-complete.ts 가 통과 게이트 검증
 * - 기존 모든 약점이 자동으로 backfill 큐에 진입
 *
 * Scope 의미:
 * - per-node-remedial: 보완 흐름 파일의 각 노드를 1장씩 검수
 * - graph-remedial: 보완 흐름 파일의 그래프 전체를 학생 여정으로 검수
 * - graph-thinkingstep: review-content-map.ts 의 ThinkingStep 엔트리 검수
 * - derived: 다른 게이트 출력에서 파생 (예: sympy 는 math-teacher 의 equationsToVerify 사용)
 */

export type GateScope =
  | 'per-node-remedial'
  | 'graph-remedial'
  | 'graph-thinkingstep'
  | 'derived';

export type RemedialGate = {
  id: string;
  promptFile: string | null;
  scope: GateScope;
  model: 'opus' | 'sonnet' | null;
  /** 도구로 실행되는 게이트 (Agent 호출 아님) */
  tool?: string;
  /** 사람이 읽는 한 줄 설명 */
  description: string;
};

export const REMEDIAL_GATES: readonly RemedialGate[] = [
  {
    id: 'math-teacher',
    promptFile: 'math-teacher.md',
    scope: 'per-node-remedial',
    model: 'opus',
    description: '수학 교사 페르소나 — 노드별 수식·정의·논리 정확성',
  },
  {
    id: 'struggling-student',
    promptFile: 'struggling-student.md',
    scope: 'per-node-remedial',
    model: 'opus',
    description: '6등급 수포자 학생 페르소나 — 노드별 이해됨/막힘 판정',
  },
  {
    id: 'appearance-reviewer',
    promptFile: 'appearance-reviewer.md',
    scope: 'per-node-remedial',
    model: 'opus',
    description: '외형 검수 — 한글 깨짐/분량/구조/톤',
  },
  {
    id: 'remedial-flow',
    promptFile: 'remedial-flow-reviewer.md',
    scope: 'graph-remedial',
    model: 'opus',
    description: '보완 흐름 그래프 검수 — 학생 여정의 자연스러움',
  },
  {
    id: 'thinkingstep-flow',
    promptFile: 'thinkingstep-flow-reviewer.md',
    scope: 'graph-thinkingstep',
    model: 'opus',
    description: 'ThinkingStep 학습 흐름 검수 — 6등급 학생 시간축 시뮬레이션',
  },
  {
    id: 'sympy',
    promptFile: null,
    scope: 'derived',
    model: null,
    tool: 'verify-formulas.py',
    description: '수식 결정론적 검증 — math-teacher 의 equationsToVerify 입력',
  },
] as const;

export const ALL_GATE_IDS: readonly string[] = REMEDIAL_GATES.map((g) => g.id);

/** 약점별 게이트 통과 기록 형태 */
export type PassedGates = Record<string /* gateId */, boolean>;

/** state.json 의 passedGates 전체 모양 */
export type PassedGatesByWeakness = Record<string /* weaknessId */, PassedGates>;

export function missingGates(passed: PassedGates | undefined): string[] {
  if (!passed) return [...ALL_GATE_IDS];
  return ALL_GATE_IDS.filter((g) => !passed[g]);
}

export function isFullyPassed(passed: PassedGates | undefined): boolean {
  return missingGates(passed).length === 0;
}
