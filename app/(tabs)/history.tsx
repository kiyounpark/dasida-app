import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { diagnosisMap } from '@/data/diagnosisMap';
import { useCurrentLearner } from '@/features/learner/provider';

export default function HistoryScreen() {
  const { isReady, profile, reviewTasks, homeState } = useCurrentLearner();

  return (
    <View style={styles.screen}>
      <BrandHeader compact />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.title}>내 기록</Text>
          <Text style={styles.subtitle}>
            최근 진단, 복습, 실전 상태를 한 번에 확인하는 자리입니다.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>최근 진단 결과</Text>
          {isReady && profile?.latestDiagnosticSummary ? (
            <>
              <Text style={styles.body}>
                정답률 {profile.latestDiagnosticSummary.accuracy}%
              </Text>
              <Text style={styles.body}>
                상위 약점:{' '}
                {profile.latestDiagnosticSummary.topWeaknesses
                  .map((weaknessId) => diagnosisMap[weaknessId].labelKo)
                  .join(', ')}
              </Text>
            </>
          ) : (
            <Text style={styles.body}>아직 저장된 진단 결과가 없습니다.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>복습 상태</Text>
          {isReady && reviewTasks.length > 0 ? (
            reviewTasks.slice(0, 3).map((task) => (
              <Text key={task.id} style={styles.body}>
                {task.stage.toUpperCase()} · {diagnosisMap[task.weaknessId].labelKo}
              </Text>
            ))
          ) : (
            <Text style={styles.body}>예정된 복습 태스크가 없습니다.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>대표 모의고사</Text>
          <Text style={styles.body}>
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
    fontSize: 24,
    fontWeight: '700',
    color: BrandColors.text,
  },
  subtitle: {
    fontSize: 16,
    color: BrandColors.mutedText,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.text,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: BrandColors.mutedText,
  },
});
