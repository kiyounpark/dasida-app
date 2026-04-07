# Weakness Accuracy Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `WeaknessGrowthChart`를 약점별 정답률 비교 차트(`WeaknessAccuracyChart`)로 교체하고, 진단 시점에 약점별 정답률을 저장하여 복습 후 성장을 시각화한다.

**Architecture:** 진단 완료 시 `LearningAttemptResult`를 약점별로 집계해 `DiagnosticSummarySnapshot.weaknessAccuracies`에 저장. 홈 화면에서 `recentReviewAttempts`를 추가로 로드해 `WeaknessProgressItem`에 정답률을 채운 뒤, 새 `WeaknessAccuracyChart` 컴포넌트가 막대 차트로 렌더링한다.

**Tech Stack:** TypeScript, React Native, Zod (schema validation in Cloud Functions), AsyncStorage (local dev-guest path)

---

### Task 1: `DiagnosticSummarySnapshot` 타입에 `weaknessAccuracies` 추가

**Files:**
- Modify: `features/learner/types.ts`

- [ ] **Step 1: 타입 확장**

```ts
// features/learner/types.ts
export type DiagnosticSummarySnapshot = {
  attemptId: string;
  completedAt: string;
  topWeaknesses: WeaknessId[];
  accuracy: number;
  weaknessAccuracies: Partial<Record<WeaknessId, number>>;
};
```

- [ ] **Step 2: 타입체크 확인**

```bash
npx tsc --noEmit 2>&1 | grep "weaknessAccuracies\|DiagnosticSummarySnapshot" | head -20
```

기존에 `DiagnosticSummarySnapshot`을 리터럴로 생성하는 곳들에서 에러가 나면 Step 3에서 수정.

- [ ] **Step 3: 기존 생성 코드에 `weaknessAccuracies: {}` 추가**

```bash
grep -rn "DiagnosticSummarySnapshot\b" features/ functions/ --include="*.ts" --include="*.tsx" | grep -v "type\|import\|interface"
```

빌드 에러가 난 파일마다 `weaknessAccuracies: {}` 를 추가해 타입 에러 해소.

- [ ] **Step 4: 커밋**

```bash
git add features/learner/types.ts
git commit -m "feat: DiagnosticSummarySnapshot에 weaknessAccuracies 필드 추가"
```

---

### Task 2: 로컬 리포지토리에서 `weaknessAccuracies` 계산

**Files:**
- Modify: `features/learning/local-learning-history-repository.ts` (line ~261)

- [ ] **Step 1: `buildWeaknessAccuracies` 헬퍼 함수 추가**

`local-learning-history-repository.ts`의 `buildRepeatedWeaknesses` 함수 바로 위에 추가:

```ts
function buildWeaknessAccuracies(
  diagnosticAttemptId: string,
  results: LearningAttemptResult[],
): Partial<Record<WeaknessId, number>> {
  const diagnosticResults = results.filter(
    (r) => r.attemptId === diagnosticAttemptId && r.finalWeaknessId !== null,
  );

  const grouped = new Map<WeaknessId, { correct: number; total: number }>();
  for (const r of diagnosticResults) {
    const id = r.finalWeaknessId as WeaknessId;
    const existing = grouped.get(id) ?? { correct: 0, total: 0 };
    grouped.set(id, {
      correct: existing.correct + (r.isCorrect ? 1 : 0),
      total: existing.total + 1,
    });
  }

  const accuracies: Partial<Record<WeaknessId, number>> = {};
  for (const [id, { correct, total }] of grouped) {
    if (total > 0) {
      accuracies[id] = Math.round((correct / total) * 100);
    }
  }
  return accuracies;
}
```

- [ ] **Step 2: `latestDiagnosticSummary` 빌드 시 `weaknessAccuracies` 포함**

`local-learning-history-repository.ts` line ~261의 `latestDiagnosticSummary` 객체 리터럴 수정:

```ts
latestDiagnosticSummary: latestDiagnosticAttempt
  ? {
      attemptId: latestDiagnosticAttempt.id,
      completedAt: latestDiagnosticAttempt.completedAt,
      topWeaknesses: latestDiagnosticAttempt.topWeaknesses,
      accuracy: latestDiagnosticAttempt.accuracy,
      weaknessAccuracies: buildWeaknessAccuracies(latestDiagnosticAttempt.id, results),
    }
  : undefined,
```

