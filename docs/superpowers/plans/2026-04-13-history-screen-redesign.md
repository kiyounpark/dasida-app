# 내 기록 화면 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "내 기록" 화면을 히어로 카드 기반으로 전면 리디자인 — 복습 완료 횟수를 핵심 지표로 올리고, BrandHeader·화면 타이틀을 제거한다.

**Architecture:** `totals.reviewAttempts`를 `LearnerSummaryCurrent`에 추가해 `buildSummary()`에서 `source: 'weakness-practice'` 시도 COUNT로 정규화 계산. `history-insights.ts`의 타입/빌더를 새 UI 구조에 맞게 전면 교체. `history-screen-view.tsx`를 다크 그린 히어로 카드 + 약점 진행 카드 + 최근 활동 카드로 재작성. `use-history-screen.ts`는 시그니처 한 줄만 조정.

**Tech Stack:** React Native, TypeScript, Expo, `useSafeAreaInsets` (react-native-safe-area-context)

---

## 파일 맵

| 파일 | 변경 유형 | 역할 |
|---|---|---|
| `features/learning/types.ts` | Modify | `totals.reviewAttempts` 필드 추가 |
| `features/learning/history-repository.ts` | Modify | `createEmptyLearnerSummary()` 초기값 추가 |
| `features/learning/local-learning-history-repository.ts` | Modify | `buildSummary()` — reviewAttempts COUNT |
| `features/history/history-insights.ts` | Rewrite | 새 타입 + 빌더 |
| `features/history/hooks/use-history-screen.ts` | Modify | `buildHistoryInsights` 옵션 시그니처 조정 |
| `features/history/components/history-screen-view.tsx` | Rewrite | 전면 UI 재작성 |

---

## Task 1: `totals.reviewAttempts` 타입 + 초기값

**Files:**
- Modify: `features/learning/types.ts:85-88`
- Modify: `features/learning/history-repository.ts:129-134`

- [ ] **Step 1: `types.ts` — `totals`에 `reviewAttempts` 추가**

`features/learning/types.ts` line 85-88의 `totals` 블록을:

```ts
totals: {
  diagnosticAttempts: number;
  featuredExamAttempts: number;
  reviewAttempts: number;
};
```

- [ ] **Step 2: `history-repository.ts` — `createEmptyLearnerSummary()`에 초기값 추가**

`features/learning/history-repository.ts` line 129-134의 `totals` 블록을:

```ts
totals: {
  diagnosticAttempts: 0,
  featuredExamAttempts: 0,
  reviewAttempts: 0,
},
```

- [ ] **Step 3: TypeScript 컴파일 오류 확인**

Run: `npx tsc --noEmit 2>&1 | head -40`
Expected: `buildSummary` 관련 오류 하나만 남음 (Task 2에서 해결). 그 외 오류 없음.

- [ ] **Step 4: Commit**

```bash
git add features/learning/types.ts features/learning/history-repository.ts
git commit -m "feat(learning): totals.reviewAttempts 타입 및 초기값 추가"
```

---

## Task 2: `buildSummary()`에서 `reviewAttempts` 계산

**Files:**
- Modify: `features/learning/local-learning-history-repository.ts:300-306`

- [ ] **Step 1: `buildSummary()` `totals` 블록 — `reviewAttempts` COUNT 추가**

`local-learning-history-repository.ts` line 300-306의 `totals:` 블록을:

```ts
totals: {
  diagnosticAttempts: attempts.filter((attempt) => attempt.source === 'diagnostic').length,
  featuredExamAttempts: attempts.filter((attempt) => attempt.source === 'featured-exam').length,
  reviewAttempts: attempts.filter((attempt) => attempt.source === 'weakness-practice').length,
},
```

- [ ] **Step 2: TypeScript 오류 확인**

Run: `npx tsc --noEmit 2>&1 | head -40`
Expected: 오류 없음

- [ ] **Step 3: Commit**

```bash
git add features/learning/local-learning-history-repository.ts
git commit -m "feat(learning): buildSummary에서 reviewAttempts COUNT 계산"
```

---

## Task 3: `history-insights.ts` 타입/빌더 전면 교체

**Files:**
- Rewrite: `features/history/history-insights.ts`

기존 `HistorySpotlightState`, `HistoryComparisonState`, `HistoryFocusItem` 타입과 그 빌더는 삭제.
새 타입 3개로 교체: `HistoryHeroState`, `HistoryWeaknessProgressItem`, `HistoryPulseItem`.

- [ ] **Step 1: `history-insights.ts` 전체를 아래 내용으로 교체**

