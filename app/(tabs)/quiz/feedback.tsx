import { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { diagnosisMap, resolveWeaknessId } from '@/data/diagnosisMap';
import { useQuizSession } from '@/features/quiz/session';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>학습 피드백</Text>

      {summary ? (
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>이번 학습 요약</Text>
          <Text style={styles.cardBody}>정답률: {summary.accuracy}% ({summary.correct}/{summary.total})</Text>
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
        <Button title={submitted ? '제출 완료' : '제출하기 (MVP 더미)'} onPress={() => setSubmitted(true)} />
      </View>

      <View style={styles.buttonGap}>
        <Button
          title="처음부터 다시 시작"
          onPress={() => {
            resetSession();
            router.replace('/quiz');
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    backgroundColor: '#fff',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardBody: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  weaknessList: {
    gap: 2,
  },
  prompt: {
    fontSize: 16,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
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
