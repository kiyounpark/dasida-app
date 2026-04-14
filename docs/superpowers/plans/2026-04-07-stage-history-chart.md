# Stage History Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `WeaknessAccuracyChart`를 복습 단계(day1→day3→day7→day30)별 누적 막대 차트로 교체하여, 단계가 완료될수록 막대가 쌓이고 다음 단계는 ghost 막대로 표시한다.

**Architecture:** `LearningAttempt`에 `reviewStage`를 저장하여 단계별 정답률 추적을 가능하게 한다. `buildWeaknessProgressItems`에서 `reviewAccuracyByStage: Partial<Record<ReviewStage, number>>`를 계산하고, 차트는 현재 stage까지의 막대를(완료=솔리드, 미완료=ghost) 렌더링한다. 기존 `diagnosticAccuracy` 필드는 타입에 유지하되 차트에서는 제거한다.

**Tech Stack:** TypeScript, React Native (StyleSheet), no external dependencies

---

### 사전 지식 (구현자 필독)

**단계 순서:** `'day1' | 'day3' | 'day7' | 'day30'` (history-types.ts)

**핵심 데이터 흐름:**
```
useReviewSessionScreen.onPressRemember
  → recordAttempt({ source: 'weakness-practice', reviewContext: { reviewStage } })
  → local-learning-history-repository.buildAttempt → LearningAttempt (현재 reviewStage 미저장)
  → recentReviewAttempts 로드 (current-learner-controller.buildSnapshot)
  → buildWeaknessProgressItems(recentReviewAttempts) → WeaknessProgressItem[]
  → WeaknessAccuracyChart 렌더링
```

**Pre-existing 에러 (무시):**
- `use-review-session-screen.ts:66` — readonly ThinkingStep[] 타입 에러 — 이 작업과 무관

---

### Task 1: `LearningAttempt`에 `reviewStage` 저장

**Files:**
- Modify: `features/learning/types.ts`
- Modify: `features/learning/local-learning-history-repository.ts`

**Background:**
- `FinalizedAttemptInput.reviewContext?.reviewStage` 값이 `buildAttempt()`에서 무시되고 있음
- `LearningAttempt` 타입에 `reviewStage` 필드가 없어서 단계별 필터링 불가

- [ ] **Step 1: `LearningAttempt` 타입에 `reviewStage` 추가**

`features/learning/types.ts` — `topWeaknesses` 바로 아래에 추가:

```ts
export type LearningAttempt = {
  id: string;
  accountKey: string;
  learnerId: string;
  source: LearningSource;
  sourceEntityId: string | null;
  gradeSnapshot: LearnerGrade;
  startedAt: string;
  completedAt: string;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  primaryWeaknessId: WeaknessId | null;
  topWeaknesses: WeaknessId[];
  reviewStage?: ReviewStage;
  schemaVersion: 1;
  createdAt: string;
};
```

- [ ] **Step 2: `buildAttempt`에서 `reviewStage` 저장**

`features/learning/local-learning-history-repository.ts` 309번째 줄 `buildAttempt` 함수:

```ts
function buildAttempt(input: FinalizedAttemptInput, createdAt: string): LearningAttempt {
  return {
    id: input.attemptId,
    accountKey: input.accountKey,
    learnerId: input.learnerId,
    source: input.source,
    sourceEntityId: input.sourceEntityId,
    gradeSnapshot: input.gradeSnapshot,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    questionCount: input.questionCount,
    correctCount: input.correctCount,
    wrongCount: input.wrongCount,
    accuracy: input.accuracy,
    primaryWeaknessId: input.primaryWeaknessId,
    topWeaknesses: input.topWeaknesses,
    reviewStage: input.reviewContext?.reviewStage,
    schemaVersion: 1,
    createdAt,
  };
}
```

- [ ] **Step 3: 타입체크**

```bash
npx tsc --noEmit 2>&1 | grep -E "(types|local-learning)" | head -10
```

에러 없음 확인 (pre-existing 에러 제외).

- [ ] **Step 4: 커밋**

```bash
git add features/learning/types.ts features/learning/local-learning-history-repository.ts
git commit -m "feat: LearningAttempt에 reviewStage 저장"
```

---

### Task 2: `WeaknessProgressItem` 타입 변경 + `buildWeaknessProgressItems` 업데이트

