# 홈 하단 약점 섹션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 화면 하단에 약점 해결 현황 그래프 + 내 약점 목록 섹션을 추가해, 복습 있는 날/없는 날 모두 학생이 "지금 내가 어디에 약하고, 얼마나 좋아지고 있는지"를 바로 확인하게 한다.

**Architecture:** `diagnosisMap`에 `topicLabel` 추가 → `HomeLearningState`에 두 필드(`weaknessProgressItems`, `resolvedWeaknessHistory`) 추가 → `buildHomeLearningState`에 `allReviewTasks` 매개변수 추가 → 컨트롤러의 `buildSnapshot`에서 `reviewTaskStore.load()` 호출 → 신규 컴포넌트 3개 생성 → `quiz-hub-screen-view`에 섹션 렌더링.

**Tech Stack:** React Native (StyleSheet), TypeScript, AsyncStorage (reviewTaskStore), Expo Router

---

## File Map

| 파일 | 작업 |
|------|------|
| `data/diagnosisMap.ts` | `DiagnosisItem`에 `topicLabel` 추가, 33개 항목에 값 채우기 |
| `features/learning/types.ts` | `WeaknessProgressItem` 타입 추가 |
| `features/learning/home-state.ts` | `HomeLearningState`에 두 필드 추가, 빌더 함수 두 개 추가, `buildHomeLearningState` 시그니처 변경 |
| `features/learner/current-learner-controller.ts` | `buildSnapshot` → `reviewTaskStore.load()` 호출 후 4번째 인자로 전달 |
| `features/quiz/components/weakness-progress-item.tsx` | 신규: 개별 약점 항목 컴포넌트 |
| `features/quiz/components/weakness-growth-chart.tsx` | 신규: 막대 그래프 컴포넌트 |
| `features/quiz/components/home-weakness-section.tsx` | 신규: 전체 섹션 wrapper |
| `features/quiz/hooks/use-quiz-hub-screen.ts` | `onRediagnose` 핸들러 추가, `UseQuizHubScreenResult`에 타입 추가 |
| `features/quiz/components/quiz-hub-screen-view.tsx` | `HomeWeaknessSection` 렌더링 추가, 레이아웃을 ScrollView로 변경 |

---

## Task 1: diagnosisMap에 topicLabel 추가

**Files:**
- Modify: `data/diagnosisMap.ts`

- [ ] **Step 1: `DiagnosisItem` 타입에 `topicLabel` 필드 추가**

`data/diagnosisMap.ts` 41-46행의 `DiagnosisItem` 타입을:
```typescript
export type DiagnosisItem = {
  id: WeaknessId;
  labelKo: string;
  topicLabel: string;
  desc: string;
  tip: string;
};
```

- [ ] **Step 2: 33개 항목에 topicLabel 값 추가**

각 항목의 `id` 뒤에 `topicLabel` 추가. 아래 매핑을 따른다:

```typescript
// 중학/고1-2 공통 약점
formula_understanding: topicLabel: '이차함수'
calc_repeated_error: topicLabel: '공통'
min_value_read_confusion: topicLabel: '이차함수'
vertex_formula_memorization: topicLabel: '이차함수'
coefficient_sign_confusion: topicLabel: '이차함수'
derivative_calculation: topicLabel: '미분'
solving_order_confusion: topicLabel: '미분'
max_min_judgement_confusion: topicLabel: '이차함수'
basic_concept_needed: topicLabel: '공통'
factoring_pattern_recall: topicLabel: '인수분해'
complex_factoring_difficulty: topicLabel: '인수분해'
quadratic_formula_memorization: topicLabel: '이차방정식'
discriminant_calculation: topicLabel: '이차방정식'
radical_simplification_error: topicLabel: '무리수'
rationalization_error: topicLabel: '무리수'
expansion_sign_error: topicLabel: '다항식'
like_terms_error: topicLabel: '다항식'
imaginary_unit_confusion: topicLabel: '복소수'
complex_calc_error: topicLabel: '복소수'
remainder_substitution_error: topicLabel: '나머지정리'
simultaneous_equation_error: topicLabel: '방정식'
counting_method_confusion: topicLabel: '경우의 수'
counting_overcounting: topicLabel: '경우의 수'
// 고3 공통
g3_diff: topicLabel: '미분'
g3_sequence: topicLabel: '수열'
g3_log_exp: topicLabel: '지수·로그'
g3_integral: topicLabel: '적분'
g3_trig: topicLabel: '삼각함수'
g3_limit: topicLabel: '극한'
g3_conic: topicLabel: '이차곡선'
// 고3 확통
g3_counting: topicLabel: '경우의 수'
g3_probability: topicLabel: '확률'
g3_statistics: topicLabel: '통계'
// 고3 기하
g3_vector: topicLabel: '벡터'
g3_space_geometry: topicLabel: '공간도형'
```