- [ ] **Step 3: 타입체크**

```bash
npx tsc --noEmit 2>&1 | head -20
```

에러 없음 확인.

- [ ] **Step 4: 커밋**

```bash
git add features/learning/local-learning-history-repository.ts
git commit -m "feat: 로컬 리포지토리에서 약점별 진단 정답률 계산"
```

---

### Task 3: Cloud Functions `buildSummary`에 `weaknessAccuracies` 추가

**Files:**
- Modify: `functions/src/learning-history.ts` (Zod 스키마 + `buildSummary` 함수)
- Modify: `functions/tests/learning-history-weakness-practice.test.ts`

- [ ] **Step 1: `DiagnosticSummarySnapshotSchema` 확장**

`functions/src/learning-history.ts` line 93의 스키마 수정:

```ts
const DiagnosticSummarySnapshotSchema = z.object({
  attemptId: z.string().min(1).max(120),
  completedAt: z.string().datetime(),
  topWeaknesses: z.array(WeaknessIdSchema).max(3),
  accuracy: z.number().int().min(0).max(100),
  weaknessAccuracies: z.record(WeaknessIdSchema, z.number().int().min(0).max(100)).default({}),
});
```

- [ ] **Step 2: `buildWeaknessAccuracies` 헬퍼를 `functions/src/learning-history.ts`에 추가**

`buildRepeatedWeaknesses` 함수 바로 위에 추가 (Task 2 Step 1과 동일한 로직):

```ts
function buildWeaknessAccuracies(
  diagnosticAttemptId: string,
  results: LearningAttemptResult[],
): Partial<Record<WeaknessId, number>> {
  const diagnosticResults = results.filter(
    (r) => r.attemptId === diagnosticAttemptId && r.finalWeaknessId !== null,
  );

  const grouped = new Map<WeaknessId, { correct: number; total: number }>();
  for (const r of diagnosticResults) {
    const id = r.finalWeaknessId as WeaknessId;
    const existing = grouped.get(id) ?? { correct: 0, total: 0 };
    grouped.set(id, {
      correct: existing.correct + (r.isCorrect ? 1 : 0),
      total: existing.total + 1,
    });
  }

  const accuracies: Partial<Record<WeaknessId, number>> = {};
  for (const [id, { correct, total }] of grouped) {
    if (total > 0) {
      accuracies[id] = Math.round((correct / total) * 100);
    }
  }
  return accuracies;
}
```

- [ ] **Step 3: `buildSummary`의 `latestDiagnosticSummary` 수정**

`functions/src/learning-history.ts` line ~779의 `latestDiagnosticSummary` 객체 수정:

```ts
latestDiagnosticSummary: latestDiagnosticAttempt
  ? {
      attemptId: latestDiagnosticAttempt.id,
      completedAt: latestDiagnosticAttempt.completedAt,
      topWeaknesses: latestDiagnosticAttempt.topWeaknesses,
      accuracy: latestDiagnosticAttempt.accuracy,
      weaknessAccuracies: buildWeaknessAccuracies(latestDiagnosticAttempt.id, results),
    }
  : undefined,
```

- [ ] **Step 4: 테스트에 `weaknessAccuracies` 검증 추가**

`functions/tests/learning-history-weakness-practice.test.ts` line ~453 근처의 `latestDiagnosticSummary` 검증 테스트 뒤에 추가:

```ts
// weaknessAccuracies: 진단 결과에서 약점별 정답률이 계산됨
const weaknessAccuracies = summary.latestDiagnosticSummary?.weaknessAccuracies;
assert.ok(weaknessAccuracies, 'weaknessAccuracies should exist');
// formula_understanding: diagnosticResults에서 isCorrect 비율로 계산됨
// (실제 테스트 fixture의 결과에 맞는 값 확인)
assert.ok(typeof weaknessAccuracies['formula_understanding'] === 'number');
assert.ok(weaknessAccuracies['formula_understanding']! >= 0);
assert.ok(weaknessAccuracies['formula_understanding']! <= 100);
```

- [ ] **Step 5: 테스트 실행**

```bash
cd /Users/baggiyun/dev/dasida-app/functions && node --test tests/learning-history-weakness-practice.test.ts 2>&1 | tail -20
```