**Files:**
- Modify: `features/learning/types.ts`
- Modify: `features/learning/home-state.ts`

**Background:**
- 현재 `reviewAccuracy?: number` — 최신 복습 단일값
- 변경 후 `reviewAccuracyByStage: Partial<Record<ReviewStage, number>>` — 단계별 정답률 맵
- `WeaknessProgressItem`은 `home-state.ts`의 `buildWeaknessProgressItems`에서만 생성됨
- `recentReviewAttempts`는 `source === 'weakness-practice'` 필터로 20개 로드됨

- [ ] **Step 1: `WeaknessProgressItem` 타입 변경**

`features/learning/types.ts` 110번째 줄:

```ts
export type WeaknessProgressItem = {
  weaknessId: WeaknessId;
  topicLabel: string;
  weaknessLabel: string;
  stage: ReviewStage;
  completed: boolean;
  diagnosticAccuracy?: number;
  reviewAccuracyByStage: Partial<Record<ReviewStage, number>>;
};
```

- [ ] **Step 2: `buildWeaknessProgressItems` 업데이트**

`features/learning/home-state.ts` 221번째 줄 `return deduped.slice(0, 3).map((t) => {` 블록 교체:

```ts
const STAGE_ORDER: ReviewStage[] = ['day1', 'day3', 'day7', 'day30'];

return deduped.slice(0, 3).map((t) => {
  const diagnosticAccuracy =
    summary.latestDiagnosticSummary?.weaknessAccuracies?.[t.weaknessId];

  const reviewAccuracyByStage: Partial<Record<ReviewStage, number>> = {};
  for (const stage of STAGE_ORDER) {
    const match = recentReviewAttempts
      .filter(
        (a) =>
          a.source === 'weakness-practice' &&
          a.primaryWeaknessId === t.weaknessId &&
          a.reviewStage === stage,
      )
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
    if (match != null) {
      reviewAccuracyByStage[stage] = match.accuracy;
    }
  }

  return {
    weaknessId: t.weaknessId,
    topicLabel: diagnosisMap[t.weaknessId]?.topicLabel ?? '',
    weaknessLabel: diagnosisMap[t.weaknessId]?.labelKo ?? t.weaknessId,
    stage: t.stage,
    completed: t.completed,
    diagnosticAccuracy,
    reviewAccuracyByStage,
  };
});
```

`home-state.ts` 상단 import에 `ReviewStage` 추가 필요:

```ts
import type { LearnerSummaryCurrent, LearningAttempt, PeerPresenceSnapshot, ReviewTask, WeaknessProgressItem } from './types';
import type { ReviewStage } from './history-types';
```

- [ ] **Step 3: 타입체크**

```bash
npx tsc --noEmit 2>&1 | grep -E "(home-state|types)" | head -20
```

`reviewAccuracy` 참조 에러가 차트 파일에서 발생하는 것은 정상 — Task 3에서 수정함.
이 두 파일 자체의 에러만 없으면 OK.

- [ ] **Step 4: 커밋**

```bash
git add features/learning/types.ts features/learning/home-state.ts
git commit -m "feat: WeaknessProgressItem.reviewAccuracyByStage로 단계별 정답률 추적"
```

---

### Task 3: `WeaknessAccuracyChart` 단계별 누적 막대 렌더링

**Files:**
- Modify: `features/quiz/components/weakness-growth-chart.tsx`

**Background:**

렌더링 규칙:
- `item.stage`(현재 단계)까지의 모든 단계를 막대로 표시
- `reviewAccuracyByStage[stage] != null` → 솔리드 녹색 막대 + 정답률 %
- `reviewAccuracyByStage[stage] == null` → ghost 막대 (full height, 연한 녹색)
- day1: 막대 1개, day3: 막대 2개, day7: 막대 3개, day30: 막대 4개

헤더 힌트:
- 하나도 완료 안 됨 → "복습 한 번이면 바로 채워져요"
- 일부 완료 → 힌트 없음

범례:
- [솔리드 녹색] 완료 / [ghost] 다음 복습

- [ ] **Step 1: `weakness-growth-chart.tsx` 전체 교체**

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { ReviewStage } from '@/features/learning/history-types';
import type { WeaknessProgressItem } from '@/features/learning/types';

const MAX_BAR_HEIGHT = 44;
const STAGE_ORDER: ReviewStage[] = ['day1', 'day3', 'day7', 'day30'];