예시 (첫 항목):
```typescript
formula_understanding: {
  id: 'formula_understanding',
  labelKo: '공식 이해 부족',
  topicLabel: '이차함수',
  desc: '완전제곱식 변환 원리를 아직 충분히 체화하지 못한 상태입니다.',
  tip: 'x 계수의 절반을 제곱하는 규칙을 먼저 고정하고, 변형을 한 줄씩 적어 보세요.',
},
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: `topicLabel` 관련 타입 오류 없음. (다른 Task에서 아직 채우지 않은 인터페이스 오류는 무시)

- [ ] **Step 4: Commit**

```bash
git add data/diagnosisMap.ts
git commit -m "feat: diagnosisMap에 topicLabel 필드 추가"
```

---

## Task 2: WeaknessProgressItem 타입 추가

**Files:**
- Modify: `features/learning/types.ts`

- [ ] **Step 1: `WeaknessProgressItem` 타입 추가**

`features/learning/types.ts` 끝(109행 이후)에 추가:

```typescript
export type WeaknessProgressItem = {
  weaknessId: WeaknessId;
  topicLabel: string;
  weaknessLabel: string;
  stage: ReviewStage;
  completed: boolean;
};
```

`ReviewStage` import 확인: 파일 상단에 이미 `import type { LearningSource, ReviewStage } from './history-types';`가 있다.

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: 새 타입 관련 오류 없음.

- [ ] **Step 3: Commit**

```bash
git add features/learning/types.ts
git commit -m "feat: WeaknessProgressItem 타입 추가"
```

---

## Task 3: HomeLearningState 빌더 함수 추가

**Files:**
- Modify: `features/learning/home-state.ts`

이 Task에서 하는 일:
1. `HomeLearningState`에 `weaknessProgressItems`와 `resolvedWeaknessHistory` 추가
2. `buildWeaknessProgressItems` 함수 추가
3. `buildResolvedWeaknessHistory` 함수 추가
4. `buildHomeLearningState` 시그니처에 `allReviewTasks: ReviewTask[]` 추가

- [ ] **Step 1: import에 `ReviewTask`, `WeaknessProgressItem` 추가**

`features/learning/home-state.ts` 14행:
```typescript
import type { LearnerSummaryCurrent, PeerPresenceSnapshot, ReviewTask, WeaknessProgressItem } from './types';
```

- [ ] **Step 2: `HomeLearningState`에 두 필드 추가**

`HomeLearningState` 타입(28-58행)에 `recentActivity` 뒤에 추가:
```typescript
  weaknessProgressItems: WeaknessProgressItem[];
  resolvedWeaknessHistory: Array<{ weekLabel: string; count: number }>;