```ts
import { compareTimestampsAsc } from '@/functions/shared/timestamp-utils';
import { diagnosisMap, type WeaknessId } from '@/data/diagnosisMap';
import type { LearnerSummaryCurrent, LearningAttempt } from '@/features/learning/types';
import type { ReviewStage } from '@/features/learning/history-types';

export type HistoryHeroState = {
  reviewAttempts: number;
  dueWeaknesses: Array<{ weaknessId: WeaknessId; label: string; stageLabel: string }>;
  accuracyValue: string;
  accuracyBadgeText: string;
  accuracyBadgeTone: 'positive' | 'neutral' | 'warning';
  ctaLabel: string;
  ctaKind: 'review' | 'diagnostic';
};

export type HistoryWeaknessProgressItem = {
  weaknessId: WeaknessId;
  label: string;
  stageLabel: string;
  progressRatio: number;
  isDue: boolean;
  nextLabel: string;
};

export type HistoryPulseItem = {
  id: string;
  kind: 'diagnostic' | 'review' | 'exam';
  kindLabel: string;
  title: string;
  occurredAtLabel: string;
  valueBadge: string | null;
};

export type HistoryScreenInsights = {
  hero: HistoryHeroState;
  weaknessProgress: HistoryWeaknessProgressItem[];
  pulseItems: HistoryPulseItem[];
};

const STAGE_LABELS: Record<ReviewStage, string> = {
  day1: '1단계',
  day3: '2단계',
  day7: '3단계',
  day30: '4단계',
};

const STAGE_PROGRESS: Record<ReviewStage, number> = {
  day1: 0.25,
  day3: 0.5,
  day7: 0.75,
  day30: 1.0,
};

function getWeaknessLabel(weaknessId?: WeaknessId | null): string {
  if (!weaknessId) return '기록 없음';
  return diagnosisMap[weaknessId].labelKo;
}

function formatDateTime(timestamp: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function formatNextLabel(scheduledFor: string, isDue: boolean): string {
  if (isDue) return '오늘 복습';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduled = new Date(scheduledFor);
  scheduled.setHours(0, 0, 0, 0);
  const diffDays = Math.round((scheduled.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return '오늘 복습';
  if (diffDays === 1) return '내일 복습';
  return `${diffDays}일 후 복습`;
}

function buildHero(
  summary: LearnerSummaryCurrent,
  attempts: LearningAttempt[],
  isLoadingAttempts: boolean,
): HistoryHeroState {
  const dueReviewTasks = summary.dueReviewTasks ?? [];
  const hasDue = dueReviewTasks.length > 0;
  const dueWeaknesses = dueReviewTasks.slice(0, 3).map((task) => ({
    weaknessId: task.weaknessId,
    label: getWeaknessLabel(task.weaknessId),
    stageLabel: STAGE_LABELS[task.stage],
  }));

  const sorted = [...attempts].sort((a, b) =>
    compareTimestampsAsc(a.completedAt, b.completedAt),
  );
  let accuracyValue = '—';
  let accuracyBadgeText = '—';
  let accuracyBadgeTone: HistoryHeroState['accuracyBadgeTone'] = 'neutral';

  if (!isLoadingAttempts && sorted.length > 0) {
    const latest = sorted[sorted.length - 1];
    accuracyValue = `${latest.accuracy}%`;
    if (sorted.length >= 2) {
      const previous = sorted[sorted.length - 2];
      const delta = latest.accuracy - previous.accuracy;
      accuracyBadgeText = delta >= 0 ? `▲ +${delta}%p` : `▼ ${delta}%p`;
      accuracyBadgeTone = delta >= 0 ? 'positive' : 'warning';
    }
  }

  let ctaLabel: string;
  if (hasDue) {
    ctaLabel =
      dueReviewTasks.length > 1
        ? `오늘 복습 ${dueReviewTasks.length}개 시작하기 →`
        : '오늘 복습 시작하기 →';
  } else if (summary.latestDiagnosticSummary) {
    ctaLabel = '빠른 재진단 하기 →';
  } else {
    ctaLabel = '첫 진단 시작하기 →';
  }

  return {
    reviewAttempts: summary.totals.reviewAttempts,
    dueWeaknesses,
    accuracyValue,
    accuracyBadgeText,
    accuracyBadgeTone,
    ctaLabel,
    ctaKind: hasDue ? 'review' : 'diagnostic',
  };
}

function buildWeaknessProgress(
  summary: LearnerSummaryCurrent,
): HistoryWeaknessProgressItem[] {
  const dueReviewTasks = summary.dueReviewTasks ?? [];
  const dueIds = new Set(dueReviewTasks.map((t) => t.weaknessId));
  const allTasks = [
    ...dueReviewTasks,
    ...(summary.nextReviewTask && !dueIds.has(summary.nextReviewTask.weaknessId)
      ? [summary.nextReviewTask]
      : []),
  ];

  return allTasks.slice(0, 4).map((task) => {
    const isDue = dueIds.has(task.weaknessId);
    return {
      weaknessId: task.weaknessId,
      label: getWeaknessLabel(task.weaknessId),
      stageLabel: STAGE_LABELS[task.stage],
      progressRatio: STAGE_PROGRESS[task.stage],
      isDue,
      nextLabel: formatNextLabel(task.scheduledFor, isDue),
    };
  });
}

function buildPulseItems(summary: LearnerSummaryCurrent): HistoryPulseItem[] {
  return summary.recentActivity.slice(0, 3).map((item) => {
    const kindLabel =
      item.kind === 'diagnostic' ? '진단' : item.kind === 'review' ? '복습' : '실전';
    return {
      id: item.id,
      kind: item.kind,
      kindLabel,
      title: item.title,
      occurredAtLabel: formatDateTime(item.occurredAt),
      valueBadge: item.kind === 'diagnostic' ? item.subtitle : null,
    };
  });
}

export function buildHistoryInsights(
  summary: LearnerSummaryCurrent,
  recentDiagnosticAttempts: LearningAttempt[],
  options?: { isLoadingAttempts?: boolean },
): HistoryScreenInsights {
  return {
    hero: buildHero(summary, recentDiagnosticAttempts, options?.isLoadingAttempts ?? false),
    weaknessProgress: buildWeaknessProgress(summary),
    pulseItems: buildPulseItems(summary),
  };
}
```

