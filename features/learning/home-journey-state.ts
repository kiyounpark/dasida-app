import { diagnosisMap } from '@/data/diagnosisMap';
import type { LearnerProfile } from '@/features/learner/types';
import type { LearnerSummaryCurrent } from '@/features/learning/types';

/**
 * 여정보드 상태 머신 규약
 * =====================================
 *
 * 이 파일은 학습자 여정의 진실 소스(single source of truth)다.
 *
 * ## 두 축: state vs stepKey
 *
 * - `JourneyStateKey` — 사용자가 지금 어느 "상황"에 있는지.
 *   copy(말풍선/CTA/본문)와 동작(ctaAction)을 결정한다. state는 자주 늘어난다.
 * - `JourneyStepKey` — 캐릭터가 보드 위 어느 "노드"에 시각적으로 머무는지.
 *   4개 노드(diagnostic/analysis/review/exam)로 고정. 노드 UI 확장과 함께가 아니면 늘리지 않는다.
 *
 * ## 다대일 매핑은 의도된 설계
 *
 * 하나의 stepKey는 복수 state를 받는다. 예:
 *   - diagnostic: journey_not_started, diagnostic_in_progress
 *   - analysis:   result_pending, diagnostic_analysis_pending
 *   - review:     viewed_pre_practice, practice_in_progress
 *   - exam:       journey_complete_pending, journey_graduated
 *
 * 같은 노드에서 시각은 동일하되 말풍선/CTA로 "무엇을 해야 하는지"를 분화한다.
 * 시각까지 구분해야 한다면 그것은 별도 UX 스펙의 결정이지, state 추가의 문제가 아니다.
 *
 * ## stale 판정 규칙
 *
 * pending 플래그가 fresh한지 판정할 때는 **시간 기반을 메인**으로 쓴다
 * (pendingAt > latestCompletedAt). attemptId가 함께 저장된 pending에는
 * **attemptId 동일성을 보조 가드**로 덧붙여 same-attempt race를 방어한다.
 * `isPendingDiagnosticFresh`, `isPendingPracticeFresh`, `hasValidPendingResume`
 * 세 함수는 이 규약을 따른다.
 *
 * ## 우선순위는 getCurrentState의 early-return 순서가 그대로 스펙이다
 *
 * 새 state를 추가할 때는 아래 순서 중 어디에 끼울지 반드시 명시한다:
 *   1. journey_graduated            (졸업은 항상 최우선)
 *   2. diagnostic_analysis_pending  (진단만 미완료인 이어서 상태)
 *   3. diagnostic_in_progress       (10문제 진단 중단)
 *   4. journey_not_started          (진단 기록 없음)
 *   5. journey_complete_pending     (최신 진단 이후 review 활동 있음)
 *   6. practice_in_progress         (결과 확인 + pending 연습 fresh)
 *   7. viewed_pre_practice          (결과 확인만 완료)
 *   8. result_pending               (기본 — 진단 완료, 결과 미확인)
 */

// 캐릭터가 위치한 시각적 단계 (JourneyBoard의 4노드). state 추가와 무관하게 유지.
export type JourneyStepKey = 'diagnostic' | 'analysis' | 'review' | 'exam';
export type JourneyStepStatus = 'completed' | 'active' | 'pending' | 'locked';

// 사용자 여정 state. Phase 1은 5개 구현(2,5는 Phase 2).
export type JourneyStateKey =
  | 'journey_not_started'
  | 'diagnostic_in_progress'
  | 'diagnostic_analysis_pending'
  | 'result_pending'
  | 'viewed_pre_practice'
  | 'practice_in_progress'
  | 'journey_complete_pending'
  | 'journey_graduated';

export type JourneyCtaAction =
  | 'start_diagnostic'
  | 'resume_diagnosis'
  | 'open_result'
  | 'open_review'
  | 'graduate_practice'
  | 'none';

export type HomeJourneyStep = {
  key: JourneyStepKey;
  number: number;
  title: string;
  detail: string;
  status: JourneyStepStatus;
  statusLabel: string;
};

export type HomeJourneyState = {
  eyebrow: string;
  title: string;
  body: string;
  progressLabel: string;
  currentStateKey: JourneyStateKey;
  currentStepKey: JourneyStepKey;
  currentStepTitle: string;
  currentStepBody: string;
  currentBubbleText: string;
  ctaAction: JourneyCtaAction;
  ctaLabel: string;
  ctaBody: string;
  steps: HomeJourneyStep[];
};

const stepTitles: Record<JourneyStepKey, string> = {
  diagnostic: '10문제 빠른 진단',
  analysis: '오답 약점 분석',
  review: '맞춤 약점 연습',
  exam: '완벽 마스터',
};

