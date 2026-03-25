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
  onClose: () => void;
  onOpenExams: () => void;
  onOpenWeaknessPractice: (weaknessId: string) => void;
  persistResult: () => Promise<void>;
  saveErrorMessage: string | null;
  saveState: UseResultScreenResult['saveState'];
  summary: NonNullable<UseResultScreenResult['liveSummary']>;
};

export function QuizResultReportView({
  onClose,
  onOpenExams,
  onOpenWeaknessPractice,
  persistResult,
  saveErrorMessage,
  saveState,
  summary,
}: QuizResultReportViewProps) {
  const { width } = useWindowDimensions();
  const isCompactLayout = width < 390;
  const visibleWeaknesses = summary.topWeaknesses.slice(0, 3);
  const primaryWeaknessId = visibleWeaknesses[0];

  return (
    <View style={styles.screen}>
      <QuizResultReportHeader
        isCompactLayout={isCompactLayout}
        onClose={onClose}
      />

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
          pointCount={visibleWeaknesses.length}
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
          {visibleWeaknesses.map((weaknessId) => {
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

        <View style={styles.ctaWrap}>
          <BrandButton
            title="모의고사로 내 약점 더 자세히 분석하기"
            variant="neutral"
            onPress={onOpenExams}
            style={styles.primaryCta}
          />
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
    paddingTop: 8,
    paddingBottom: 36,
    gap: 20,
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
    gap: 18,
  },
  ctaWrap: {
    gap: 14,
    paddingTop: 8,
  },
  primaryCta: {
    minHeight: 62,
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingVertical: 18,
    boxShadow: '0 14px 28px rgba(26, 38, 28, 0.12)',
  },
});