- [ ] **Step 2: TypeScript 컴파일 오류 확인**

Run: `npx tsc --noEmit 2>&1 | head -50`
Expected: `use-history-screen.ts`와 `history-screen-view.tsx`에서 타입 오류 (Task 4, 5에서 해결). 그 외 없음.

- [ ] **Step 3: Commit**

```bash
git add features/history/history-insights.ts
git commit -m "feat(history): history-insights 타입·빌더를 히어로 카드 구조로 전면 교체"
```

---

## Task 4: `use-history-screen.ts` — 옵션 시그니처 조정

**Files:**
- Modify: `features/history/hooks/use-history-screen.ts:81-84`

- [ ] **Step 1: `buildHistoryInsights` 호출 옵션 변경**

현재 (line 81-84):
```ts
return buildHistoryInsights(summary, recentDiagnosticAttempts, {
  attemptsErrorMessage,
});
```

변경 후:
```ts
return buildHistoryInsights(summary, recentDiagnosticAttempts, {
  isLoadingAttempts,
});
```

- [ ] **Step 2: TypeScript 오류 확인**

Run: `npx tsc --noEmit 2>&1 | head -50`
Expected: `history-screen-view.tsx` 관련 타입 오류만 남음

- [ ] **Step 3: Commit**

```bash
git add features/history/hooks/use-history-screen.ts
git commit -m "feat(history): use-history-screen buildHistoryInsights 옵션 isLoadingAttempts로 변경"
```

---

## Task 5: `history-screen-view.tsx` 전면 재작성

**Files:**
- Rewrite: `features/history/components/history-screen-view.tsx`

제거: `BrandHeader`, `TrendChart`, `LoadingTrendChart`, `headerBlock`, `spotlightTop`, `chartSurface`, `compareGrid`, `focusList`  
추가: `heroCard`, `progressList`, `activityCard`, `useSafeAreaInsets` 기반 상단 패딩

- [ ] **Step 1: `history-screen-view.tsx` 전체를 아래 내용으로 교체**