Expected: 모든 테스트 PASS

- [ ] **Step 6: 커밋**

```bash
git add functions/src/learning-history.ts functions/tests/learning-history-weakness-practice.test.ts
git commit -m "feat: Cloud Functions buildSummary에 약점별 진단 정답률 추가"
```

---

### Task 4: `WeaknessProgressItem` 타입 확장 + `home-state.ts` 수정

**Files:**
- Modify: `features/learning/types.ts`
- Modify: `features/learning/home-state.ts`

- [ ] **Step 1: `WeaknessProgressItem` 타입에 accuracy 필드 추가**

`features/learning/types.ts` line 110:

```ts
export type WeaknessProgressItem = {
  weaknessId: WeaknessId;
  topicLabel: string;
  weaknessLabel: string;
  stage: ReviewStage;
  completed: boolean;
  diagnosticAccuracy?: number;
  reviewAccuracy?: number;
};
```

- [ ] **Step 2: `HomeLearningState`에서 `resolvedWeaknessHistory` 제거**

`features/learning/home-state.ts` line 59에서 `resolvedWeaknessHistory` 필드 삭제:

```ts
// 삭제할 줄:
resolvedWeaknessHistory: Array<{ weekLabel: string; count: number }>;
```

- [ ] **Step 3: `buildHomeLearningState` 시그니처에 `recentReviewAttempts` 파라미터 추가**

```ts
export function buildHomeLearningState(
  _profile: LearnerProfile,
  summary: LearnerSummaryCurrent,
  peerPresenceSnapshot: PeerPresenceSnapshot | null = null,
  allReviewTasks: ReviewTask[] = [],
  recentReviewAttempts: LearningAttempt[] = [],
): HomeLearningState {
```

`LearningAttempt` import 추가:
```ts
import type { LearnerSummaryCurrent, LearningAttempt, PeerPresenceSnapshot, ReviewTask, WeaknessProgressItem } from './types';
```

- [ ] **Step 4: `buildWeaknessProgressItems`에 accuracy 계산 로직 추가**

`features/learning/home-state.ts`의 `buildWeaknessProgressItems` 함수 시그니처와 내부 수정:

```ts
function buildWeaknessProgressItems(
  summary: LearnerSummaryCurrent,
  allReviewTasks: ReviewTask[],
  recentReviewAttempts: LearningAttempt[],
): WeaknessProgressItem[] {
  // ... 기존 activeTasks, completedTasks, combined, deduped 로직 그대로 ...

  return deduped.slice(0, 3).map((t) => {
    const diagnosticAccuracy =
      summary.latestDiagnosticSummary?.weaknessAccuracies?.[t.weaknessId];
    const reviewAccuracy = recentReviewAttempts
      .filter((a) => a.source === 'review' && a.primaryWeaknessId === t.weaknessId)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0]?.accuracy;

    return {
      weaknessId: t.weaknessId,
      topicLabel: diagnosisMap[t.weaknessId]?.topicLabel ?? '',
      weaknessLabel: diagnosisMap[t.weaknessId]?.labelKo ?? t.weaknessId,
      stage: t.stage,
      completed: t.completed,
      diagnosticAccuracy,
      reviewAccuracy,
    };
  });
}
```

- [ ] **Step 5: `buildHomeLearningState` return 객체에서 `resolvedWeaknessHistory` 제거, `recentReviewAttempts` 전달**

```ts
return {
  ...heroContent,
  journey: buildHomeJourneyState(summary),
  peerPresence,
  latestDiagnosticSummary: summary.latestDiagnosticSummary,
  nextReviewTask,
  featuredExamCard: {
    ...featuredExamCard,
    examId: summary.featuredExamState.examId ?? featuredExamCard.examId,
  },
  recentResultCard,
  recentActivity: buildRecentActivity(summary),
  weaknessProgressItems: buildWeaknessProgressItems(summary, allReviewTasks, recentReviewAttempts),
  // resolvedWeaknessHistory 제거됨
};
```

`buildResolvedWeaknessHistory` 함수도 파일에서 삭제.

- [ ] **Step 6: 타입체크**

```bash
npx tsc --noEmit 2>&1 | head -20
```

`resolvedWeaknessHistory`를 사용하는 곳이 있다면 에러가 남 — 모두 제거.

