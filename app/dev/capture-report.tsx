import { router } from 'expo-router';

import { QuizResultReportView } from '@/features/quiz/components/quiz-result-report-view';
import type { WeaknessId } from '@/data/diagnosisMap';
import type { QuizResultSummary } from '@/features/quiz/types';

// 마케팅 영상 컷6용 약점 리포트 캡처 화면.
// 실제 결과 리포트 UI(QuizResultReportView)를 그대로 렌더링하고,
// 데이터만 미적분 모의고사답게 큐레이션한다. (지어낸 성과 수치 없음 — 실제 약점/단원만 사용)
// 대표 약점은 컷5 진단 플로우 데모와 동일한 "풀이 순서 혼동"으로 맞춰 영상 흐름을 잇는다.
const SUMMARY: QuizResultSummary = {
  attemptId: 'capture-report',
  startedAt: '2026-06-26T09:00:00.000Z',
  completedAt: '2026-06-26T09:25:00.000Z',
  total: 22,
  correct: 15,
  wrong: 7,
  accuracy: 0.68,
  allCorrect: false,
  topWeaknesses: [
    'solving_order_confusion', // 풀이 순서 혼동 · 미분 (대표)
    'derivative_calculation', // 미분 계산 부족 · 미분
    'g3_limit', // 극한 계산 · 극한
    'g3_integral', // 적분 계산 · 적분
    'g3_sequence', // 수열 계산 · 수열
  ],
  wrongByWeakness: {
    solving_order_confusion: 3,
    derivative_calculation: 2,
    g3_limit: 2,
    g3_integral: 1,
    g3_sequence: 1,
  } as Record<WeaknessId, number>,
};

export default function CaptureReportScreen() {
  return (
    <QuizResultReportView
      summary={SUMMARY}
      saveState="saved"
      saveErrorMessage={null}
      persistResult={async () => {}}
      onOpenWeaknessPractice={() => router.replace('/dev')}
      optInCard={{
        state: 'dismissed', // 망각 곡선 알림 카드는 숨겨 리포트 자체에 집중
        weaknessLabels: [],
        onEnable: async () => {},
        onDismiss: () => {},
      }}
    />
  );
}
