import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { useIsTablet } from '@/hooks/use-is-tablet';

import type { ExamResultSummary } from '../types';

type ExamResultScreenViewProps = {
  result: ExamResultSummary;
  examTitle: string;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  onStartDiagnostic: () => void;
  onReturnHome: () => void;
};

export function ExamResultScreenView({
  result,
  examTitle,
  saveState,
  onStartDiagnostic,
  onReturnHome,
}: ExamResultScreenViewProps) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();

  if (isTablet) {
    return (
      <View style={[styles.screen, { flex: 1 }]}>
        <View style={[styles.heroWrap, { paddingTop: insets.top + 24 }]}>
          <Text selectable style={styles.examTitle}>{examTitle}</Text>
          <Text selectable style={styles.heroLabel}>채점 결과</Text>
        </View>
        <View style={styles.tabletBody}>
          {/* 좌: 점수 카드 + 저장 상태 */}
          <ScrollView
            style={styles.tabletLeft}
            contentContainerStyle={styles.tabletLeftContent}>
            <View style={styles.scoreCard}>
              <View style={styles.scoreRow}>
                <View style={styles.scoreStat}>
                  <Text selectable style={styles.scoreStatValue}>{result.totalScore}</Text>
                  <Text selectable style={styles.scoreStatLabel}>획득 점수</Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreStat}>
                  <Text selectable style={styles.scoreStatValue}>{result.maxScore}</Text>
                  <Text selectable style={styles.scoreStatLabel}>만점</Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreStat}>
                  <Text selectable style={[styles.scoreStatValue, styles.accuracyValue]}>
                    {result.accuracy}%
                  </Text>
                  <Text selectable style={styles.scoreStatLabel}>정답률</Text>
                </View>
              </View>
              <View style={styles.countRow}>
                <View style={[styles.countBadge, styles.correctBadge]}>
                  <Text selectable style={styles.countBadgeText}>정답 {result.correct}</Text>
                </View>
                <View style={[styles.countBadge, styles.wrongBadge]}>
                  <Text selectable style={styles.countBadgeText}>오답 {result.wrong}</Text>
                </View>
                {result.unanswered > 0 && (
                  <View style={[styles.countBadge, styles.unansweredBadge]}>
                    <Text selectable style={styles.countBadgeText}>미답변 {result.unanswered}</Text>
                  </View>
                )}
              </View>
            </View>
            {saveState === 'saving' && (
              <Text selectable style={styles.saveStatus}>결과 저장 중...</Text>
            )}
            {saveState === 'error' && (
              <Text selectable style={[styles.saveStatus, styles.saveError]}>
                결과 저장에 실패했습니다.
              </Text>
            )}
          </ScrollView>
          {/* 우: CTA */}
          <View style={[styles.tabletRight, { paddingBottom: insets.bottom + 32 }]}>
            <Pressable
              accessibilityRole="button"
              onPress={onStartDiagnostic}
              style={styles.primaryCta}>
              <Text selectable style={styles.primaryCtaText}>약점 분석하러 가기</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onReturnHome}
              style={styles.secondaryCta}>
              <Text selectable style={styles.secondaryCtaText}>홈으로 돌아가기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}>
      {/* 헤더 */}
      <View style={[styles.heroWrap, { paddingTop: insets.top + 24 }]}>
        <Text selectable style={styles.examTitle}>
          {examTitle}
        </Text>
        <Text selectable style={styles.heroLabel}>
          채점 결과
        </Text>
      </View>

      {/* 점수 카드 */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreRow}>
          <View style={styles.scoreStat}>
            <Text selectable style={styles.scoreStatValue}>
              {result.totalScore}
            </Text>
            <Text selectable style={styles.scoreStatLabel}>
              획득 점수
            </Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreStat}>
            <Text selectable style={styles.scoreStatValue}>
              {result.maxScore}
            </Text>
            <Text selectable style={styles.scoreStatLabel}>
              만점
            </Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreStat}>
            <Text selectable style={[styles.scoreStatValue, styles.accuracyValue]}>
              {result.accuracy}%
            </Text>
            <Text selectable style={styles.scoreStatLabel}>
              정답률
            </Text>
          </View>
        </View>

        <View style={styles.countRow}>
          <View style={[styles.countBadge, styles.correctBadge]}>
            <Text selectable style={styles.countBadgeText}>
              정답 {result.correct}
            </Text>
          </View>
          <View style={[styles.countBadge, styles.wrongBadge]}>
            <Text selectable style={styles.countBadgeText}>
              오답 {result.wrong}
            </Text>
          </View>
          {result.unanswered > 0 && (
            <View style={[styles.countBadge, styles.unansweredBadge]}>
              <Text selectable style={styles.countBadgeText}>
                미답변 {result.unanswered}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 저장 상태 */}
      {saveState === 'saving' && (
        <Text selectable style={styles.saveStatus}>
          결과 저장 중...
        </Text>
      )}
      {saveState === 'error' && (
        <Text selectable style={[styles.saveStatus, styles.saveError]}>
          결과 저장에 실패했습니다.
        </Text>
      )}

      {/* CTA */}
      <View style={styles.ctaWrap}>
        <Pressable
          accessibilityRole="button"
          onPress={onStartDiagnostic}
          style={styles.primaryCta}>
          <Text selectable style={styles.primaryCtaText}>
            약점 분석하러 가기
          </Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={onReturnHome} style={styles.secondaryCta}>
          <Text selectable style={styles.secondaryCtaText}>
            홈으로 돌아가기
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: BrandSpacing.lg,
    gap: BrandSpacing.lg,
  },
  heroWrap: {
    alignItems: 'center',
    paddingBottom: BrandSpacing.sm,
    gap: 6,
  },
  examTitle: {
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    lineHeight: 18,
    color: BrandColors.primarySoft,
  },
  heroLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 28,
    lineHeight: 36,
    color: '#1B1A17',
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.md,
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  scoreDivider: {
    width: 1,
    height: 40,
    backgroundColor: BrandColors.border,
  },
  scoreStatValue: {
    fontFamily: FontFamilies.bold,
    fontSize: 32,
    lineHeight: 40,
    color: '#1B1A17',
  },
  accuracyValue: {
    color: BrandColors.primarySoft,
  },
  scoreStatLabel: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#8E8A81',
  },
  countRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  countBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  correctBadge: {
    backgroundColor: '#EEF8EE',
  },
  wrongBadge: {
    backgroundColor: '#FFF0F0',
  },
  unansweredBadge: {
    backgroundColor: '#F5F4F1',
  },
  countBadgeText: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
    color: '#4A4A4A',
  },
  saveStatus: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#8E8A81',
    textAlign: 'center',
  },
  saveError: {
    color: BrandColors.danger,
  },
  ctaWrap: {
    gap: BrandSpacing.sm,
    marginTop: BrandSpacing.sm,
  },
  primaryCta: {
    backgroundColor: BrandColors.primaryDark,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  primaryCtaText: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  secondaryCta: {
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: '#CAC7BF',
    backgroundColor: '#FFFFFF',
  },
  secondaryCtaText: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 22,
    color: '#8E8A81',
  },
  // 태블릿
  tabletBody: {
    flex: 1,
    flexDirection: 'row' as const,
  },
  tabletLeft: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#E8E4DC',
  },
  tabletLeftContent: {
    padding: 20,
    gap: 20,
  },
  tabletRight: {
    width: 320,
    padding: 20,
    gap: 12,
    justifyContent: 'center' as const,
  },
});
