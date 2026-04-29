import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontFamilies } from '@/constants/typography';
import { WeaknessAccuracyChart } from '@/features/quiz/components/weakness-growth-chart';
import { WeaknessDetailAppearances } from '@/features/quiz/components/weakness-detail-appearances';
import { WeaknessDetailHeader } from '@/features/quiz/components/weakness-detail-header';
import { WeaknessDetailReviewProgress } from '@/features/quiz/components/weakness-detail-review-progress';
import type { UseWeaknessDetailScreenResult } from '@/features/quiz/hooks/use-weakness-detail-screen';

const MIN_CHART_POINTS = 3;

function chartDataPointCount(item: NonNullable<UseWeaknessDetailScreenResult['item']>): number {
  let count = 0;
  if (item.diagnosticAccuracy != null) count += 1;
  count += Object.keys(item.reviewAccuracyByStage).length;
  return count;
}

export function WeaknessDetailScreenView({
  loading,
  notFound,
  item,
  appearances,
  onPracticeNow,
  onBack,
}: UseWeaknessDetailScreenResult) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.appBar}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="뒤로"
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.appBarTitle} numberOfLines={1}>
          {item?.weaknessLabel ?? '약점 상세'}
        </Text>
        <View style={styles.appBarRightSpacer} />
      </View>

      {loading || item == null ? (
        <View style={styles.loadingWrap}>
          {notFound ? (
            <Text style={styles.notFound}>약점 정보를 찾을 수 없어요.</Text>
          ) : (
            <ActivityIndicator />
          )}
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <WeaknessDetailHeader item={item} />
            <View style={styles.divider} />
            <WeaknessDetailReviewProgress stage={item.stage} completed={item.completed} />
            <View style={styles.divider} />

            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>정답률 추이</Text>
              {chartDataPointCount(item) >= MIN_CHART_POINTS ? (
                <WeaknessAccuracyChart items={[item]} />
              ) : (
                <Text style={styles.chartPlaceholder}>
                  기록이 더 쌓이면 보여드릴게요.
                </Text>
              )}
            </View>
            <View style={styles.divider} />

            <WeaknessDetailAppearances appearances={appearances} />
          </ScrollView>

          <View style={styles.ctaWrap}>
            <Pressable
              onPress={onPracticeNow}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.ctaText}>
                {item.completed ? '다시 연습하기' : '지금 바로 연습하기'}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F2E7' },
  appBar: {
    height: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backArrow: {
    fontFamily: FontFamilies.bold,
    fontSize: 28,
    color: '#1C2C19',
    width: 32,
    textAlign: 'center',
  },
  appBarTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: '#1C2C19',
    flex: 1,
    textAlign: 'center',
  },
  appBarRightSpacer: { width: 32 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: {
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    color: 'rgba(72, 67, 58, 0.7)',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  divider: {
    height: 1,
    backgroundColor: 'rgba(41, 59, 39, 0.08)',
    marginHorizontal: 16,
  },
  chartSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: '#1C2C19',
  },
  chartPlaceholder: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: 'rgba(72, 67, 58, 0.55)',
    paddingVertical: 24,
    textAlign: 'center',
  },
  ctaWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  cta: {
    backgroundColor: '#1C2C19',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    color: '#F6F2E7',
  },
});