- [ ] **Step 7: 커밋**

```bash
git add features/learning/types.ts features/learning/home-state.ts
git commit -m "feat: WeaknessProgressItem에 diagnosticAccuracy/reviewAccuracy 추가"
```

---

### Task 5: `current-learner-controller.ts`에서 `recentReviewAttempts` 로드

**Files:**
- Modify: `features/learner/current-learner-controller.ts` (line ~180)

- [ ] **Step 1: `buildSnapshot`에서 `recentReviewAttempts` 로드 및 전달**

`current-learner-controller.ts` line ~180의 `buildSnapshot` 내부 `homeState` 빌드 수정:

```ts
const buildSnapshot = async (
  params: {
    authGateState: 'authenticated' | 'guest-dev';
    authNoticeMessage?: string | null;
    profile: LearnerProfile;
    session: AuthSession;
    summary: LearnerSummaryCurrent;
  },
): Promise<CurrentLearnerSnapshot> => {
  const [peerPresence, reviewTasks, recentReviewAttempts] = await Promise.all([
    peerPresenceStore.load(),
    reviewTaskStore.load(params.session.accountKey),
    learningHistoryRepository.listAttempts(params.session.accountKey, {
      source: 'review',
      limit: 20,
    }),
  ]);

  return {
    authGateState: params.authGateState,
    authBlockingReason: null,
    canUseDevGuestAuth: devGuestEnabled,
    authNoticeMessage: params.authNoticeMessage ?? null,
    session: params.session,
    profile: params.profile,
    summary: params.summary,
    homeState: buildHomeLearningState(
      params.profile,
      params.summary,
      peerPresence,
      reviewTasks,
      recentReviewAttempts,
    ),
  };
};
```

- [ ] **Step 2: 타입체크**

```bash
npx tsc --noEmit 2>&1 | head -20
```

에러 없음 확인.

- [ ] **Step 3: 커밋**

```bash
git add features/learner/current-learner-controller.ts
git commit -m "feat: buildSnapshot에서 recentReviewAttempts 로드 및 homeState에 전달"
```

---

### Task 6: `WeaknessAccuracyChart` 컴포넌트 작성

**Files:**
- Modify: `features/quiz/components/weakness-growth-chart.tsx` (전체 교체)

- [ ] **Step 1: 파일 전체를 새 컴포넌트로 교체**

`features/quiz/components/weakness-growth-chart.tsx` 전체 내용을 아래로 교체:

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { WeaknessProgressItem } from '@/features/learning/types';

const MAX_BAR_HEIGHT = 44;

