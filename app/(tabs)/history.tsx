import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { BrandTypography } from '@/constants/typography';
import { diagnosisMap } from '@/data/diagnosisMap';
import { useCurrentLearner } from '@/features/learner/provider';

export default function HistoryScreen() {
  const { isReady, summary, homeState } = useCurrentLearner();

  return (
    <View style={styles.screen}>
      <BrandHeader compact />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text selectable style={styles.title}>
            내 기록
          </Text>
          <Text selectable style={styles.subtitle}>
            최근 진단, 복습, 실전 상태를 한 번에 확인하는 자리입니다.
          </Text>
        </View>

        <View style={styles.card}>
          <Text selectable style={styles.cardTitle}>
            최근 진단 결과
          </Text>
          {isReady && summary?.latestDiagnosticSummary ? (
            <>
              <Text selectable style={styles.body}>
                정답률 {summary.latestDiagnosticSummary.accuracy}%
              </Text>
              <Text selectable style={styles.body}>
                상위 약점:{' '}
                {summary.latestDiagnosticSummary.topWeaknesses
                  .map((weaknessId) => diagnosisMap[weaknessId].labelKo)
                  .join(', ')}
              </Text>
            </>
          ) : (
            <Text selectable style={styles.body}>
              아직 저장된 진단 결과가 없습니다.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text selectable style={styles.cardTitle}>
            복습 상태
          </Text>
          {isReady && summary?.nextReviewTask ? (
            <>
              <Text selectable style={styles.body}>
                다음 복습: {summary.nextReviewTask.stage.toUpperCase()} ·{' '}
                {diagnosisMap[summary.nextReviewTask.weaknessId].labelKo}
              </Text>
              {summary.repeatedWeaknesses.slice(0, 3).map((item) => (
                <Text key={item.weaknessId} selectable style={styles.body}>
                  반복 약점 {item.count}회 · {diagnosisMap[item.weaknessId].labelKo}
                </Text>
              ))}
            </>
          ) : (
            <Text selectable style={styles.body}>
              예정된 복습 태스크가 없습니다.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text selectable style={styles.cardTitle}>
            대표 모의고사
          </Text>
          <Text selectable style={styles.body}>
            {homeState?.featuredExamCard.status === 'in_progress'
              ? '진행 중인 대표 모의고사가 있습니다.'
              : homeState?.featuredExamCard.status === 'completed'
                ? '최근 완료한 대표 모의고사가 있습니다.'
                : '대표 모의고사를 아직 시작하지 않았습니다.'}
          </Text>
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
  heroCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    backgroundColor: '#FAFCF8',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.xs,
  },
  card: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    backgroundColor: '#fff',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.xs,
  },
  title: {
    ...BrandTypography.screenTitle,
    color: BrandColors.text,
  },
  subtitle: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
  cardTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  body: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
});
