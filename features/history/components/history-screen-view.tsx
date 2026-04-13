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
        scrollIndicatorInsets={{ top: insets.top }}
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
    maxWidth: 120,
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
