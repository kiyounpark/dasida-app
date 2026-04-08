import { Fragment } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useIsTablet } from '@/hooks/use-is-tablet';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { BrandTypography } from '@/constants/typography';
import type { UseHistoryScreenResult } from '@/features/history/hooks/use-history-screen';

type Tone = 'positive' | 'neutral' | 'warning';

function getToneStyle(tone: Tone) {
  switch (tone) {
    case 'positive':
      return {
        backgroundColor: 'rgba(47, 158, 68, 0.12)',
        color: BrandColors.success,
      };
    case 'warning':
      return {
        backgroundColor: 'rgba(217, 142, 4, 0.12)',
        color: '#8D6200',
      };
    default:
      return {
        backgroundColor: 'rgba(74, 124, 89, 0.1)',
        color: BrandColors.primarySoft,
      };
  }
}

function TrendChart({
  spotlight,
}: {
  spotlight: NonNullable<UseHistoryScreenResult['insights']>['spotlight'];
}) {
  if (spotlight.mode === 'empty') {
    return (
      <Svg width="100%" height={112} viewBox="0 0 300 112">
        <Rect x={0} y={0} width={300} height={112} rx={18} fill="rgba(255,255,255,0.46)" />
        <SvgText x={150} y={52} textAnchor="middle" fill="#6F7F71" fontSize={13}>
          첫 기록이 쌓이면 여기서 변화량을 보여 줍니다
        </SvgText>
        <SvgText x={150} y={74} textAnchor="middle" fill="#94A196" fontSize={11}>
          한 번 더 풀면 달라진 점이 더 또렷해져요
        </SvgText>
      </Svg>
    );
  }

  if (spotlight.mode === 'single') {
    const y = 90 - spotlight.series[0].accuracy * 0.7;

    return (
      <Svg width="100%" height={112} viewBox="0 0 300 112">
        <Rect x={0} y={0} width={300} height={112} rx={18} fill="rgba(255,255,255,0.46)" />
        <Line
          x1={24}
          y1={y}
          x2={276}
          y2={y}
          stroke="rgba(74,124,89,0.18)"
          strokeWidth={2}
          strokeDasharray="4 6"
        />
        <Circle cx={150} cy={y} r={16} fill="rgba(74,124,89,0.12)" />
        <Circle cx={150} cy={y} r={7} fill="#4A7C59" />
      </Svg>
    );
  }

  const width = 300;
  const height = 112;
  const leftPad = 18;
  const rightPad = 18;
  const topPad = 16;
  const bottomPad = 18;
  const step = (width - leftPad - rightPad) / (spotlight.series.length - 1);

  const points = spotlight.series.map((point, index) => ({
    ...point,
    x: leftPad + step * index,
    y: topPad + (100 - point.accuracy) * 0.74,
  }));

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - bottomPad} L ${
    points[0].x
  } ${height - bottomPad} Z`;

  return (
    <Svg width="100%" height={112} viewBox="0 0 300 112">
      <Defs>
        <LinearGradient id="trendFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="rgba(74,124,89,0.28)" />
          <Stop offset="100%" stopColor="rgba(74,124,89,0.02)" />
        </LinearGradient>
        <LinearGradient id="trendLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#8DB396" />
          <Stop offset="100%" stopColor="#293B27" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} rx={18} fill="rgba(255,255,255,0.36)" />
      <Path d={areaPath} fill="url(#trendFill)" />
      <Path
        d={linePath}
        fill="none"
        stroke="url(#trendLine)"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((point) => (
        <Fragment key={point.id}>
          {point.isLatest ? <Circle cx={point.x} cy={point.y} r={16} fill="rgba(74,124,89,0.14)" /> : null}
          <Circle
            cx={point.x}
            cy={point.y}
            r={point.isLatest ? 7 : 5}
            fill="#FFFFFF"
            stroke="#4A7C59"
            strokeWidth={point.isLatest ? 4 : 3}
          />
        </Fragment>
      ))}
    </Svg>
  );
}

function LoadingTrendChart() {
  return (
    <Svg width="100%" height={112} viewBox="0 0 300 112">
      <Rect x={0} y={0} width={300} height={112} rx={18} fill="rgba(255,255,255,0.46)" />
      <SvgText x={150} y={52} textAnchor="middle" fill="#6F7F71" fontSize={13}>
        최근 진단 흐름을 정리하고 있어요
      </SvgText>
      <SvgText x={150} y={74} textAnchor="middle" fill="#94A196" fontSize={11}>
        실제 기록을 기준으로 변화량을 계산하는 중
      </SvgText>
    </Svg>
  );
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

  if (!isReady) {
    return (
      <View style={styles.screen}>
        <BrandHeader compact />
        <View style={styles.feedbackWrap}>
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
        <BrandHeader compact />
        <View style={styles.feedbackWrap}>
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

  const badgeToneStyle = getToneStyle(insights.spotlight.badgeTone);
  const isSpotlightLoading = isLoadingAttempts && insights.spotlight.series.length === 0;

  return (
    <View style={styles.screen}>
      <BrandHeader compact />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.container, isTablet && styles.tabletContainer]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void onRefresh()}
            tintColor={BrandColors.primarySoft}
          />
        }>
        <View style={styles.headerBlock}>
          <Text selectable style={styles.headerEyebrow}>
            DASIDA
          </Text>
          <Text selectable style={styles.headerTitle}>
            오늘 할 일과 최근 달라진 점
          </Text>
          <Text selectable style={styles.headerBody}>
            오늘 바로 할 일과 최근 진단에서 달라진 점을 먼저 볼 수 있어요.
          </Text>
        </View>

        <View style={[styles.card, styles.actionCard]}>
          <Text selectable style={styles.sectionKicker}>
            오늘 해야 할 1가지
          </Text>
          <View style={styles.actionLayout}>
            <View style={styles.actionCopy}>
              <Text selectable style={styles.cardTitle}>
                {insights.hero.title}
              </Text>
              <Text selectable style={styles.body}>
                {insights.hero.body}
              </Text>
              <View style={styles.metaRow}>
                {insights.hero.meta.map((item) => (
                  <View key={item} style={styles.metaPill}>
                    <Text selectable style={styles.metaPillText}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.pointCard}>
              <Text selectable style={styles.pointLabel}>
                지금 포인트
              </Text>
              <Text selectable style={styles.pointValue}>
                {insights.hero.pointLabel}
              </Text>
              <Text selectable style={styles.pointBody}>
                {insights.hero.pointBody}
              </Text>
            </View>
          </View>
          <BrandButton title={insights.hero.ctaLabel} onPress={onPrimaryAction} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text selectable style={styles.cardTitle}>
              이번엔 얼마나 달라졌는지
            </Text>
            <Text selectable style={styles.body}>
              지난번보다 얼마나 달라졌는지 먼저 확인해 보세요.
            </Text>
          </View>
          <View style={styles.spotlightTop}>
            <View style={styles.spotlightMain}>
              <Text selectable style={styles.spotlightLabel}>
                {isSpotlightLoading ? '최근 진단을 확인하는 중' : insights.spotlight.label}
              </Text>
              <Text selectable style={styles.spotlightValue}>
                {isSpotlightLoading ? '로딩 중' : insights.spotlight.value}
              </Text>
              <Text selectable style={styles.body}>
                {isSpotlightLoading
                  ? '최근 진단을 불러오는 중이에요. 잠시만 기다려 주세요.'
                  : insights.spotlight.supportingText}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isSpotlightLoading
                    ? 'rgba(74, 124, 89, 0.1)'
                    : badgeToneStyle.backgroundColor,
                },
              ]}>
              <Text
                selectable
                style={[
                  styles.badgeText,
                  { color: isSpotlightLoading ? BrandColors.primarySoft : badgeToneStyle.color },
                ]}>
                {isSpotlightLoading ? '계산 중' : insights.spotlight.badgeText}
              </Text>
            </View>
          </View>
          <View style={styles.chartSurface}>
            {isSpotlightLoading ? <LoadingTrendChart /> : <TrendChart spotlight={insights.spotlight} />}
            {!isSpotlightLoading && insights.spotlight.series.length > 0 ? (
              <View style={styles.scoreStrip}>
                {insights.spotlight.series.map((point) => (
                  <View
                    key={point.id}
                    style={[styles.scorePill, point.isLatest && styles.scorePillCurrent]}>
                    <Text
                      selectable
                      style={[styles.scorePillText, point.isLatest && styles.scorePillTextCurrent]}>
                      {point.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <Text selectable style={styles.body}>
            {isSpotlightLoading
              ? '조금만 기다리면 최근 변화가 정리돼서 보여집니다.'
              : insights.spotlight.coachText}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text selectable style={styles.cardTitle}>
              지난번과 이번
            </Text>
            <Text selectable style={styles.body}>
              지난번과 이번이 어떻게 달라졌는지 바로 볼 수 있어요.
            </Text>
          </View>
          {isSpotlightLoading ? (
            <View style={styles.placeholderCard}>
              <Text selectable style={styles.body}>
                지난 기록을 불러오면 이번 결과와 함께 비교해 드릴게요.
              </Text>
            </View>
          ) : insights.comparison.enabled ? (
            <>
              <View style={styles.compareGrid}>
                <View style={styles.compareBox}>
                  <Text selectable style={styles.compareLabel}>
                    지난번
                  </Text>
                  <Text selectable style={styles.compareValue}>
                    {insights.comparison.previous.accuracyLabel}
                  </Text>
                  <View style={styles.compareChipRow}>
                    {insights.comparison.previous.weaknessLabels.map((label) => (
                      <View key={label} style={styles.compareChip}>
                        <Text selectable style={styles.compareChipText}>
                          {label}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text selectable style={styles.compareTime}>
                    {insights.comparison.previous.completedAtLabel}
                  </Text>
                </View>
                <View style={[styles.compareBox, styles.compareBoxCurrent]}>
                  <Text selectable style={styles.compareLabel}>
                    이번
                  </Text>
                  <Text selectable style={styles.compareValue}>
                    {insights.comparison.current.accuracyLabel}
                  </Text>
                  <View style={styles.compareChipRow}>
                    {insights.comparison.current.weaknessLabels.map((label) => (
                      <View key={label} style={styles.compareChip}>
                        <Text selectable style={styles.compareChipText}>
                          {label}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text selectable style={styles.compareTime}>
                    {insights.comparison.current.completedAtLabel}
                  </Text>
                </View>
              </View>
              <View style={styles.compareSummary}>
                <Text selectable style={styles.compareSummaryTitle}>
                  {insights.comparison.summaryTitle}
                </Text>
                <Text selectable style={styles.body}>
                  {insights.comparison.summaryBody}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.placeholderCard}>
              <Text selectable style={styles.body}>
                {insights.comparison.placeholder}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text selectable style={styles.cardTitle}>
              지금 다시 잡을 유형
            </Text>
            <Text selectable style={styles.body}>
              자주 헷갈렸던 부분만 가볍게 모아봤어요.
            </Text>
          </View>
          {insights.focusItems.length > 0 ? (
            <View style={styles.focusList}>
              {insights.focusItems.map((item) => (
                <View key={item.weaknessId} style={styles.focusItem}>
                  <View style={styles.focusHead}>
                    <View style={styles.focusCopy}>
                      <Text selectable style={styles.focusTitle}>
                        {item.label}
                      </Text>
                      <Text selectable style={styles.body}>
                        {item.body}
                      </Text>
                    </View>
                    <View style={styles.focusCountPill}>
                      <Text selectable style={styles.focusCountText}>
                        {item.countLabel}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.focusTrack}>
                    <View style={[styles.focusFill, { width: `${item.fillRatio * 100}%` }]} />
                  </View>
                  {item.isLinkedToReview ? (
                    <View style={styles.focusBadge}>
                      <Text selectable style={styles.focusBadgeText}>
                        오늘 복습 연결됨
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.placeholderCard}>
              <Text selectable style={styles.body}>
                진단이 쌓이면 자주 헷갈리는 부분도 함께 정리해서 보여드릴게요.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text selectable style={styles.cardTitle}>
              짧은 메모
            </Text>
            <Text selectable style={styles.body}>
              최근에 했던 학습을 짧게 다시 볼 수 있어요.
            </Text>
          </View>
          {insights.pulseItems.length > 0 ? (
            <View style={styles.pulseList}>
              {insights.pulseItems.map((item) => (
                <View key={item.id} style={styles.pulseItem}>
                  <View style={styles.pulseCopy}>
                    <Text selectable style={styles.pulseTitle}>
                      {item.title}
                    </Text>
                    <Text selectable style={styles.pulseSubtitle}>
                      {item.subtitle} · {item.occurredAtLabel}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.pulsePill,
                      item.kind === 'review'
                        ? styles.pulsePillReview
                        : item.kind === 'exam'
                          ? styles.pulsePillExam
                          : undefined,
                    ]}>
                    <Text
                      selectable
                      style={[
                        styles.pulsePillText,
                        item.kind === 'review'
                          ? styles.pulsePillTextReview
                          : item.kind === 'exam'
                            ? styles.pulsePillTextExam
                            : undefined,
                      ]}>
                      {item.kindLabel}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.placeholderCard}>
              <Text selectable style={styles.body}>
                진단이나 복습이 쌓이면 최근 활동도 함께 보여드릴게요.
              </Text>
            </View>
          )}
        </View>
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
    paddingTop: BrandSpacing.md,
    paddingBottom: BrandSpacing.xxl,
    gap: BrandSpacing.md,
  },
  headerBlock: {
    gap: BrandSpacing.xs,
    paddingTop: BrandSpacing.xs,
  },
  headerEyebrow: {
    ...BrandTypography.meta,
    color: BrandColors.primarySoft,
  },
  headerTitle: {
    ...BrandTypography.screenTitle,
    color: BrandColors.text,
  },
  headerBody: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
  card: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    backgroundColor: '#FFFFFF',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  actionCard: {
    backgroundColor: '#F7FBF6',
  },
  sectionKicker: {
    ...BrandTypography.chip,
    color: BrandColors.primarySoft,
  },
  actionLayout: {
    flexDirection: 'row',
    gap: BrandSpacing.sm,
  },
  actionCopy: {
    flex: 1,
    gap: BrandSpacing.xs,
  },
  cardTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  body: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BrandSpacing.xs,
  },
  metaPill: {
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.08)',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metaPillText: {
    ...BrandTypography.chip,
    color: BrandColors.text,
  },
  pointCard: {
    width: 124,
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.08)',
    borderRadius: BrandRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    padding: BrandSpacing.sm,
    gap: BrandSpacing.xs,
  },
  pointLabel: {
    ...BrandTypography.meta,
    color: BrandColors.mutedText,
  },
  pointValue: {
    ...BrandTypography.sectionTitle,
    color: BrandColors.text,
  },
  pointBody: {
    ...BrandTypography.tiny,
    color: '#7B8A7D',
  },
  cardHeader: {
    gap: BrandSpacing.xs,
  },
  spotlightTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: BrandSpacing.sm,
  },
  spotlightMain: {
    flex: 1,
    gap: 6,
  },
  spotlightLabel: {
    ...BrandTypography.meta,
    color: BrandColors.mutedText,
  },
  spotlightValue: {
    fontSize: 46,
    lineHeight: 44,
    fontWeight: '800',
    color: BrandColors.text,
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  badgeText: {
    ...BrandTypography.chip,
  },
  chartSurface: {
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.05)',
    borderRadius: BrandRadius.lg,
    backgroundColor: '#F4F1E8',
    paddingHorizontal: BrandSpacing.xs,
    paddingTop: BrandSpacing.xs,
    paddingBottom: BrandSpacing.sm,
    gap: BrandSpacing.xs,
  },
  scoreStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BrandSpacing.xs,
  },
  scorePill: {
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.08)',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  scorePillCurrent: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  scorePillText: {
    ...BrandTypography.chip,
    color: BrandColors.mutedText,
    fontVariant: ['tabular-nums'],
  },
  scorePillTextCurrent: {
    color: '#FFFFFF',
  },
  compareGrid: {
    flexDirection: 'row',
    gap: BrandSpacing.xs,
  },
  compareBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.08)',
    borderRadius: BrandRadius.lg,
    backgroundColor: '#FBFCF9',
    padding: BrandSpacing.sm,
    gap: BrandSpacing.xs,
  },
  compareBoxCurrent: {
    backgroundColor: '#F2F8F3',
  },
  compareLabel: {
    ...BrandTypography.meta,
    color: BrandColors.mutedText,
  },
  compareValue: {
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '800',
    color: BrandColors.text,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  compareChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  compareChip: {
    borderRadius: 999,
    backgroundColor: '#F0F4EE',
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  compareChipText: {
    ...BrandTypography.tiny,
    color: BrandColors.text,
  },
  compareTime: {
    ...BrandTypography.tiny,
    color: BrandColors.mutedText,
    fontVariant: ['tabular-nums'],
  },
  compareSummary: {
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.08)',
    borderRadius: BrandRadius.lg,
    backgroundColor: '#F8FAF6',
    padding: BrandSpacing.sm,
    gap: 4,
  },
  compareSummaryTitle: {
    ...BrandTypography.bodyStrong,
    color: BrandColors.text,
    fontVariant: ['tabular-nums'],
  },
  placeholderCard: {
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.08)',
    borderRadius: BrandRadius.lg,
    backgroundColor: '#FBFCF9',
    padding: BrandSpacing.sm,
  },
  focusList: {
    gap: BrandSpacing.xs,
  },
  focusItem: {
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.08)',
    borderRadius: BrandRadius.lg,
    backgroundColor: '#FCFDFB',
    padding: BrandSpacing.sm,
    gap: BrandSpacing.xs,
  },
  focusHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: BrandSpacing.xs,
  },
  focusCopy: {
    flex: 1,
    gap: 4,
  },
  focusTitle: {
    ...BrandTypography.bodyStrong,
    color: BrandColors.text,
  },
  focusCountPill: {
    borderRadius: 999,
    backgroundColor: '#F3EFE5',
    paddingHorizontal: 9,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  focusCountText: {
    ...BrandTypography.tiny,
    color: BrandColors.text,
    fontVariant: ['tabular-nums'],
  },
  focusTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#EDF0E8',
    overflow: 'hidden',
  },
  focusFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: BrandColors.primarySoft,
  },
  focusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(47, 158, 68, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  focusBadgeText: {
    ...BrandTypography.tiny,
    color: BrandColors.success,
  },
  pulseList: {
    gap: BrandSpacing.xs,
  },
  pulseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: BrandSpacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.08)',
    borderRadius: BrandRadius.lg,
    backgroundColor: '#FCFDFB',
    paddingHorizontal: BrandSpacing.sm,
    paddingVertical: BrandSpacing.sm,
  },
  pulseCopy: {
    flex: 1,
    gap: 3,
  },
  pulseTitle: {
    ...BrandTypography.bodyStrong,
    color: BrandColors.text,
  },
  pulseSubtitle: {
    ...BrandTypography.tiny,
    color: BrandColors.mutedText,
  },
  pulsePill: {
    borderRadius: 999,
    backgroundColor: '#F3EFE5',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  pulsePillReview: {
    backgroundColor: '#EDF5EF',
  },
  pulsePillExam: {
    backgroundColor: 'rgba(217, 142, 4, 0.12)',
  },
  pulsePillText: {
    ...BrandTypography.tiny,
    color: BrandColors.text,
  },
  pulsePillTextReview: {
    color: BrandColors.primarySoft,
  },
  pulsePillTextExam: {
    color: '#8D6200',
  },
  feedbackWrap: {
    flex: 1,
    paddingHorizontal: BrandSpacing.lg,
    paddingVertical: BrandSpacing.xxl,
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
  tabletContainer: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
});