// state → 시각적 stepKey (캐릭터 위치)
const stateToStepKey: Record<JourneyStateKey, JourneyStepKey> = {
  journey_not_started: 'diagnostic',
  diagnostic_in_progress: 'diagnostic',
  diagnostic_analysis_pending: 'analysis',
  result_pending: 'analysis',
  viewed_pre_practice: 'review',
  practice_in_progress: 'review',
  journey_complete_pending: 'exam',
  journey_graduated: 'exam',
};

type StateCopy = {
  bubbleText: string;
  ctaAction: JourneyCtaAction;
  ctaLabel: string;
  ctaBody: string;
};

const stateCopyTable: Record<JourneyStateKey, StateCopy> = {
  journey_not_started: {
    bubbleText: '반가워요!\n첫 진단 시작할게요',
    ctaAction: 'start_diagnostic',
    ctaLabel: '첫 진단 시작하기',
    ctaBody: '10문제로 지금 위치를 먼저 확인합니다',
  },
  diagnostic_in_progress: {
    bubbleText: '풀던 진단 이어할까요?',
    ctaAction: 'start_diagnostic',
    ctaLabel: '진단 다시 시작하기',
    ctaBody: '처음부터 다시 풀면 최신 약점을 잡을 수 있어요',
  },
  diagnostic_analysis_pending: {
    bubbleText: '퀴즈는 끝! 약점 분석만 남았어요',
    ctaAction: 'resume_diagnosis',
    ctaLabel: '약점 분석 이어서 하기',
    ctaBody: '퀴즈는 건너뛰고 분석만 마무리합니다',
  },
  result_pending: {
    bubbleText: '약점 찾기 끝! 결과 볼까요?',
    ctaAction: 'open_result',
    ctaLabel: '약점 결과 보기',
    ctaBody: '결과를 보면 연습 단계로 이어집니다',
  },
  viewed_pre_practice: {
    bubbleText: '약점 확인 끝! 연습 차례예요',
    ctaAction: 'open_review',
    ctaLabel: '약점 연습 시작하기',
    ctaBody: '약점 연습을 마치면 여정이 완성됩니다',
  },
  practice_in_progress: {
    bubbleText: '풀던 연습 이어할까요?',
    ctaAction: 'open_review',
    ctaLabel: '연습 다시 시작하기',
    ctaBody: '약점 연습을 마치면 여정이 완성됩니다',
  },
  journey_complete_pending: {
    bubbleText: '여정 완성! 새 출발 할까요?',
    ctaAction: 'graduate_practice',
    ctaLabel: '새로 시작하기 →',
    ctaBody: '여정을 마무리하고 일반 허브로 이동합니다',
  },
  journey_graduated: {
    // 이 state에서는 여정보드 자체가 숨겨지므로 문구는 사용되지 않는다.
    bubbleText: '',
    ctaAction: 'none',
    ctaLabel: '',
    ctaBody: '',
  },
};

function hasValidPendingResume(
  profile: LearnerProfile | null,
  summary: LearnerSummaryCurrent,
): boolean {
  const pending = profile?.pendingDiagnosisResume;

  // ── 구조 검증 ──
  if (!pending) return false;
  if (pending.schemaVersion !== 1) return false;
  if (!pending.attemptId) return false;
  if (pending.diagnosisQueue.length === 0) return false;

  // ── stale 판정 ①: 시간 기반 (isPendingDiagnosticFresh / isPendingPracticeFresh와 동일 패턴)
  // cross-device race 방어 — 다른 기기에서 새 attempt가 완료된 뒤 구기기의 오래된 resume을 열었을 때 stale 처리.
  const savedAtMs = Date.parse(pending.savedAt);
  const latestCompletedAtRaw = summary.latestDiagnosticSummary?.completedAt;
  if (latestCompletedAtRaw) {
    const latestCompletedAtMs = Date.parse(latestCompletedAtRaw);
    if (
      !Number.isNaN(savedAtMs) &&
      !Number.isNaN(latestCompletedAtMs) &&
      savedAtMs <= latestCompletedAtMs
    ) {
      return false;
    }
  }

  // ── stale 판정 ②: attemptId 보조 가드 (same-attempt race 방어)
  // finalize 직후 clear 실패 + 뒤늦은 save가 같은 attemptId로 남았을 때 stale 처리.
  if (summary.latestDiagnosticSummary?.attemptId === pending.attemptId) {
    return false;
  }

  return true;
}

