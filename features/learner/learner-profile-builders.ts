import type { LearnerProfile, PendingDiagnosisResumeState } from './types';

/**
 * setPendingDiagnosisResume 컨트롤러 메서드의 프로필 구성 로직.
 *
 * Rest state invariant: pendingDiagnosisResume 설정 시 pendingDiagnosticStartedAt을 원자적으로 제거.
 * 두 필드는 상호 배타적 — pendingDiagnosticStartedAt(퀴즈 진행 중)과
 * pendingDiagnosisResume(분석 파트 재개 가능)은 동시에 존재해서는 안 된다.
 */
export function buildProfileForPendingResume(
  profile: LearnerProfile,
  resumeState: PendingDiagnosisResumeState,
  now = new Date().toISOString(),
): LearnerProfile {
  return {
    ...profile,
    pendingDiagnosisResume: resumeState,
    pendingDiagnosticStartedAt: undefined,
    updatedAt: now,
  };
}
