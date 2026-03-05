import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { diagnosisMap, resolveWeaknessId } from '@/data/diagnosisMap';
import { useQuizSession } from '@/features/quiz/session';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

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
      <View style={styles.centerContainer}>
        <Text style={styles.title}>진단 결과를 찾을 수 없어요.</Text>
        {legacyNextStep ? (
          <View style={styles.card}>
            <Text style={styles.legacyLabel}>호환 모드 결과</Text>
            <Text style={styles.legacyText}>판정: {legacyNextStep}</Text>
            <Text style={styles.legacyText}>
              약점: {legacyWeaknessId ? diagnosisMap[legacyWeaknessId].labelKo : '없음'}
            </Text>
            <View style={styles.buttonGap}>
              {legacyNextStep === 'wrong' ? (
                <Button
                  title="연습문제 풀어볼게요"
                  onPress={() =>
                    router.push({
                      pathname: '/quiz/practice',
                      params: legacyPracticeParams,
                    })
                  }
                />
              ) : (
                <Button title="문제로 돌아가기" onPress={() => router.replace('/quiz')} />
              )}
            </View>
          </View>
        ) : (
          <View style={styles.buttonGap}>
            <Button
              title="새로 시작하기"
              onPress={() => {
                resetSession();
                router.replace('/quiz');
              }}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>분석 결과</Text>
      <Text style={styles.summaryText}>총 {summary.total}문제 중 {summary.correct}문제 정답</Text>
      <Text style={styles.summaryText}>정답률 {summary.accuracy}%</Text>

      {summary.allCorrect ? (
        <View style={styles.cardSuccess}>
          <Text style={styles.cardTitle}>모든 문제를 맞혔어요!</Text>
          <Text style={styles.cardBody}>축하합니다. 심화 1문제로 마무리 점검을 진행합니다.</Text>
          <View style={styles.buttonGap}>
            <Button
              title="심화 문제 풀기"
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
            <Button
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 10,
  },
  centerContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
  },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  cardSuccess: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#bce2c5',
    backgroundColor: '#effbf2',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  cardWarning: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#f4d5b8',
    backgroundColor: '#fff8ef',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
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
  },
  legacyText: {
    fontSize: 15,
    color: '#444',
  },
});
