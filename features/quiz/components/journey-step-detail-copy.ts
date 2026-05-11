import type { JourneyStepKey } from '@/features/learning/home-journey-state';

export type JourneyStepDetailMeta = {
  duration: string;
  difficulty: string;
  questionCount: string;
};

export type JourneyStepDetailCopy = {
  label: string;
  title: string;
  bodyRich: string;
  bodyCompact: string;
  meta: JourneyStepDetailMeta;
  afterStepHint: string;
};

export const JOURNEY_STEP_KEYS = ['diagnostic', 'analysis', 'review', 'exam'] as const;

const COPY_TABLE: Record<JourneyStepKey, JourneyStepDetailCopy> = {
  diagnostic: {
    label: '지금 단계',
    title: 'STEP 1 — 10문제 빠른 진단',
    bodyRich:
      '짧고 가벼운 10문제로 너의 출발점을 잡아볼게.\n네가 어떤 영역에서 흔들리는지 보고, 거기서부터 너만의 여정이 시작돼.',
    bodyCompact: '짧고 가벼운 10문제로 너의 출발점을 잡아볼게.',
    meta: {
      duration: '약 8분',
      difficulty: '기본',
      questionCount: '10문제',
    },
    afterStepHint: '진단 후 → 오답 약점 분석 · 맞춤 복습 · 완벽 마스터로 이어져요.',
  },
  analysis: {
    label: '지금 단계',
    title: 'STEP 2 — 오답 약점 분석',
    bodyRich:
      '진단에서 놓친 문항을 함께 살펴보자.\n어디서 발이 걸렸는지 정리하면 다음 STEP이 가벼워져.',
    bodyCompact: '진단에서 놓친 문항을 함께 살펴보자.',
    meta: {
      duration: '문항당 약 1분',
      difficulty: '맞춤',
      questionCount: '진단 오답 수',
    },
    afterStepHint: '분석 후 → 맞춤 약점 복습으로 이어져요.',
  },
  review: {
    label: '지금 단계',
    title: 'STEP 3 — 맞춤 약점 복습',
    bodyRich:
      '너에게 잘 안 맞았던 영역만 골라서 다시.\n반복할수록 흔들림이 줄어드는 게 보일 거야.',
    bodyCompact: '너에게 잘 안 맞았던 영역만 골라서 다시.',
    meta: {
      duration: '세션당 약 6~10분',
      difficulty: '맞춤',
      questionCount: '약점 영역 6문제',
    },
    afterStepHint: '복습이 쌓이면 → 완벽 마스터로 진입.',
  },
  exam: {
    label: '지금 단계',
    title: 'STEP 4 — 완벽 마스터',
    bodyRich:
      '마지막 점검. 흔들림 없이 가보자.\n네가 만들어 온 여정의 마침표를 같이 찍을게.',
    bodyCompact: '마지막 점검. 흔들림 없이 가보자.',
    meta: {
      duration: '약 12분',
      difficulty: '실전',
      questionCount: '마스터 셋',
    },
    afterStepHint: '여기까지 오면 졸업이야. 끝까지 가보자.',
  },
};

export function getJourneyStepDetailCopy(stepKey: JourneyStepKey): JourneyStepDetailCopy {
  return COPY_TABLE[stepKey] ?? COPY_TABLE.diagnostic;
}