```

- [ ] **Step 3: `buildWeaknessProgressItems` 함수 추가**

`buildHomeLearningState` 함수(188행) 바로 위에 추가:

```typescript
function buildWeaknessProgressItems(
  summary: LearnerSummaryCurrent,
  allReviewTasks: ReviewTask[],
): WeaknessProgressItem[] {
  // 활성 태스크 (미완료) 먼저, 완료 태스크 후순위
  const activeTasks = allReviewTasks
    .filter((t) => !t.completed)
    .sort((a, b) => {
      const stageOrder: Record<string, number> = { day30: 4, day7: 3, day3: 2, day1: 1 };
      return (stageOrder[b.stage] ?? 0) - (stageOrder[a.stage] ?? 0);
    });

  const completedTasks = allReviewTasks
    .filter((t) => t.completed && t.stage === 'day30')
    .sort((a, b) => {
      const aAt = a.completedAt ?? '';
      const bAt = b.completedAt ?? '';
      return bAt.localeCompare(aAt);
    });

  const combined = [...activeTasks, ...completedTasks].slice(0, 3);

  // 중복 weaknessId 제거 (같은 약점의 최신 태스크만 유지)
  const seen = new Set<string>();
  const deduped = combined.filter((t) => {
    if (seen.has(t.weaknessId)) return false;
    seen.add(t.weaknessId);
    return true;
  });

  return deduped.map((t) => ({
    weaknessId: t.weaknessId,
    topicLabel: diagnosisMap[t.weaknessId].topicLabel,
    weaknessLabel: diagnosisMap[t.weaknessId].labelKo,
    stage: t.stage,
    completed: t.completed,
  }));
}
```

- [ ] **Step 4: `buildResolvedWeaknessHistory` 함수 추가**

`buildWeaknessProgressItems` 바로 아래에 추가:

```typescript
function buildResolvedWeaknessHistory(
  allReviewTasks: ReviewTask[],
): Array<{ weekLabel: string; count: number }> {
  const resolvedTasks = allReviewTasks.filter(
    (t) => t.completed && t.stage === 'day30' && t.completedAt,
  );

  if (resolvedTasks.length === 0) {
    return [{ weekLabel: '1주차', count: 0 }];
  }

  // completedAt 기준으로 가장 이른 날짜 찾기
  const sortedByDate = [...resolvedTasks].sort((a, b) =>
    (a.completedAt ?? '').localeCompare(b.completedAt ?? ''),
  );
  const firstCompletedAt = new Date(sortedByDate[0].completedAt!);

  // 각 태스크를 주차별로 집계
  const weekCounts: Record<number, number> = {};
  for (const task of resolvedTasks) {
    const completedAt = new Date(task.completedAt!);
    const diffMs = completedAt.getTime() - firstCompletedAt.getTime();
    const weekIndex = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    weekCounts[weekIndex] = (weekCounts[weekIndex] ?? 0) + 1;
  }

  // 최근 3주 포인트 생성
  const maxWeek = Math.max(...Object.keys(weekCounts).map(Number));
  const startWeek = Math.max(0, maxWeek - 2);
  const points: Array<{ weekLabel: string; count: number }> = [];

  let cumulative = 0;
  for (const [weekStr, cnt] of Object.entries(weekCounts)) {
    const week = Number(weekStr);
    if (week < startWeek) {
      cumulative += cnt;
    }
  }

  for (let w = startWeek; w <= maxWeek; w++) {
    cumulative += weekCounts[w] ?? 0;
    const label = w === maxWeek ? '지금' : `${w + 1}주차`;
    points.push({ weekLabel: label, count: cumulative });
  }

  // 최대 3포인트, 마지막이 '지금'
  return points.slice(-3);
}
```

- [ ] **Step 5: `buildHomeLearningState` 시그니처에 `allReviewTasks` 추가 및 반환값에 두 필드 포함**

`buildHomeLearningState` 함수(188행)를:
```typescript
export function buildHomeLearningState(
  _profile: LearnerProfile,
  summary: LearnerSummaryCurrent,
  peerPresenceSnapshot: PeerPresenceSnapshot | null = null,
  allReviewTasks: ReviewTask[] = [],
): HomeLearningState {
```

반환 객체에 두 필드 추가:
```typescript
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
    weaknessProgressItems: buildWeaknessProgressItems(summary, allReviewTasks),
    resolvedWeaknessHistory: buildResolvedWeaknessHistory(allReviewTasks),
  };
```

- [ ] **Step 6: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: `home-state.ts` 관련 오류 없음.

- [ ] **Step 7: Commit**

```bash
git add features/learning/home-state.ts features/learning/types.ts
git commit -m "feat: HomeLearningState에 weaknessProgressItems, resolvedWeaknessHistory 추가"
```

---

## Task 4: 컨트롤러 buildSnapshot에서 allReviewTasks 전달

**Files:**
- Modify: `features/learner/current-learner-controller.ts`

- [ ] **Step 1: buildSnapshot 함수 수정 (180-184행)**

현재:
```typescript
    homeState: buildHomeLearningState(
      params.profile,
      params.summary,
      await peerPresenceStore.load(),
    ),
