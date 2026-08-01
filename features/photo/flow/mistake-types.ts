import type { MistakeTypeId } from '../types';

/**
 * 실수 유형 6종의 라벨과 통조림 처방.
 * web-proto/survey-data.js의 TYPES와 같은 문구 — 원칙은 "특정 문제의 숫자·식 금지"(어떤 문제가 와도 성립).
 * 짚기가 성공한 경로에서는 AI가 보낸 fix를 쓰고, 여기 fix는 그게 비었을 때의 폴백이다.
 */
const MISTAKE_TYPES: Record<MistakeTypeId, { label: string; fix: string }> = {
  concept_gap: {
    label: '개념 구멍',
    fix: '문제 더 풀기 전에 이 방법이 왜 되는지 설명을 한 번만 다시 보자. 원리가 잡히면 나머지는 따라와.',
  },
  formula_recall: {
    label: '공식 기억',
    fix: '시작 전에 공식을 손으로 세 번 써보자. 외운 게 아니라 손에 붙어야 실전에서 안 흔들려.',
  },
  setup_error: {
    label: '식 세우기',
    fix: '식을 세우면 대입하기 전에 문제 말과 맞는지 한 번 소리 내서 확인하자.',
  },
  calc_slip: {
    label: '계산 손실수',
    fix: '계산을 한 줄에 몰아 쓰지 말고 한 단계 한 줄로 끊어 쓰자. 손실수는 줄 간격에서 잡힌다.',
  },
  procedure_miss: {
    label: '절차 누락',
    fix: '이 방법의 단계를 번호로 적어두고 풀 때마다 지워가며 가자. 빼먹는 자리가 보이게.',
  },
  answer_read: {
    label: '마무리 해석',
    fix: '답 쓰기 전에 "문제가 뭘 물었지?"를 한 번 다시 읽자. 다 풀고 넘어지는 게 제일 아깝잖아.',
  },
};

/** 서버가 모르는 유형을 보내도 노트가 죽지 않게 — 마지막 화면이 비는 게 제일 나쁘다 */
export function mistakeTypeLabel(id: MistakeTypeId | undefined): string {
  return (id && MISTAKE_TYPES[id]?.label) || '유형 미상';
}

export function mistakeTypeFix(id: MistakeTypeId | undefined): string {
  return (id && MISTAKE_TYPES[id]?.fix) || '';
}