function isPendingDiagnosticFresh(
  profile: LearnerProfile | null,
  summary: LearnerSummaryCurrent,
): boolean {
  const pending = profile?.pendingDiagnosticStartedAt;
  if (!pending) {
    return false;
  }

  const pendingAt = Date.parse(pending);
  if (Number.isNaN(pendingAt)) {
    return false;
  }

  const latestCompleted = summary.latestDiagnosticSummary?.completedAt;
  if (!latestCompleted) {
    // 아직 완료된 진단이 없으면 pending은 진행 중인 첫 진단.
    return true;
  }

  const latestCompletedAt = Date.parse(latestCompleted);
  if (Number.isNaN(latestCompletedAt)) {
    return true;
  }

  // pending이 최신 완료 시각보다 이후면 새 진단을 시작해 중단된 상태.
  return pendingAt > latestCompletedAt;
}

function isPendingPracticeFresh(
  profile: LearnerProfile | null,
  summary: LearnerSummaryCurrent,
): boolean {
  const pending = profile?.pendingPracticeStartedAt;
  if (!pending) {
    return false;
  }

  const pendingAt = Date.parse(pending);
  if (Number.isNaN(pendingAt)) {
    return false;
  }

  const latestDiagnosticCompleted = summary.latestDiagnosticSummary?.completedAt;
  if (!latestDiagnosticCompleted) {
    // 진단이 없으면 연습 플래그도 stale 취급(정상 흐름이라면 불가능).
    return false;
  }

  const latestDiagnosticCompletedAt = Date.parse(latestDiagnosticCompleted);
  if (Number.isNaN(latestDiagnosticCompletedAt)) {
    return false;
  }

  // 최신 진단 완료 이후에 시작된 연습이어야 유효.
  return pendingAt > latestDiagnosticCompletedAt;
}

function hasActivityAfter(
  summary: LearnerSummaryCurrent,
  kind: 'review' | 'exam',
  timestamp?: string,
) {
  if (!timestamp) {
    return false;
  }

  const anchor = Date.parse(timestamp);
  if (Number.isNaN(anchor)) {
    return false;
  }

  return summary.recentActivity.some((activity) => {
    if (activity.kind !== kind) {
      return false;
    }

    const occurredAt = Date.parse(activity.occurredAt);
    return !Number.isNaN(occurredAt) && occurredAt > anchor;
  });
}

function getWeaknessLabel(summary: LearnerSummaryCurrent) {
  const weaknessId = summary.latestDiagnosticSummary?.topWeaknesses[0];
  if (!weaknessId) {
    return '최근 약점 없음';
  }

  return diagnosisMap[weaknessId]?.labelKo ?? '알 수 없음';
}

function getCurrentState(
  summary: LearnerSummaryCurrent,
  profile: LearnerProfile | null,
): JourneyStateKey {
  // 1: 졸업은 항상 최우선.
  if (profile?.practiceGraduatedAt) {
    return 'journey_graduated';
  }

  // 2: 진단만 미완료인 "이어서" 상태 — 10문제 퀴즈는 끝났고 약점 분석이 남음.
  //   graduated 다음으로 우선 체크 — 졸업 후 stale resume 레코드가 있어도 1번이 먼저 잡음.
  if (hasValidPendingResume(profile, summary)) {
    return 'diagnostic_analysis_pending';
  }

  // 3: 10문제 진단 중단 — 최초 진단 미완료 또는 최신 완료 이후 새 진단이 시작돼 중단된 경우.
  if (isPendingDiagnosticFresh(profile, summary)) {
    return 'diagnostic_in_progress';
  }

  // 4: 진단 기록이 하나도 없음.
  const hasLatestDiagnostic = Boolean(summary.latestDiagnosticSummary);
  if (!hasLatestDiagnostic) {
    return 'journey_not_started';
  }

  // 5: 최신 진단 이후 review 활동이 있으면 여정이 거의 끝난 상태.
  const latestDiagnosticAt = summary.latestDiagnosticSummary?.completedAt;
  const hasReviewAfterLatestDiagnostic = hasActivityAfter(summary, 'review', latestDiagnosticAt);
  if (hasReviewAfterLatestDiagnostic) {
    return 'journey_complete_pending';
  }

  // 6: 연습 중단 — 7번 조건(결과 확인) 성립 + 최신 진단 이후 시작된 pending 연습이 있을 때.
  if (profile?.latestDiagnosticResultViewedAt && isPendingPracticeFresh(profile, summary)) {
    return 'practice_in_progress';
  }

  // 7: 결과 확인 완료.
  if (profile?.latestDiagnosticResultViewedAt) {
    return 'viewed_pre_practice';
  }

  // 8 (기본): 결과 확인 전 — 진단 완료 직후.
  return 'result_pending';
}