```

변경:
```typescript
    homeState: buildHomeLearningState(
      params.profile,
      params.summary,
      await peerPresenceStore.load(),
      await reviewTaskStore.load(params.session.accountKey),
    ),
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: 오류 없음.

- [ ] **Step 3: Commit**

```bash
git add features/learner/current-learner-controller.ts
git commit -m "feat: buildSnapshot에서 allReviewTasks를 buildHomeLearningState에 전달"
```

---

## Task 5: WeaknessProgressItem 컴포넌트

**Files:**
- Create: `features/quiz/components/weakness-progress-item.tsx`

단원 칩 + 약점 이름 + 상태 뱃지 + 진행 점 4개를 렌더링하는 단일 항목 컴포넌트.

- [ ] **Step 1: 파일 생성**

```typescript
import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { WeaknessProgressItem as WeaknessProgressItemType } from '@/features/learning/types';
import type { ReviewStage } from '@/features/learning/history-types';

function stageDotsFilled(stage: ReviewStage, completed: boolean): number {
  if (completed) return 4;
  switch (stage) {
    case 'day1': return 1;
    case 'day3': return 2;
    case 'day7': return 3;
    case 'day30': return 4;
  }
}

export function WeaknessProgressItem({ item }: { item: WeaknessProgressItemType }) {
  const filled = stageDotsFilled(item.stage, item.completed);
  const badgeText = item.completed ? '해결됐어요 ✓' : '점점 나아지는 중';
  const stageLabel = item.completed ? '완료' : item.stage;

  return (
    <View style={[styles.container, item.completed && styles.containerDone]}>
      <View style={styles.left}>
        <View style={styles.topicChip}>
          <Text style={styles.topicChipText}>{item.topicLabel}</Text>
        </View>
        <Text style={styles.weaknessLabel} numberOfLines={1}>{item.weaknessLabel}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <View style={styles.dots}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i <= filled && styles.dotFilled]} />
          ))}
        </View>
        <Text style={[styles.stageLabel, item.completed && styles.stageLabelDone]}>
          {stageLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 252, 247, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.1)',
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  containerDone: {
    backgroundColor: 'rgba(74, 124, 89, 0.06)',
    borderColor: 'rgba(74, 124, 89, 0.18)',
  },
  left: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  topicChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74, 124, 89, 0.13)',
    borderRadius: 99,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  topicChipText: {
    fontFamily: FontFamilies.bold,
    fontSize: 9,
    color: '#2A5C38',
  },
  weaknessLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: '#1C2C19',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74, 124, 89, 0.1)',
    borderRadius: 99,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  badgeText: {
    fontFamily: FontFamilies.bold,
    fontSize: 9,
    color: '#2A4A28',
  },
  right: {
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: 3,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(41, 59, 39, 0.12)',
  },
  dotFilled: {
    backgroundColor: '#4A7C59',
  },
  stageLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 7.5,
    color: 'rgba(72, 67, 58, 0.4)',
  },
  stageLabelDone: {
    color: '#4A7C59',
  },
});
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: 오류 없음.

- [ ] **Step 3: Commit**

```bash
git add features/quiz/components/weakness-progress-item.tsx
git commit -m "feat: WeaknessProgressItem 컴포넌트 추가"
```

---

## Task 6: WeaknessGrowthChart 컴포넌트

**Files:**
- Create: `features/quiz/components/weakness-growth-chart.tsx`

약점 해결 현황 막대 그래프. State A (해결 0개): 실막대 1개 + ghost 막대 2개 + CTA. State B (1개 이상): 실막대 최대 3개.

- [ ] **Step 1: 파일 생성**

```typescript
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';

type HistoryPoint = { weekLabel: string; count: number };

const MAX_BAR_HEIGHT = 44;

