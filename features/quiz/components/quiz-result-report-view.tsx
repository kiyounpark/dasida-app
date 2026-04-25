import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { diagnosisMap } from '@/data/diagnosisMap';
import type { UseResultScreenResult } from '@/features/quiz/hooks/use-result-screen';

import { QuizResultReportCard } from './quiz-result-report-card';
import { QuizResultReportHeader } from './quiz-result-report-header';
import { QuizResultReportHero } from './quiz-result-report-hero';

type QuizResultReportViewProps = {
  onOpenWeaknessPractice: (weaknessId: string) => void;
  persistResult: () => Promise<void>;
  saveErrorMessage: string | null;
  saveState: UseResultScreenResult['saveState'];
  summary: NonNullable<UseResultScreenResult['liveSummary']>;
};

export function QuizResultReportView({
  onOpenWeaknessPractice,
  persistResult,
  saveErrorMessage,
  saveState,
  summary,
}: QuizResultReportViewProps) {
  const { width } = useWindowDimensions();
  const isCompactLayout = width < 390;
  const topWeaknesses = summary.topWeaknesses.slice(0, 3);
  const extraWeaknesses = summary.topWeaknesses.slice(3);
  const primaryWeaknessId = topWeaknesses[0];

  return (
    <View style={styles.screen}>
      <QuizResultReportHeader isCompactLayout={isCompactLayout} />

      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.container,
          isCompactLayout && styles.containerCompact,
        ]}>
        <Text selectable style={[styles.summaryLine, isCompactLayout && styles.summaryLineCompact]}>
          총 {summary.total}문제 중 {summary.correct}문제 정답 · 정답률 {summary.accuracy}%
        </Text>

        <QuizResultReportHero
          isCompactLayout={isCompactLayout}
          pointCount={topWeaknesses.length}
        />

        {saveState === 'saving' ? (
          <View style={styles.statusCard}>
            <Text selectable style={styles.statusTitle}>학습 기록을 저장 중이에요</Text>
            <Text selectable style={styles.statusBody}>
              결과, 반복 약점, 다음 복습 일정을 같이 정리하고 있습니다.
            </Text>
          </View>
        ) : null}

        {saveState === 'error' ? (
          <View style={[styles.statusCard, styles.errorCard]}>
            <Text selectable style={styles.statusTitle}>결과 저장이 완료되지 않았어요</Text>
            <Text selectable style={styles.statusBody}>
              {saveErrorMessage ?? '네트워크를 확인한 뒤 다시 시도해 주세요.'}
            </Text>
            <View style={styles.statusButtonWrap}>
              <BrandButton title="다시 저장하기" variant="danger" onPress={() => void persistResult()} />
            </View>
          </View>
        ) : null}

        <View style={styles.cardList}>
          {topWeaknesses.map((weaknessId) => {
            const info = diagnosisMap[weaknessId];

            return (
              <QuizResultReportCard
                key={weaknessId}
                description={info.desc}
                isCompactLayout={isCompactLayout}
                tip={info.tip}
                title={info.labelKo}
              />
            );
          })}
        </View>

        {extraWeaknesses.length > 0 && (
          <View style={styles.extraSection}>
            <Text style={styles.extraSectionLabel}>
              그 외 약점 {extraWeaknesses.length}개
            </Text>
            <View style={styles.compactList}>
              {extraWeaknesses.map((weaknessId) => {
                const info = diagnosisMap[weaknessId];
                return (
                  <View key={weaknessId} style={styles.compactRow}>
                    <View style={styles.topicChip}>
                      <Text style={styles.topicChipText}>{info.topicLabel}</Text>
                    </View>
                    <Text style={styles.compactRowName} numberOfLines={1}>
                      {info.labelKo}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.ctaWrap}>
          <BrandButton
            title="약점 기반 연습문제 풀러가기"
            variant="neutral"
            disabled={!primaryWeaknessId}
            onPress={() => {
              if (!primaryWeaknessId) {
                return;
              }

              onOpenWeaknessPractice(primaryWeaknessId);
            }}
            style={styles.primaryCta}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F3E8',
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 12,
  },
  containerCompact: {
    paddingHorizontal: 14,
    paddingTop: 4,
    gap: 16,
  },
  summaryLine: {
    alignSelf: 'center',
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    lineHeight: 20,
    color: '#576157',
    textAlign: 'center',
  },
  summaryLineCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusCard: {
    borderWidth: 1,
    borderColor: 'rgba(53, 72, 50, 0.16)',
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 4,
  },
  errorCard: {
    borderColor: '#D48B7A',
    backgroundColor: '#FFF7F4',
  },
  statusTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 22,
    color: BrandColors.text,
  },
  statusBody: {
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    lineHeight: 21,
    color: '#4F5B52',
  },
  statusButtonWrap: {
    marginTop: 10,
  },
  cardList: {
    gap: 12,
  },
  extraSection: {
    gap: 8,
  },
  extraSectionLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    lineHeight: 18,
    color: '#1C2C19',
  },
  compactList: {
    gap: 6,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 252, 247, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.10)',
    borderRadius: 11,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topicChip: {
    backgroundColor: 'rgba(74, 124, 89, 0.13)',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
  },
  topicChipText: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    lineHeight: 16,
    color: '#2A5C38',
  },
  compactRowName: {
    flex: 1,
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    lineHeight: 18,
    color: '#1C2C19',
  },
  ctaWrap: {
    gap: 10,
    paddingTop: 4,
  },
  primaryCta: {
    minHeight: 50,
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingVertical: 12,
    boxShadow: '0 14px 28px rgba(26, 38, 28, 0.12)',
  },
});