function getStepStatus(
  currentStep: JourneyStepKey,
  step: JourneyStepKey,
): JourneyStepStatus {
  if (currentStep === 'diagnostic') {
    return step === 'diagnostic' ? 'active' : 'locked';
  }

  if (currentStep === 'analysis') {
    if (step === 'diagnostic') {
      return 'completed';
    }

    if (step === 'analysis') {
      return 'active';
    }

    return step === 'review' ? 'pending' : 'locked';
  }

  if (currentStep === 'review') {
    if (step === 'diagnostic' || step === 'analysis') {
      return 'completed';
    }

    return step === 'review' ? 'active' : 'pending';
  }

  // currentStep === 'exam'
  if (step === 'exam') {
    return 'active';
  }
  return 'completed';
}

function getStepDetail(
  step: JourneyStepKey,
  summary: LearnerSummaryCurrent,
): string {
  if (step === 'diagnostic') {
    return summary.latestDiagnosticSummary
      ? `최근 약점 · ${getWeaknessLabel(summary)}`
      : '10문항 · 약 3분';
  }

  if (step === 'analysis') {
    return summary.latestDiagnosticSummary
      ? `${getWeaknessLabel(summary)} 중심 결과 확인`
      : '최근 진단 결과 확인';
  }

  if (step === 'review') {
    const dueReviewTasks = summary.dueReviewTasks ?? [];
    if (dueReviewTasks[0]) {
      return `약점 연습 ${dueReviewTasks.length}개 준비됨`;
    }

    return '약점을 다시 잡는 단계';
  }

  return '연습 뒤 실전에 적용';
}

function getStepStatusLabel(
  step: JourneyStepKey,
  status: JourneyStepStatus,
  summary: LearnerSummaryCurrent,
): string {
  if (status === 'completed') {
    return '완료';
  }

  if (status === 'locked') {
    return '잠김';
  }

  if (status === 'pending') {
    return '대기 중';
  }

  if (step === 'diagnostic') {
    return '진행 중';
  }

  if (step === 'review') {
    const dueCount = summary.dueReviewTasks?.length ?? 0;
    return dueCount > 0 ? `연습 ${dueCount}개` : '활성화';
  }

  return '활성화';
}

function getCurrentStepBody(
  currentStepKey: JourneyStepKey,
  summary: LearnerSummaryCurrent,
): string {
  switch (currentStepKey) {
    case 'analysis':
      return `${getWeaknessLabel(summary)}부터 확인하면 연습 단계로 바로 이어집니다.`;
    case 'review': {
      const dueCount = summary.dueReviewTasks?.length ?? 0;
      if (dueCount === 0) {
        return '약점 연습을 마치면 여정이 완성됩니다.';
      }
      return dueCount > 1
        ? `오늘은 연습 ${dueCount}개를 차례로 정리하면 됩니다.`
        : '오늘은 약점 1개만 짧게 다시 잡으면 됩니다.';
    }
    case 'exam':
      return '여정 마무리까지 한 걸음 남았어요.';
    default:
      return '첫 기록만 생기면 분석, 연습, 실전 적용까지 한 줄로 이어집니다.';
  }
}

export function buildHomeJourneyState(
  summary: LearnerSummaryCurrent,
  profile: LearnerProfile | null,
): HomeJourneyState {
  const currentStateKey = getCurrentState(summary, profile);
  const currentStepKey = stateToStepKey[currentStateKey];
  const copy = stateCopyTable[currentStateKey];

  const stepOrder: JourneyStepKey[] = ['diagnostic', 'analysis', 'review', 'exam'];
  const currentStepIndex = stepOrder.indexOf(currentStepKey);
  const steps = stepOrder.map((step, index) => {
    const status = getStepStatus(currentStepKey, step);

    return {
      key: step,
      number: index + 1,
      title: stepTitles[step],
      detail: getStepDetail(step, summary),
      status,
      statusLabel: getStepStatusLabel(step, status, summary),
    };
  });

  return {
    eyebrow: '학습 여정',
    title: '지금 단계만 따라가면 됩니다.',
    body: '진단에서 분석, 연습, 실전 적용까지 한 줄로 이어집니다.',
    progressLabel: `${currentStepIndex + 1} / 4 단계`,
    currentStateKey,
    currentStepKey,
    currentStepTitle: stepTitles[currentStepKey],
    currentStepBody: getCurrentStepBody(currentStepKey, summary),
    currentBubbleText: copy.bubbleText,
    ctaAction: copy.ctaAction,
    ctaLabel: copy.ctaLabel,
    ctaBody: copy.ctaBody,
    steps,
  };
}
