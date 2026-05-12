import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandButton } from '@/components/brand/BrandButton';
import { PageContainer } from '@/components/layout/page-container';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { BrandTypography } from '@/constants/typography';
import type { UseHistoryScreenResult } from '@/features/history/hooks/use-history-screen';

export function HistoryScreenView({
  insights,
  isReady,
  isRefreshing,
  onPrimaryAction,
  onPressEmptyStateCta,
  onPressExamHistoryItem,
  onRefresh,
}: UseHistoryScreenResult) {
  const insets = useSafeAreaInsets();

  if (!isReady) {
    return (
      <View style={styles.screen}>
        <View style={[styles.feedbackWrap, { paddingTop: insets.top + BrandSpacing.xxl }]}>
          <View style={styles.feedbackCard}>
            <Text selectable style={styles.feedbackTitle}>
              기록을 준비 중이에요
            </Text>
            <Text selectable style={styles.feedbackBody}>
              학평·모의고사 응시 이력을 불러오고 있습니다.
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

  if (insights.isEmpty) {
    return (
      <View style={styles.screen}>
        <View style={[styles.feedbackWrap, { paddingTop: insets.top + BrandSpacing.xxl }]}>
          <View style={styles.feedbackCard}>
            <Text selectable style={styles.feedbackTitle}>
              아직 학평/모의고사 기록이 없어요
            </Text>
            <Text selectable style={styles.feedbackBody}>
              첫 시험을 풀고 나면 응시 횟수, 정답률, 자주 발견된 약점이 여기에 쌓입니다.
            </Text>
            <BrandButton title="시험 풀러 가기 →" onPress={onPressEmptyStateCta} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + BrandSpacing.md },
        ]}
        scrollIndicatorInsets={{ top: insets.top }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void onRefresh()}
            tintColor={BrandColors.primarySoft}
          />
        }
      >
        <PageContainer variant="reading" style={{ gap: BrandSpacing.md }}>
        {/* 히어로 카드 — 누적 성취 */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroMain}>
              <Text selectable style={styles.heroLabel}>총 응시</Text>
              <View style={styles.heroCountRow}>
                <Text selectable style={styles.heroCount}>{insights.hero.examAttempts}</Text>
                <Text selectable style={styles.heroCountUnit}>회</Text>
              </View>
              <Text selectable style={styles.heroSubtext}>학평·모의고사·수능 누적</Text>
            </View>
            <View style={styles.heroPanel}>
              <Text selectable style={styles.heroPanelLabel}>평균 정답률</Text>
              <Text selectable style={styles.heroPanelValue}>
                {insights.hero.averageAccuracyValue}
              </Text>
              <Text selectable style={styles.heroPanelMeta}>최근 5회 평균</Text>
            </View>
          </View>

          {insights.hero.topWeaknesses.length > 0 ? (
            <View style={styles.heroWeaknessSection}>
              <Text selectable style={styles.heroSectionLabel}>자주 발견된 약점</Text>
              {insights.hero.topWeaknesses.map((item) => (
                <View key={item.weaknessId} style={styles.heroWeaknessRow}>
                  <Text selectable style={styles.heroWeaknessLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <View style={styles.heroWeaknessCountPill}>
                    <Text selectable style={styles.heroWeaknessCountText}>{item.count}회</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {insights.hero.ctaKind === 'resume_analysis' && insights.hero.ctaLabel ? (
            <BrandButton title={insights.hero.ctaLabel} onPress={onPrimaryAction} />
          ) : null}
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

        {/* 최근 시험 이력 카드 */}
        {insights.examHistory.length > 0 ? (
          <View style={styles.card}>
            <Text selectable style={styles.cardKicker}>최근 시험 이력</Text>
            <View style={styles.examHistoryList}>
              {insights.examHistory.map((item) => {
                const isTappable = item.status === 'in_progress';
                return (
                  <Pressable
                    key={item.attemptId}
                    onPress={isTappable ? () => onPressExamHistoryItem(item) : undefined}
                    disabled={!isTappable}
                    accessibilityRole={isTappable ? 'button' : undefined}
                    accessibilityLabel={isTappable ? `${item.examTitle} 결과 보기` : undefined}
                    style={({ pressed }) => [
                      styles.examHistoryItem,
                      isTappable && pressed && styles.examHistoryItemPressed,
                    ]}
                  >
                    <View style={styles.examHistoryCopy}>
                      <Text selectable style={styles.examHistoryTitle} numberOfLines={2}>
                        {item.examTitle}
                      </Text>
                      <Text selectable style={styles.examHistoryMeta}>
                        {item.occurredAtLabel} · {item.accuracyLabel}
                      </Text>
                    </View>
                    <View style={styles.examHistoryRight}>
                      <View style={[
                        styles.examHistoryBadge,
                        item.status === 'in_progress' && styles.examHistoryBadgeInProgress,
                        item.status === 'completed' && styles.examHistoryBadgeCompleted,
                        item.status === 'not_started' && styles.examHistoryBadgeNotStarted,
                      ]}>
                        <Text selectable style={[
                          styles.examHistoryBadgeText,
                          item.status === 'in_progress' && styles.examHistoryBadgeTextInProgress,
                          item.status === 'completed' && styles.examHistoryBadgeTextCompleted,
                          item.status === 'not_started' && styles.examHistoryBadgeTextNotStarted,
                        ]}>
                          {item.statusLabel}
                        </Text>
                      </View>
                      {isTappable ? (
                        <Text style={styles.examHistoryChevron}>›</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        </PageContainer>
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
  },
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
    maxWidth: 120,
    gap: 6,
  },
  heroPanelLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
  },
  heroPanelValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  heroPanelMeta: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
  },
  heroWeaknessSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
    gap: 8,
  },
  heroSectionLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  heroWeaknessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroWeaknessLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  heroWeaknessCountPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  heroWeaknessCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  card: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.md,
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
    backgroundColor: BrandColors.primarySoft,
  },
  progressFillDue: {
    backgroundColor: '#E07D10',
  },
  examHistoryList: {
    gap: BrandSpacing.sm,
  },
  examHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BrandSpacing.sm,
    paddingVertical: 6,
  },
  examHistoryCopy: {
    flex: 1,
    gap: 2,
  },
  examHistoryTitle: {
    ...BrandTypography.bodyStrong,
    color: BrandColors.text,
  },
  examHistoryMeta: {
    ...BrandTypography.tiny,
    color: BrandColors.mutedText,
  },
  examHistoryBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: '#EDF0E8',
  },
  examHistoryBadgeInProgress: {
    backgroundColor: 'rgba(224, 125, 16, 0.15)',
  },
  examHistoryBadgeCompleted: {
    backgroundColor: 'rgba(47, 158, 68, 0.15)',
  },
  examHistoryBadgeNotStarted: {
    backgroundColor: '#EDF0E8',
  },
  examHistoryBadgeText: {
    ...BrandTypography.tiny,
    color: BrandColors.primarySoft,
    fontWeight: '700',
  },
  examHistoryBadgeTextInProgress: {
    color: '#E07D10',
  },
  examHistoryBadgeTextCompleted: {
    color: BrandColors.success,
  },
  examHistoryBadgeTextNotStarted: {
    color: BrandColors.mutedText,
  },
  examHistoryItemPressed: {
    opacity: 0.6,
  },
  examHistoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  examHistoryChevron: {
    fontSize: 14,
    color: BrandColors.mutedText,
    fontWeight: '600',
  },
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