function GhostBar({ label }: { label: string }) {
  return (
    <View style={styles.barCol}>
      <View style={styles.ghostBar} />
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
}

function SolidBar({
  count,
  label,
  maxCount,
  isCurrent,
}: {
  count: number;
  label: string;
  maxCount: number;
  isCurrent: boolean;
}) {
  const height = maxCount === 0 ? 6 : Math.max(6, (count / maxCount) * MAX_BAR_HEIGHT);
  const opacity = isCurrent ? 1 : 0.35 + (count / Math.max(maxCount, 1)) * 0.3;
  return (
    <View style={styles.barCol}>
      <Text style={[styles.barNum, isCurrent && styles.barNumCurrent]}>{count}</Text>
      <View
        style={[
          styles.solidBar,
          { height, opacity },
        ]}
      />
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
}

export function WeaknessGrowthChart({
  history,
  onRediagnose,
}: {
  history: HistoryPoint[];
  onRediagnose: () => void;
}) {
  const resolvedCount = history[history.length - 1]?.count ?? 0;
  const hasResolved = resolvedCount > 0;
  const maxCount = Math.max(...history.map((p) => p.count), 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>약점 해결 현황</Text>
        {hasResolved ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🌱 {resolvedCount}개 해결됨</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.barRow}>
        {hasResolved ? (
          // State B: 실막대
          <>
            {history.map((point, i) => (
              <View key={point.weekLabel} style={styles.barWithArrow}>
                <SolidBar
                  count={point.count}
                  label={point.weekLabel}
                  maxCount={maxCount}
                  isCurrent={i === history.length - 1}
                />
                {i < history.length - 1 ? (
                  <Text style={styles.arrow}>→</Text>
                ) : null}
              </View>
            ))}
          </>
        ) : (
          // State A: 실막대 1개 + ghost 2개
          <>
            <View style={styles.barWithArrow}>
              <SolidBar count={0} label="1주차" maxCount={1} isCurrent={false} />
              <Text style={styles.arrow}>→</Text>
            </View>
            <View style={styles.barWithArrow}>
              <GhostBar label="2주차" />
              <Text style={styles.arrow}>→</Text>
            </View>
            <GhostBar label="지금" />
          </>
        )}
      </View>

      <View style={styles.floor} />

      {!hasResolved ? (
        <View style={styles.ctaArea}>
          <Text style={styles.ctaHint}>재진단을 보면 성장 곡선이 채워져요</Text>
          <Pressable style={styles.ctaButton} onPress={onRediagnose}>
            <Text style={styles.ctaButtonText}>재진단 10문제 풀기 →</Text>
          </Pressable>
        </View>
      ) : null}
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
    gap: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
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
    fontSize: 8.5,
    color: '#2A4A28',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 0,
    height: MAX_BAR_HEIGHT + 22,
  },
  barWithArrow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 0,
  },
  barCol: {
    alignItems: 'center',
    gap: 2,
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  solidBar: {
    width: 20,
    borderRadius: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: '#4A7C59',
  },
  ghostBar: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 124, 89, 0.3)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(74, 124, 89, 0.05)',
  },
  barNum: {
    fontFamily: FontFamilies.bold,
    fontSize: 8.5,
    color: 'rgba(74, 124, 89, 0.5)',
  },
  barNumCurrent: {
    fontSize: 11,
    color: '#2A4A28',
  },
  barLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 7.5,
    color: 'rgba(72, 67, 58, 0.45)',
    position: 'absolute',
    bottom: 0,
  },
  arrow: {
    fontSize: 10,
    color: 'rgba(41, 59, 39, 0.2)',
    paddingBottom: 18,
    paddingHorizontal: 4,
  },
  floor: {
    height: 1,
    backgroundColor: 'rgba(41, 59, 39, 0.1)',
    marginBottom: 6,
  },
  ctaArea: {
    gap: 4,
    marginTop: 4,
  },
  ctaHint: {
    fontFamily: FontFamilies.regular,
    fontSize: 9,
    color: 'rgba(72, 67, 58, 0.55)',
    textAlign: 'center',
  },
  ctaButton: {
    alignSelf: 'center',
    backgroundColor: 'rgba(74, 124, 89, 0.12)',
    borderRadius: 99,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  ctaButtonText: {
    fontFamily: FontFamilies.bold,
    fontSize: 9,
    color: '#2A4A28',
  },
});
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: 오류 없음.

- [ ] **Step 3: Commit**

```bash
git add features/quiz/components/weakness-growth-chart.tsx
git commit -m "feat: WeaknessGrowthChart 컴포넌트 추가"
```

---

## Task 7: HomeWeaknessSection wrapper 컴포넌트

**Files:**
- Create: `features/quiz/components/home-weakness-section.tsx`

친구 칩 (live 데이터 있을 때만) + 약점 해결 현황 그래프 + 내 약점 목록 3개.

