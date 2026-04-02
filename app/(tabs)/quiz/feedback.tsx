import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { diagnosisMap, resolveWeaknessId } from '@/data/diagnosisMap';
import { useQuizSession } from '@/features/quiz/session';
import { getSingleParam } from '@/utils/get-single-param';

export default function QuizFeedbackScreen() {
  const { state, resetSession } = useQuizSession();
  const params = useLocalSearchParams();
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const summary = state.result;
  const fallbackWeaknessId = resolveWeaknessId(
    getSingleParam(params.weaknessId) ?? getSingleParam(params.weakTag),
  );

  const mode = getSingleParam(params.mode) ?? (summary?.allCorrect ? 'challenge' : 'weakness');

  return (
    <View style={styles.screen}>
      <BrandHeader />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}>
        <View style={styles.mainCard}>
          <Text style={styles.title}>학습 피드백</Text>

          {summary ? (
            <View style={styles.summaryCard}>
              <Text style={styles.cardTitle}>이번 학습 요약</Text>
              <Text style={styles.summaryMetric}>
                정답률: {summary.accuracy}% ({summary.correct}/{summary.total})
              </Text>
              <Text style={styles.cardBody}>연습 모드: {mode === 'challenge' ? '심화 문제' : '약점 연습'}</Text>
              {summary.allCorrect ? (
                <Text style={styles.cardBody}>모든 본문 문제를 정답 처리했습니다.</Text>
              ) : (
                <View style={styles.weaknessList}>
                  {summary.topWeaknesses.map((id, index) => (
                    <Text key={id} style={styles.cardBody}>
                      {index + 1}. {diagnosisMap[id].labelKo}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.summaryCard}>
              <Text style={styles.cardTitle}>호환 모드 요약</Text>
              <Text style={styles.cardBody}>
                약점: {fallbackWeaknessId ? diagnosisMap[fallbackWeaknessId].labelKo : '정보 없음'}
              </Text>
            </View>
          )}

          <Text style={styles.prompt}>이번 학습 경험을 한 줄로 남겨주세요.</Text>
          <TextInput
            style={styles.input}
            value={feedback}
            onChangeText={setFeedback}
            placeholder="예: 오답에서 바로 약점을 잡아주는 게 좋았어요"
            multiline
          />

          <View style={styles.buttonGap}>
            <BrandButton
              title={submitted ? '제출 완료' : '제출하기'}
              variant={submitted ? 'success' : 'primary'}
              disabled={submitted}
              onPress={() => {
                setSubmitted(true);
                resetSession();
                router.replace('/(tabs)/quiz');
              }}
            />
          </View>

          <View style={styles.buttonGap}>
            <BrandButton
              title="처음부터 다시 시작"
              variant="neutral"
              onPress={() => {
                resetSession();
                router.replace('/(tabs)/quiz');
              }}
            />
          </View>
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
  mainCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    backgroundColor: '#fff',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: BrandColors.text,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.md,
    padding: 14,
    gap: 8,
    backgroundColor: '#fff',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.text,
  },
  cardBody: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  summaryMetric: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
  weaknessList: {
    gap: 2,
  },
  prompt: {
    fontSize: 16,
    marginTop: 8,
    color: '#2D3A30',
  },
  input: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonGap: {
    marginTop: 8,
  },
});