function StageBar({
  accuracy,
  isGhost,
}: {
  accuracy?: number;
  isGhost: boolean;
}) {
  if (isGhost) {
    return (
      <View style={styles.barColInner}>
        <View style={[styles.ghostBar, { height: MAX_BAR_HEIGHT }]} />
      </View>
    );
  }
  const height = Math.max(4, ((accuracy ?? 0) / 100) * MAX_BAR_HEIGHT);
  return (
    <View style={styles.barColInner}>
      <Text style={styles.barNum}>{accuracy}%</Text>
      <View style={[styles.solidBar, { height }]} />
    </View>
  );
}

function AccuracyBar({
  item,
}: {
  item: WeaknessProgressItem;
}) {
  const stageIndex = STAGE_ORDER.indexOf(item.stage);
  const visibleStages = STAGE_ORDER.slice(0, stageIndex + 1);

  return (
    <View style={styles.barGroup}>
      <View style={[styles.barRow, { height: MAX_BAR_HEIGHT + 16 }]}>
        {visibleStages.map((stage) => {
          const accuracy = item.reviewAccuracyByStage[stage];
          const isGhost = accuracy == null;
          return <StageBar key={stage} accuracy={accuracy} isGhost={isGhost} />;
        })}
      </View>
      <Text style={styles.barLabel} numberOfLines={2}>
        {item.weaknessLabel}
      </Text>
    </View>
  );
}

export function WeaknessAccuracyChart({ items }: { items: WeaknessProgressItem[] }) {
  const hasAnyReview = items.some(
    (item) => Object.keys(item.reviewAccuracyByStage).length > 0,
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>복습 정답률</Text>
        {!hasAnyReview && (
          <Text style={styles.hint}>복습 한 번이면 바로 채워져요</Text>
        )}
      </View>

      <View style={styles.barsRow}>
        {items.map((item) => (
          <AccuracyBar key={item.weaknessId} item={item} />
        ))}
      </View>

      <View style={styles.floor} />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.completedDot]} />
          <Text style={styles.legendText}>완료</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendDotGhost} />
          <Text style={styles.legendText}>다음 복습</Text>
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
    width: 10,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: '#4A7C59',
  },
  ghostBar: {
    width: 10,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: 'rgba(74, 124, 89, 0.18)',
  },
  barNum: {
    fontFamily: FontFamilies.bold,
    fontSize: 9,
    color: '#2A5C38',
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
  completedDot: {
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

- [ ] **Step 2: 타입체크 — 에러 없음 확인**

```bash
npx tsc --noEmit 2>&1 | grep "weakness-growth-chart" | head -10
```

에러 없음 확인.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/weakness-growth-chart.tsx
git commit -m "feat: WeaknessAccuracyChart를 단계별 누적 막대로 교체"
```

---

### Task 4: 수동 검증 + 최종 push

- [ ] **Step 1: 빌드 및 실행**

```bash
npx expo run:ios
```

- [ ] **Step 2: day3 씨드 상태 검증**

1. 개발 설정 → `seedPreview('review-day3-available')` 실행
2. 홈 화면 → `WeaknessAccuracyChart` 확인:
   - 3개 약점 그룹, 각 그룹에 막대 2개 (day1 솔리드, day3 ghost)
   - day1 막대에 정답률 % 표시
   - ghost 막대는 full height 연한 녹색
   - 헤더에 힌트 없음 (day1은 이미 완료)

**주의:** 현재 seed 데이터는 `diagnostic` source만 생성하므로 `reviewAccuracyByStage`는 비어있음 → day1 막대도 ghost로 표시됨. 이는 정상 — seed가 `weakness-practice` 시도를 생성하지 않기 때문.

실제 복습 완료 후 테스트:
1. 복습 세션 진입 → ThinkingStep 선택 → "기억났어요!" 완료
2. 홈 화면 → day1 막대가 솔리드 녹색으로 전환되고 정답률 % 표시 확인

- [ ] **Step 3: day7 씨드 상태 검증 (선택)**

1. `resetLocalProfile()` → `seedPreview('review-day7-available')` 실행
2. 3개 약점 그룹, 각 그룹에 막대 3개 확인

- [ ] **Step 4: push + log**

```bash
git push origin main
npm run log:commit
```