function AccuracyBar({
  diagnosticAccuracy,
  reviewAccuracy,
  label,
}: {
  diagnosticAccuracy?: number;
  reviewAccuracy?: number;
  label: string;
}) {
  const maxVal = Math.max(diagnosticAccuracy ?? 0, reviewAccuracy ?? 0, 1);
  const diagHeight = diagnosticAccuracy != null
    ? Math.max(4, (diagnosticAccuracy / 100) * MAX_BAR_HEIGHT)
    : 4;
  const reviewHeight = reviewAccuracy != null
    ? Math.max(4, (reviewAccuracy / 100) * MAX_BAR_HEIGHT)
    : 0;

  return (
    <View style={styles.barGroup}>
      <View style={[styles.barRow, { height: MAX_BAR_HEIGHT }]}>
        {/* 진단 막대 */}
        <View style={styles.barColInner}>
          {diagnosticAccuracy != null && (
            <Text style={styles.barNum}>{diagnosticAccuracy}%</Text>
          )}
          <View
            style={[
              styles.solidBar,
              styles.diagBar,
              { height: diagHeight },
            ]}
          />
        </View>

        {/* 복습 막대 or ghost */}
        <View style={styles.barColInner}>
          {reviewAccuracy != null ? (
            <>
              <Text style={[styles.barNum, styles.reviewNum]}>{reviewAccuracy}%</Text>
              <View style={[styles.solidBar, styles.reviewBar, { height: reviewHeight }]} />
            </>
          ) : (
            <>
              <Text style={styles.barNumEmpty}>-</Text>
              <View style={[styles.ghostBar, { height: diagHeight }]} />
            </>
          )}
        </View>
      </View>
      <Text style={styles.barLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function WeaknessAccuracyChart({ items }: { items: WeaknessProgressItem[] }) {
  const hasReviewData = items.some((item) => item.reviewAccuracy != null);

  const avgDelta =
    hasReviewData
      ? Math.round(
          items
            .filter((item) => item.reviewAccuracy != null && item.diagnosticAccuracy != null)
            .reduce(
              (sum, item) => sum + (item.reviewAccuracy! - item.diagnosticAccuracy!),
              0,
            ) /
            items.filter((item) => item.reviewAccuracy != null && item.diagnosticAccuracy != null)
              .length,
        )
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>약점별 정답률</Text>
        {avgDelta != null && avgDelta > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🌱 평균 +{avgDelta}%</Text>
          </View>
        ) : !hasReviewData ? (
          <Text style={styles.hint}>복습하면 오른쪽이 채워져요</Text>
        ) : null}
      </View>

      <View style={styles.barsRow}>
        {items.map((item) => (
          <AccuracyBar
            key={item.weaknessId}
            diagnosticAccuracy={item.diagnosticAccuracy}
            reviewAccuracy={item.reviewAccuracy}
            label={item.weaknessLabel}
          />
        ))}
      </View>

      <View style={styles.floor} />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.diagDot]} />
          <Text style={styles.legendText}>진단</Text>
        </View>
        <View style={styles.legendItem}>
          {hasReviewData ? (
            <View style={[styles.legendDot, styles.reviewDot]} />
          ) : (
            <View style={styles.legendDotGhost} />
          )}
          <Text style={styles.legendText}>최근 복습</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 252, 247, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.1)',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: '#1C2C19',
  },
  badge: {
    backgroundColor: 'rgba(74, 124, 89, 0.1)',
    borderRadius: 99,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  badgeText: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: '#2A4A28',
  },
  hint: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    color: 'rgba(72, 67, 58, 0.45)',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  barColInner: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  solidBar: {
    width: 12,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  diagBar: {
    backgroundColor: 'rgba(74, 124, 89, 0.3)',
  },
  reviewBar: {
    backgroundColor: '#4A7C59',
  },
  ghostBar: {
    width: 12,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(74, 124, 89, 0.3)',
    backgroundColor: 'rgba(74, 124, 89, 0.04)',
  },
  barNum: {
    fontFamily: FontFamilies.bold,
    fontSize: 9,
    color: 'rgba(74, 124, 89, 0.6)',
  },
  reviewNum: {
    color: '#2A5C38',
  },
  barNumEmpty: {
    fontFamily: FontFamilies.bold,
    fontSize: 9,
    color: 'rgba(41, 59, 39, 0.2)',
  },
  barLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 9,
    color: 'rgba(28, 44, 25, 0.45)',
    textAlign: 'center',
    lineHeight: 12,
  },
  floor: {
    height: 1,
    backgroundColor: 'rgba(41, 59, 39, 0.1)',
    marginTop: 6,
    marginBottom: 6,
  },
  legend: {
    flexDirection: 'row',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  diagDot: {
    backgroundColor: 'rgba(74, 124, 89, 0.3)',
  },
  reviewDot: {
    backgroundColor: '#4A7C59',
  },
  legendDotGhost: {
    width: 8,
    height: 8,
    borderRadius: 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(74, 124, 89, 0.35)',
  },
  legendText: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    color: 'rgba(28, 44, 25, 0.45)',
  },
});
```

- [ ] **Step 2: export 이름이 바뀌었으므로 타입체크로 import 에러 확인**

```bash
npx tsc --noEmit 2>&1 | grep "WeaknessGrowthChart\|WeaknessAccuracyChart" | head -10
```

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/weakness-growth-chart.tsx
git commit -m "feat: WeaknessGrowthChart를 WeaknessAccuracyChart로 교체"
```

---

### Task 7: `HomeWeaknessSection` 업데이트

**Files:**
- Modify: `features/quiz/components/home-weakness-section.tsx`

- [ ] **Step 1: `WeaknessGrowthChart` → `WeaknessAccuracyChart`로 교체, props 정리**

`features/quiz/components/home-weakness-section.tsx` 전체 수정:

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { HomeLearningState } from '@/features/learning/home-state';
import { WeaknessAccuracyChart } from '@/features/quiz/components/weakness-growth-chart';
import { WeaknessProgressItem } from '@/features/quiz/components/weakness-progress-item';