표시 조건: `homeState.latestDiagnosticSummary` 있을 때 (진단 1회 이상 완료).

- [ ] **Step 1: 파일 생성**

```typescript
import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { HomeLearningState } from '@/features/learning/home-state';
import { WeaknessGrowthChart } from '@/features/quiz/components/weakness-growth-chart';
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

export function HomeWeaknessSection({
  homeState,
  onRediagnose,
}: {
  homeState: HomeLearningState;
  onRediagnose: () => void;
}) {
  // 진단 미완료 시 섹션 전체 숨김
  if (!homeState.latestDiagnosticSummary) {
    return null;
  }

  const { weaknessProgressItems, resolvedWeaknessHistory, peerPresence } = homeState;

  return (
    <View style={styles.section}>
      <View style={styles.divider} />
      <View style={styles.content}>
        <PeerChip peers={peerPresence} />

        <WeaknessGrowthChart
          history={resolvedWeaknessHistory}
          onRediagnose={onRediagnose}
        />

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
  section: {
    width: '100%',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(41, 59, 39, 0.08)',
    marginBottom: 0,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 8,
  },
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
  avatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#F6F2E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlap: {
    marginLeft: -4,
  },
  avatarText: {
    fontFamily: FontFamilies.bold,
    fontSize: 8,
    color: '#1C2C19',
  },
  peerText: {
    fontFamily: FontFamilies.medium,
    fontSize: 9,
    color: 'rgba(72, 67, 58, 0.7)',
  },
  peerTextBold: {
    fontFamily: FontFamilies.bold,
    color: '#1C2C19',
  },
  weaknessList: {
    gap: 5,
  },
  sectionLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    color: '#1C2C19',
    marginBottom: 1,
  },
});
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: 오류 없음.

- [ ] **Step 3: Commit**

```bash
git add features/quiz/components/home-weakness-section.tsx
git commit -m "feat: HomeWeaknessSection wrapper 컴포넌트 추가"
```

---

## Task 8: quiz-hub-screen-view 배선 및 ScrollView 전환

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts`
- Modify: `features/quiz/components/quiz-hub-screen-view.tsx`

현재 `quiz-hub-screen-view.tsx`의 `posterScreen`은 `justifyContent: center`인 단순 View. 섹션 추가 후 콘텐츠가 스크롤이 필요할 수 있어 `ScrollView`로 전환한다. 복습 있는 날/없는 날 모두 카드 아래에 `HomeWeaknessSection`을 렌더링.

- [ ] **Step 1: `use-quiz-hub-screen.ts`에 `onRediagnose` 추가**

`UseQuizHubScreenResult` 타입에 추가:
```typescript
  onRediagnose: () => void;
```

`useQuizHubScreen` 반환 객체에 추가 (기존 `onStartDiagnostic` 재활용):
```typescript
    onRediagnose: onStartDiagnostic,
```

- [ ] **Step 2: `quiz-hub-screen-view.tsx` import 변경 및 ScrollView 전환**

`ScrollView` import 추가:
```typescript
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
```

`HomeWeaknessSection` import 추가:
```typescript
import { HomeWeaknessSection } from '@/features/quiz/components/home-weakness-section';
```

`QuizHubScreenView` props에 `onRediagnose` 추가:
```typescript
export function QuizHubScreenView({
  authNoticeMessage,
  homeState,
  isCompactLayout,
  isReady,
  journey,
  onDismissAuthNotice,
  onPressExam,
  onPressJourneyCta,
  onPressReviewCard,
  onRediagnose,
  onRefresh,
  profile,
  session,
}: UseQuizHubScreenResult) {
```

- [ ] **Step 3: 메인 렌더 구조를 ScrollView로 교체**

현재 `return` 블록(123-161행)의 `<View style={styles.posterScreen} ...>` 부분을 아래로 교체:

