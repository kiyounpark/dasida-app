import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { diagnosisMap } from '@/data/diagnosisMap';
import type { UseResultScreenResult } from '@/features/quiz/hooks/use-result-screen';
import { QuizResultReportView } from '@/features/quiz/components/quiz-result-report-view';

export function QuizResultScreenView({
  legacyNextStep,
  legacyWeaknessId,
  liveSummary,
  onCloseReport,
  onOpenChallengePractice,
  onOpenLegacyPractice,
  onOpenSnapshotDiagnostic,
  onOpenSnapshotPractice,
  onOpenWeaknessPractice,
  onRestartQuiz,
  persistResult,
  saveErrorMessage,
  saveState,
  snapshotSummary,
  snapshotSummaryTitle,
}: UseResultScreenResult) {
  if (!liveSummary && !snapshotSummary) {
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
                    <BrandButton title="연습문제 풀어볼게요" onPress={onOpenLegacyPractice} />
                  ) : (
                    <BrandButton title="문제로 돌아가기" onPress={onRestartQuiz} />
                  )}
                </View>
              </>
            ) : (
              <View style={styles.buttonGap}>
                <BrandButton title="새로 시작하기" onPress={onRestartQuiz} />
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  if (!liveSummary && snapshotSummary) {
    return (
      <View style={styles.screen}>
        <BrandHeader />
        <ScrollView
          style={styles.scroll}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.container}>
          <View style={styles.summaryCard}>
            <Text style={styles.title}>최근 진단 결과</Text>
            <Text style={styles.summaryText}>정답률 {snapshotSummary.accuracy}%</Text>
            <Text style={styles.summaryText}>
              최근 진단 시각 {new Date(snapshotSummary.completedAt).toLocaleDateString('ko-KR')}
            </Text>
          </View>

          {snapshotSummary.topWeaknesses.length === 0 ? (
            <View style={styles.cardNeutral}>
              <Text style={styles.cardTitle}>아직 저장된 약점 요약이 없어요</Text>
              <Text style={styles.cardBody}>
                진단을 마치면 최근 결과와 다시 볼 약점을 여기서 바로 확인할 수 있어요.
              </Text>
              <View style={styles.buttonGap}>
                <BrandButton title="10문제 체험 시작" onPress={onOpenSnapshotDiagnostic} />
              </View>
            </View>
          ) : (
            <View style={styles.cardWarning}>
              <Text style={styles.cardTitle}>
                지금 가장 먼저 다시 볼 약점{snapshotSummaryTitle ? ` · ${snapshotSummaryTitle}` : ''}
              </Text>
              {snapshotSummary.topWeaknesses.map((weaknessId, index) => {
                const info = diagnosisMap[weaknessId];
                return (
                  <View key={weaknessId} style={styles.weaknessRow}>
                    <Text style={styles.weaknessTitle}>
                      {index + 1}. {info.labelKo}
                    </Text>
                    <Text style={styles.weaknessBody}>{info.desc}</Text>
                  </View>
                );
              })}
              <View style={styles.buttonGap}>
                <BrandButton
                  title="오늘의 약점 학습 시작"
                  onPress={() => onOpenSnapshotPractice(snapshotSummary.topWeaknesses[0])}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  const summary = liveSummary!;

  if (!summary.allCorrect && summary.topWeaknesses.length > 0) {
    return (
      <QuizResultReportView
        onClose={onCloseReport}
        onOpenWeaknessPractice={onOpenWeaknessPractice}
        persistResult={persistResult}
        saveErrorMessage={saveErrorMessage}
        saveState={saveState}
        summary={summary}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <BrandHeader />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>
        {saveState === 'saving' ? (
          <View style={styles.saveInfoCard}>
            <Text style={styles.saveInfoTitle}>학습 기록을 저장 중이에요</Text>
            <Text style={styles.saveInfoBody}>
              결과, 반복 약점, 다음 복습 일정을 같이 정리하고 있습니다.
            </Text>
          </View>
        ) : null}

        {saveState === 'error' ? (
          <View style={styles.saveErrorCard}>
            <Text style={styles.saveInfoTitle}>결과 저장이 완료되지 않았어요</Text>
            <Text style={styles.saveInfoBody}>
              {saveErrorMessage ?? '네트워크를 확인한 뒤 다시 시도해 주세요.'}
            </Text>
            <View style={styles.buttonGap}>
              <BrandButton title="다시 저장하기" variant="danger" onPress={() => void persistResult()} />
            </View>
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <Text style={styles.title}>분석 결과</Text>
          <Text style={styles.summaryText}>
            총 {summary.total}문제 중 {summary.correct}문제 정답
          </Text>
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
                onPress={onOpenChallengePractice}
              />
            </View>
          </View>
        ) : summary.topWeaknesses.length === 0 ? (
          <View style={styles.cardNeutral}>
            <Text style={styles.cardTitle}>오답은 있었지만 약점 분석은 아직 완료되지 않았어요</Text>
            <Text style={styles.cardBody}>
              이번에는 추천 약점을 만들지 않았어요. 다시 풀면서 진단을 완료하면 더 구체적으로 안내할 수 있어요.
            </Text>
            <View style={styles.buttonGap}>
              <BrandButton
                title="처음부터 다시 풀기"
                variant="neutral"
                onPress={onRestartQuiz}
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
                title="오늘의 약점 학습 시작"
                onPress={() => onOpenWeaknessPractice(summary.topWeaknesses[0])}
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
  saveInfoCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.md,
    padding: BrandSpacing.md,
    gap: BrandSpacing.xs,
    backgroundColor: '#fff',
  },
  saveErrorCard: {
    borderWidth: 1,
    borderColor: '#D48B7A',
    borderRadius: BrandRadius.md,
    padding: BrandSpacing.md,
    gap: BrandSpacing.xs,
    backgroundColor: '#FFF7F4',
  },
  saveInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.text,
  },
  saveInfoBody: {
    fontSize: 14,
    lineHeight: 21,
    color: '#4F5B52',
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
  cardNeutral: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: '#FFFFFF',
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
  secondaryButtonGap: {
    marginTop: 8,
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