function PeerChip({ peers }: { peers: HomeLearningState['peerPresence'] }) {
  if (peers.mode !== 'live' || peers.peers.length === 0) {
    return null;
  }

  const displayPeers = peers.peers.slice(0, 3);
  const AVATAR_COLORS = ['#D4E8C2', '#C2D4E8', '#E8D4C2', '#E8C2D4'];

  return (
    <View style={styles.peerChip}>
      <View style={styles.avatars}>
        {displayPeers.map((peer, i) => (
          <View
            key={peer.id}
            style={[
              styles.avatar,
              { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] },
              i > 0 && styles.avatarOverlap,
            ]}>
            <Text style={styles.avatarText}>{peer.nickname.charAt(0)}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.peerText}>
        <Text style={styles.peerTextBold}>{peers.peers.length}명</Text>이 지금 같이 복습 중
      </Text>
    </View>
  );
}

export function HomeWeaknessSection({ homeState }: { homeState: HomeLearningState }) {
  if (!homeState.latestDiagnosticSummary) {
    return null;
  }

  const { weaknessProgressItems, peerPresence } = homeState;

  return (
    <View style={styles.section}>
      <View style={styles.divider} />
      <View style={styles.content}>
        <PeerChip peers={peerPresence} />
        <WeaknessAccuracyChart items={weaknessProgressItems} />
        {weaknessProgressItems.length > 0 ? (
          <View style={styles.weaknessList}>
            <Text style={styles.sectionLabel}>내 약점</Text>
            {weaknessProgressItems.map((item) => (
              <WeaknessProgressItem key={item.weaknessId} item={item} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { width: '100%' },
  divider: { height: 1, backgroundColor: 'rgba(41, 59, 39, 0.08)' },
  content: { paddingTop: 10, paddingBottom: 16, gap: 8 },
  peerChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 252, 247, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.1)',
    borderRadius: 99,
    paddingVertical: 4,
    paddingLeft: 6,
    paddingRight: 10,
  },
  avatars: { flexDirection: 'row' },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#F6F2E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlap: { marginLeft: -4 },
  avatarText: { fontFamily: FontFamilies.bold, fontSize: 8, color: '#1C2C19' },
  peerText: { fontFamily: FontFamilies.medium, fontSize: 12, color: 'rgba(72, 67, 58, 0.7)' },
  peerTextBold: { fontFamily: FontFamilies.bold, color: '#1C2C19' },
  weaknessList: { gap: 5 },
  sectionLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: '#1C2C19',
    marginBottom: 1,
  },
});
```

- [ ] **Step 2: `HomeWeaknessSection`을 사용하는 상위 컴포넌트에서 `onRediagnose` prop 제거**

```bash
grep -rn "HomeWeaknessSection\|onRediagnose" features/ --include="*.tsx" --include="*.ts"
```

찾은 파일에서 `onRediagnose` prop 전달 코드 제거.

- [ ] **Step 3: 전체 타입체크**

```bash
npx tsc --noEmit 2>&1 | head -30
```

에러 없음 확인.

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/components/home-weakness-section.tsx
git commit -m "feat: HomeWeaknessSection을 WeaknessAccuracyChart로 연결"
```

---

### Task 8: 수동 검증

- [ ] **Step 1: 개발 빌드 실행**

```bash
npx expo run:ios
```

- [ ] **Step 2: 진단 직후 상태 확인**

개발 설정에서 `seedPreview('diagnostic-complete')` 실행 후:
- 차트: 진단 정답률 막대(연한 녹색) + 점선 ghost bar 표시
- "재진단 CTA" 없음
- "복습하면 오른쪽이 채워져요" 힌트 표시

- [ ] **Step 3: 복습 후 상태 확인**

`seedPreview('review-day3-available')` 실행 후:
- 차트: 진단 막대 + 복습 막대(진한 녹색) 표시
- "평균 +X%" 뱃지 표시 (단, seedPreview는 mock 데이터라 reviewAccuracy=undefined일 수 있음 — 로컬 복습 완료 시 검증)

- [ ] **Step 4: 커밋 & 푸시**

```bash
git push origin main
npm run log:commit
```