```tsx
  return (
    <View style={styles.screen}>
      {isNoReviewDay ? <BrandHeader compact={isCompactLayout} /> : null}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.posterScreen,
          { paddingTop: posterTopPadding, paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}>
        {!profile?.practiceGraduatedAt && !homeState?.nextReviewTask ? (
          <JourneyScreenHero isCompactLayout={isCompactLayout} />
        ) : null}
        {authNoticeMessage ? (
          <AuthNotice
            isCompactLayout={isCompactLayout}
            message={authNoticeMessage}
            onDismiss={onDismissAuthNotice}
          />
        ) : null}
        {homeState?.nextReviewTask && homeState.todayReviewCount > 0 ? (
          <ReviewHomeCard
            task={homeState.nextReviewTask}
            onPress={onPressReviewCard}
          />
        ) : null}
        {homeState?.nextReviewTask &&
          homeState.todayReviewCount === 0 &&
          !profile?.practiceGraduatedAt ? (
          <NoReviewDayCard
            nextTask={homeState.nextReviewTask}
            onPressExam={onPressExam}
          />
        ) : null}
        {!profile?.practiceGraduatedAt && !homeState?.nextReviewTask ? (
          <JourneyBoard
            isCompactLayout={isCompactLayout}
            onPressCurrentStep={onPressJourneyCta}
            onPressCta={onPressJourneyCta}
            state={journey}
          />
        ) : null}
        {homeState ? (
          <HomeWeaknessSection
            homeState={homeState}
            onRediagnose={onRediagnose}
          />
        ) : null}
      </ScrollView>
    </View>
  );
```

- [ ] **Step 4: styles 업데이트**

`posterScreen` 스타일에서 `justifyContent`를 제거하고 `scrollView` 스타일 추가:

```typescript
  scrollView: {
    flex: 1,
  },
  posterScreen: {
    paddingHorizontal: 0,
    alignItems: 'center',
    gap: 14,
  },
```

주의: `paddingHorizontal`은 0으로 설정하고, 개별 카드들(`ReviewHomeCard`, `NoReviewDayCard`, `JourneyBoard`)은 기존처럼 `width: '100%'`나 `maxWidth`를 유지한다. `HomeWeaknessSection`은 자체적으로 `paddingHorizontal: 14`를 갖는다.

- [ ] **Step 5: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: 오류 없음.

- [ ] **Step 6: Metro 번들러로 앱 기동 확인**

```bash
npx expo start --clear 2>&1 | head -20
```
Expected: 번들러가 오류 없이 시작됨.

- [ ] **Step 7: Commit**

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts features/quiz/components/quiz-hub-screen-view.tsx
git commit -m "feat: HomeWeaknessSection을 홈 화면에 배선, ScrollView 전환"
```

---

## Self-Review

### Spec Coverage 체크
- [x] 복습 있는 날/없는 날 모두 섹션 표시 → Task 8에서 양쪽 조건 렌더링
- [x] WeaknessId 레이블(labelKo)로 표시 → Task 5 `weaknessLabel`
- [x] topicLabel 칩 → Task 1 + Task 5
- [x] 진행 점 4개 (●●●○ 형태) + stage 레이블 → Task 5
- [x] 상태 뱃지 "점점 나아지는 중" / "해결됐어요 ✓" → Task 5
- [x] 약점 해결 현황 그래프 State A (0개 + ghost 2개 + CTA) → Task 6
- [x] 약점 해결 현황 그래프 State B (1개 이상) → Task 6
- [x] 친구 칩: live 데이터 있을 때만 → Task 7 `PeerChip`
- [x] 진단 미완료 시 섹션 전체 숨김 → Task 7 `if (!homeState.latestDiagnosticSummary) return null`
- [x] allReviewTasks를 buildHomeLearningState에 전달 → Task 3 + Task 4
- [x] onRediagnose → diagnostic 플로우 → Task 8

### Type Consistency 체크
- `WeaknessProgressItem` 타입은 Task 2에서 정의, Task 3 빌더와 Task 5 컴포넌트 모두 동일한 임포트 경로 `@/features/learning/types` 사용
- `HomeLearningState.weaknessProgressItems: WeaknessProgressItem[]` — Task 3에서 추가, Task 7에서 소비
- `HomeLearningState.resolvedWeaknessHistory: Array<{ weekLabel: string; count: number }>` — Task 3에서 추가, Task 6에서 `HistoryPoint` 타입과 동일한 형태로 소비
- `ReviewTask` import — Task 3에서 `features/learning/types`에서 임포트 (이미 존재하는 타입)
- `FontFamilies` — 기존 컴포넌트들과 동일한 경로 `@/constants/typography`
