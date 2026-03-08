import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { diagnosisMap, resolveWeaknessId } from '@/data/diagnosisMap';
import { useQuizSession } from '@/features/quiz/session';
import { getSingleParam } from '@/utils/get-single-param';

export default function QuizResultScreen() {
  const { state, resetSession } = useQuizSession();
  const params = useLocalSearchParams();

  const summary = state.result;
  const legacyNextStep = getSingleParam(params.nextStep);
  const legacyWeaknessId = resolveWeaknessId(
    getSingleParam(params.weaknessId) ?? getSingleParam(params.weakTag),
  );
  const legacyPracticeParams: { mode: 'weakness'; weaknessId?: string; weakTag?: string } = {
    mode: 'weakness',
  };

  if (legacyWeaknessId) {
    legacyPracticeParams.weaknessId = legacyWeaknessId;
    legacyPracticeParams.weakTag = diagnosisMap[legacyWeaknessId].labelKo;
  }

  if (!summary) {
    return (
      <View style={styles.screen}>
        <BrandHeader compact />
        <View style={styles.fallbackBody}>
          <View style={styles.cardFallback}>
            <Text style={styles.title}>진단 결과를 찾을 수 없어요.</Text>
            {legacyNextStep ? (
              <>
                <Text style={styles.legacyLabel}>호환 모드 결과</Text>
                <Text style={styles.legacyText}>판정: {legacyNextStep}</Text>
                <Text style={styles.legacyText}>
                  약점: {legacyWeaknessId ? diagnosisMap[legacyWeaknessId].labelKo : '없음'}
                </Text>
                <View style={styles.buttonGap}>
                  {legacyNextStep === 'wrong' ? (
                    <BrandButton
                      title="연습문제 풀어볼게요"
                      onPress={() =>
                        router.push({
                          pathname: '/quiz/practice',
                          params: legacyPracticeParams,
                        })
                      }
                    />
                  ) : (
                    <BrandButton title="문제로 돌아가기" onPress={() => router.replace('/quiz')} />
                  )}
                </View>
              </>
            ) : (
              <View style={styles.buttonGap}>
                <BrandButton
                  title="새로 시작하기"
                  onPress={() => {
                    resetSession();
                    router.replace('/quiz');
                  }}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <BrandHeader />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>
        <View style={styles.summaryCard}>
          <Text style={styles.title}>분석 결과</Text>
          <Text style={styles.summaryText}>총 {summary.total}문제 중 {summary.correct}문제 정답</Text>
          <Text style={styles.summaryText}>정답률 {summary.accuracy}%</Text>
        </View>

        {summary.allCorrect ? (
          <View style={styles.cardSuccess}>
            <Text style={styles.cardTitle}>모든 문제를 맞혔어요!</Text>
            <Text style={styles.cardBody}>축하합니다. 심화 1문제로 마무리 점검을 진행합니다.</Text>
            <View style={styles.buttonGap}>
              <BrandButton
                title="심화 문제 풀기"
                variant="success"
                onPress={() =>
                  router.push({
                    pathname: '/quiz/practice',
                    params: { mode: 'challenge' },
                  })
                }
              />
            </View>
          </View>
        ) : (
          <View style={styles.cardWarning}>
            <Text style={styles.cardTitle}>상위 약점 3개</Text>
            {summary.topWeaknesses.map((weaknessId, index) => {
              const info = diagnosisMap[weaknessId];
              return (
                <View key={weaknessId} style={styles.weaknessRow}>
                  <Text style={styles.weaknessTitle}>{index + 1}. {info.labelKo}</Text>
                  <Text style={styles.weaknessBody}>{info.desc}</Text>
                </View>
              );
            })}
            <View style={styles.buttonGap}>
              <BrandButton
                title="약점 연습 시작"
                onPress={() =>
                  router.push({
                    pathname: '/quiz/practice',
                    params: {
                      mode: 'weakness',
                      weaknessId: summary.topWeaknesses[0],
                    },
                  })
                }
              />
            </View>
          </View>
        )}
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
  fallbackBody: {
    flex: 1,
    paddingHorizontal: BrandSpacing.lg,
    paddingBottom: BrandSpacing.lg,
  },
  cardFallback: {
    marginTop: BrandSpacing.md,
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.md,
    padding: BrandSpacing.md,
    gap: BrandSpacing.xs,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: BrandColors.text,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.xs,
    backgroundColor: '#fff',
  },
  summaryText: {
    fontSize: 16,
    color: '#2f3a32',
    fontVariant: ['tabular-nums'],
  },
  cardSuccess: {
    borderWidth: 1,
    borderColor: '#BFE2C7',
    backgroundColor: '#EEF9F1',
    borderRadius: BrandRadius.md,
    padding: BrandSpacing.md,
    gap: BrandSpacing.xs,
  },
  cardWarning: {
    borderWidth: 1,
    borderColor: '#E8D5BE',
    backgroundColor: '#FFF8EF',
    borderRadius: BrandRadius.md,
    padding: BrandSpacing.md,
    gap: BrandSpacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.text,
  },
  cardBody: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  weaknessRow: {
    gap: 4,
  },
  weaknessTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2a2a2a',
  },
  weaknessBody: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  buttonGap: {
    marginTop: 10,
  },
  legacyLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
    color: BrandColors.text,
  },
  legacyText: {
    fontSize: 15,
    color: '#444',
  },
});