```tsx
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { BrandTypography } from '@/constants/typography';
import { useIsTablet } from '@/hooks/use-is-tablet';
import type { UseHistoryScreenResult } from '@/features/history/hooks/use-history-screen';

function getAccuracyBadgeStyle(tone: 'positive' | 'neutral' | 'warning') {
  switch (tone) {
    case 'positive':
      return { bg: 'rgba(47,158,68,0.3)', color: '#7AE89A' };
    case 'warning':
      return { bg: 'rgba(217,142,4,0.2)', color: '#FFD066' };
    default:
      return { bg: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' };
  }
}

export function HistoryScreenView({
  insights,
  isLoadingAttempts,
  isReady,
  isRefreshing,
  onPrimaryAction,
  onRefresh,
}: UseHistoryScreenResult) {
  const isTablet = useIsTablet();
  const insets = useSafeAreaInsets();

  if (!isReady) {
    return (
      <View style={styles.screen}>
        <View style={[styles.feedbackWrap, { paddingTop: insets.top + BrandSpacing.xxl }]}>
          <View style={styles.feedbackCard}>
            <Text selectable style={styles.feedbackTitle}>
              내 기록을 준비 중이에요
            </Text>
            <Text selectable style={styles.feedbackBody}>
              최근 진단 흐름과 오늘 다시 볼 약점을 불러오고 있습니다.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!insights) {
    return (
      <View style={styles.screen}>
        <View style={[styles.feedbackWrap, { paddingTop: insets.top + BrandSpacing.xxl }]}>
          <View style={styles.feedbackCard}>
            <Text selectable style={styles.feedbackTitle}>
              기록을 다시 불러와야 해요
            </Text>
            <Text selectable style={styles.feedbackBody}>
              현재 학습 상태를 완전히 복원하지 못했습니다. 한 번 더 불러오면 대부분 바로 해결됩니다.
            </Text>
            <BrandButton title="다시 불러오기" variant="neutral" onPress={() => void onRefresh()} />
          </View>
        </View>
      </View>
    );
  }

  const accuracyBadge = getAccuracyBadgeStyle(insights.hero.accuracyBadgeTone);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + BrandSpacing.md },
          isTablet && styles.tabletContainer,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void onRefresh()}
            tintColor={BrandColors.primarySoft}
          />
        }>

        {/* 히어로 카드 */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroMain}>
              <Text selectable style={styles.heroLabel}>복습 완료</Text>
              <View style={styles.heroCountRow}>
                <Text selectable style={styles.heroCount}>
                  {insights.hero.reviewAttempts}
                </Text>
                <Text selectable style={styles.heroCountUnit}>회</Text>
              </View>
              <Text selectable style={styles.heroSubtext}>지금까지 쌓은 복습 기록</Text>
            </View>
            {insights.hero.dueWeaknesses.length > 0 ? (
              <View style={styles.heroPanel}>
                <Text selectable style={styles.heroPanelLabel}>진행 중인 약점</Text>
                {insights.hero.dueWeaknesses.map((item) => (
                  <View key={item.weaknessId} style={styles.heroPanelRow}>
                    <Text selectable style={styles.heroPanelWeakness} numberOfLines={1}>
                      {item.label}
                    </Text>
                    <View style={styles.heroPanelStagePill}>
                      <Text selectable style={styles.heroPanelStageText}>
                        {item.stageLabel}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.heroAccuracyRow}>
            <Text selectable style={styles.heroAccuracyLabel}>최근 정답률</Text>
            <Text selectable style={styles.heroAccuracyValue}>
              {isLoadingAttempts ? '—' : insights.hero.accuracyValue}
            </Text>
            {!isLoadingAttempts && insights.hero.accuracyBadgeText !== '—' ? (
              <View style={[styles.heroAccuracyBadge, { backgroundColor: accuracyBadge.bg }]}>
                <Text selectable style={[styles.heroAccuracyBadgeText, { color: accuracyBadge.color }]}>
                  {insights.hero.accuracyBadgeText}
                </Text>
              </View>
            ) : null}
          </View>

          <BrandButton title={insights.hero.ctaLabel} onPress={onPrimaryAction} />
        </View>

        {/* 약점별 진행 단계 카드 */}
        {insights.weaknessProgress.length > 0 ? (
          <View style={styles.card}>
            <Text selectable style={styles.cardKicker}>약점별 진행 단계</Text>
            <View style={styles.progressList}>
              {insights.weaknessProgress.map((item) => (
                <View key={item.weaknessId} style={styles.progressItem}>
                  <View style={styles.progressItemHeader}>
                    <Text selectable style={styles.progressItemLabel}>{item.label}</Text>
                    <Text
                      selectable
                      style={[
                        styles.progressItemMeta,
                        item.isDue && styles.progressItemMetaDue,
                      ]}>
                      {item.stageLabel} · {item.nextLabel}
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        item.isDue && styles.progressFillDue,
                        { width: `${item.progressRatio * 100}%` },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* 최근 활동 카드 */}
        {insights.pulseItems.length > 0 ? (
          <View style={styles.card}>
            <Text selectable style={styles.cardKicker}>최근 활동</Text>
            <View style={styles.pulseList}>
              {insights.pulseItems.map((item) => (
                <View key={item.id} style={styles.pulseItem}>
                  <View style={styles.pulseCopy}>
                    <Text selectable style={styles.pulseTitle}>{item.title}</Text>
                    <Text selectable style={styles.pulseTime}>{item.occurredAtLabel}</Text>
                  </View>
                  {item.valueBadge ? (
                    <View style={styles.pulseBadge}>
                      <Text selectable style={styles.pulseBadgeText}>{item.valueBadge}</Text>
                    </View>
                  ) : (
                    <View style={[styles.pulseBadge, styles.pulseBadgeKind]}>
                      <Text selectable style={[styles.pulseBadgeText, styles.pulseBadgeKindText]}>
                        {item.kindLabel}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        ) : null}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: BrandSpacing.lg,
    paddingBottom: BrandSpacing.xxl,
    gap: BrandSpacing.md,
  },
  tabletContainer: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },

  // 히어로 카드
  heroCard: {
    backgroundColor: '#293B27',
    borderRadius: 18,
    padding: 20,
    gap: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroMain: {
    flex: 1,
    gap: 4,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  heroCountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  heroCount: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 56,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  heroCountUnit: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 20,
    fontWeight: '600',
    paddingBottom: 6,
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginTop: 2,
  },
  heroPanel: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 10,
    minWidth: 90,
    maxWidth: 110,
    gap: 6,
  },
  heroPanelLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
  },
  heroPanelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  heroPanelWeakness: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  heroPanelStagePill: {
    backgroundColor: 'rgba(122,232,154,0.25)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  heroPanelStageText: {
    color: '#7AE89A',
    fontSize: 10,
    fontWeight: '700',
  },
  heroAccuracyRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroAccuracyLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  heroAccuracyValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  heroAccuracyBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  heroAccuracyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // 세컨더리 카드 공통
  card: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 10,
  },
  cardKicker: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // 약점 진행 단계
  progressList: {
    gap: 10,
  },
  progressItem: {
    gap: 4,
  },
  progressItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  progressItemLabel: {
    ...BrandTypography.bodyStrong,
    color: BrandColors.text,
  },
  progressItemMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.primarySoft,
  },
  progressItemMetaDue: {
    color: '#E07D10',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#EDF0E8',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: BrandColors.primarySoft,
  },
  progressFillDue: {
    backgroundColor: '#E07D10',
  },

  // 최근 활동
  pulseList: {
    gap: BrandSpacing.xs,
  },
  pulseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: BrandSpacing.xs,
  },
  pulseCopy: {
    flex: 1,
    gap: 2,
  },
  pulseTitle: {
    ...BrandTypography.bodyStrong,
    color: BrandColors.text,
  },
  pulseTime: {
    ...BrandTypography.tiny,
    color: BrandColors.mutedText,
  },
  pulseBadge: {
    borderRadius: 999,
    backgroundColor: '#EDF5EF',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pulseBadgeKind: {
    backgroundColor: '#F0F4EE',
  },
  pulseBadgeText: {
    ...BrandTypography.tiny,
    color: BrandColors.success,
    fontVariant: ['tabular-nums'],
  },
  pulseBadgeKindText: {
    color: BrandColors.primarySoft,
  },

  // 로딩/오류 상태
  feedbackWrap: {
    flex: 1,
    paddingHorizontal: BrandSpacing.lg,
    paddingBottom: BrandSpacing.xxl,
  },
  feedbackCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    backgroundColor: '#FFFFFF',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  feedbackTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  feedbackBody: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
});
```

