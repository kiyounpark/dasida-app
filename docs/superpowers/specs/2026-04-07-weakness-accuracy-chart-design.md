# 약점 정답률 차트 재설계

**날짜:** 2026-04-07  
**상태:** 승인됨

---

## 배경 및 문제

`HomeWeaknessSection`의 `WeaknessGrowthChart`가 다음 문제를 일으키고 있었다:

1. 빈 상태에서 "1주차 / 2주차 / 지금" 레이블을 하드코딩 — 데이터가 없는데도 차트처럼 보임
2. "재진단 10문제 풀기" CTA — 진단 직후 사용자에게 또 10문제를 요구해 혼란 유발
3. 재진단이 성장 지표로 부적합 — 10문제 진단은 신규 사용자 온보딩 용도였고, 반복 진단은 의미 없음

---

## 확정된 설계

### 1. 컴포넌트 교체 전략

`WeaknessGrowthChart`를 통째로 새 컴포넌트 `WeaknessAccuracyChart`로 교체한다. 기존 컴포넌트는 week 기반으로 설계되어 있어 패치보다 교체가 더 깔끔하다.

### 2. 차트 방식: 약점별 막대 비교

각 약점을 X축 항목으로 두고, 약점별로 막대 2개를 나란히 표시한다:

- **왼쪽 막대 (연한 녹색)**: 진단 때 이 약점의 정답률
- **오른쪽 막대 (진한 녹색)**: 가장 최근 복습 세션의 정답률

레전드: `진단` / `최근 복습`

뱃지: 복습 데이터가 있을 때 "🌱 평균 +X%" 표시

### 3. 빈 상태 (복습 전)

복습 데이터가 없는 경우:
- 왼쪽 막대: 진단 정답률 (연한 녹색 솔리드)
- 오른쪽 막대: 점선 ghost bar
- 힌트 문구: "복습하면 오른쪽이 채워져요"
- **"재진단 CTA" 완전 제거**

### 4. 정답률 정의

**"같은 개념의 문제들에 대한 정답률"** — 문제가 달라도 같은 약점(개념)을 테스트하므로 비교가 유효하다.

- **진단 정답률**: 진단 시도의 `LearningAttemptResult[]` 중 `finalWeaknessId`가 일치하는 결과들의 `isCorrect` 비율
- **복습 정답률**: 해당 약점의 가장 최근 `LearningAttempt` (source='review', primaryWeaknessId 일치)의 `accuracy` 필드

---

## 데이터 레이어 변경

### `DiagnosticSummarySnapshot` 타입 확장

```ts
// features/learner/types.ts
export type DiagnosticSummarySnapshot = {
  attemptId: string;
  completedAt: string;
  topWeaknesses: WeaknessId[];
  accuracy: number;
  weaknessAccuracies: Partial<Record<WeaknessId, number>>;  // 신규
};
```

진단 완료 시점에 `LearningAttemptResult[]`를 `finalWeaknessId`로 그룹핑하여 계산 후 저장.

### `WeaknessProgressItem` 타입 확장

```ts
// features/learning/types.ts
export type WeaknessProgressItem = {
  weaknessId: WeaknessId;
  topicLabel: string;
  weaknessLabel: string;
  stage: ReviewStage;
  completed: boolean;
  diagnosticAccuracy?: number;   // 신규: 진단 때 정답률
  reviewAccuracy?: number;       // 신규: 최근 복습 정답률
};
```

### `buildHomeLearningState` 시그니처 확장

복습 정답률 계산을 위해 `recentReviewAttempts: LearningAttempt[]` 파라미터 추가.

```ts
buildHomeLearningState(
  profile: LearnerProfile,
  summary: LearnerSummaryCurrent,
  peerPresenceSnapshot: PeerPresenceSnapshot | null,
  allReviewTasks: ReviewTask[],
  recentReviewAttempts: LearningAttempt[],   // 신규
)
```

`buildWeaknessProgressItems`에서 `DiagnosticSummarySnapshot.weaknessAccuracies`와 `recentReviewAttempts`를 참조해 각 항목의 `diagnosticAccuracy`, `reviewAccuracy`를 채운다.

---

## 컴포넌트 변경 범위

| 파일 | 변경 내용 |
|------|-----------|
| `features/learner/types.ts` | `DiagnosticSummarySnapshot`에 `weaknessAccuracies` 추가 |
| `features/learning/types.ts` | `WeaknessProgressItem`에 accuracy 필드 추가 |
| `features/learning/home-state.ts` | `buildHomeLearningState` 시그니처 + `buildWeaknessProgressItems` 로직 수정 |
| `features/quiz/components/weakness-growth-chart.tsx` | `WeaknessAccuracyChart`로 전면 교체 |
| `features/quiz/components/home-weakness-section.tsx` | `WeaknessAccuracyChart` props 연결 (`resolvedWeaknessHistory` 제거) |
| 진단 완료 저장 로직 | `weaknessAccuracies` 계산 및 저장 추가 |
| 홈 화면 데이터 페칭 | `recentReviewAttempts` 쿼리 추가 |

---

## 검증 항목

1. 진단 직후 빈 상태: ghost bar 표시, "재진단 CTA" 없음
2. 복습 1회 완료 후: 오른쪽 막대 채워짐, "평균 +X%" 뱃지 표시
3. 약점 3개 모두 표시 (최대 3개, `buildWeaknessProgressItems` 기준)
4. 진단 정답률 0% 엣지케이스: 최소 높이 막대 표시
5. 기존 `HomeLearningState`를 소비하는 다른 컴포넌트 회귀 없음