- [ ] **Step 2: TypeScript 오류 확인**

Run: `npx tsc --noEmit 2>&1 | head -50`
Expected: 오류 없음

- [ ] **Step 3: Expo Go로 앱 실행 후 내 기록 탭 확인**

Run: `npx expo start --go`

확인 항목:
- 다크 그린 히어로 카드가 최상단에 바로 시작 (BrandHeader 없음)
- 화면 타이틀 "내 기록" 없음
- 상단 safe area 여백 정상 (상태바 겹침 없음)
- 복습 완료 N회 숫자 표시 (0회도 정상)
- 진행 중 복습이 있으면 약점별 진행 단계 카드 표시 (주황/초록 구분)
- 최근 활동이 있으면 최근 활동 카드 표시
- 풀-투-리프레시 동작

- [ ] **Step 4: Commit**

```bash
git add features/history/components/history-screen-view.tsx
git commit -m "feat(history): 내 기록 화면 히어로 카드 기반 전면 리디자인"
```

---

## 구현 완료 후 확인 사항

- [ ] 기존 퀴즈/복습 완료 후 내 기록 탭으로 이동 시 `reviewAttempts` 수치 증가 확인
- [ ] `dueReviewTasks`가 비어 있을 때 히어로 패널 미표시 확인
- [ ] `nextReviewTask`가 있을 때 약점 진행 단계 카드에 "N일 후 복습" 항목 표시 확인
