import { useEffect, useMemo, useState } from 'react';
import { Button, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { challengeProblem } from '@/data/challengeProblem';
import { diagnosisMap, resolveWeaknessId, type WeaknessId } from '@/data/diagnosisMap';
import { practiceMap } from '@/data/practiceMap';
import { useQuizSession } from '@/features/quiz/session';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type FeedbackState =
  | {
      kind: 'correct' | 'wrong';
      message: string;
    }
  | undefined;

export default function QuizPracticeScreen() {
  const { state, advancePractice, completeChallenge } = useQuizSession();
  const params = useLocalSearchParams();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>();

  const paramMode = getSingleParam(params.mode);
  const fallbackWeaknessId = resolveWeaknessId(
    getSingleParam(params.weaknessId) ?? getSingleParam(params.weakTag),
  );

  const activeMode = state.result?.allCorrect
    ? 'challenge'
    : state.result
      ? 'weakness'
      : paramMode === 'challenge'
        ? 'challenge'
        : 'weakness';

  const activeWeaknessId: WeaknessId | undefined = useMemo(() => {
    if (state.result && activeMode === 'weakness') {
      return state.practiceQueue[state.practiceIndex];
    }
    return fallbackWeaknessId;
  }, [activeMode, fallbackWeaknessId, state.practiceIndex, state.practiceQueue, state.result]);

  const activeProblem =
    activeMode === 'challenge'
      ? challengeProblem
      : activeWeaknessId
        ? practiceMap[activeWeaknessId]
        : undefined;

  const toFeedbackParams = (mode: 'weakness' | 'challenge', weaknessId?: WeaknessId) => {
    if (mode === 'challenge') {
      return { mode };
    }

    const next: { mode: 'weakness'; weaknessId?: string; weakTag?: string } = { mode };
    if (weaknessId) {
      next.weaknessId = weaknessId;
      next.weakTag = diagnosisMap[weaknessId].labelKo;
    }
    return next;
  };

  useEffect(() => {
    setSelectedIndex(null);
    setFeedback(undefined);
  }, [activeProblem?.id]);

  const handleSubmit = () => {
    if (selectedIndex === null || !activeProblem) return;

    const isCorrect = selectedIndex === activeProblem.answerIndex;

    if (isCorrect) {
      setFeedback({
        kind: 'correct',
        message: activeProblem.explanation,
      });
      return;
    }

    setFeedback({
      kind: 'wrong',
      message: activeProblem.hint,
    });
  };

  const handleContinue = () => {
    if (feedback?.kind !== 'correct') return;

    if (activeMode === 'challenge') {
      completeChallenge();
      router.push({
        pathname: '/quiz/feedback',
        params: toFeedbackParams('challenge'),
      });
      return;
    }

    if (state.result && state.practiceMode === 'weakness') {
      const isLast = state.practiceIndex >= state.practiceQueue.length - 1;
      advancePractice();

      if (isLast) {
        router.push({
          pathname: '/quiz/feedback',
          params: toFeedbackParams('weakness', activeWeaknessId),
        });
      }
      return;
    }

    router.push({
      pathname: '/quiz/feedback',
      params: toFeedbackParams('weakness', activeWeaknessId),
    });
  };

  if (!activeProblem) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>연습 문제를 찾지 못했어요.</Text>
        <View style={styles.buttonTopGap}>
          <Button title="결과로 돌아가기" onPress={() => router.replace('/quiz/result')} />
        </View>
      </View>
    );
  }

  const weaknessLabel =
    activeMode === 'challenge'
      ? '심화 문제'
      : activeWeaknessId
        ? diagnosisMap[activeWeaknessId].labelKo
        : '약점 연습';

  const isLastWeakness =
    state.result && state.practiceMode === 'weakness'
      ? state.practiceIndex >= state.practiceQueue.length - 1
      : true;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>약점 기반 연습</Text>
      <Text style={styles.subtitle}>{weaknessLabel}</Text>
      <Text style={styles.question}>{activeProblem.question}</Text>

      <View style={styles.choicesContainer}>
        {activeProblem.choices.map((choice, index) => {
          const isSelected = selectedIndex === index;
          return (
            <Pressable
              key={`${activeProblem.id}_${index}`}
              style={[styles.choiceButton, isSelected && styles.choiceButtonSelected]}
              onPress={() => setSelectedIndex(index)}>
              <Text style={[styles.choiceText, isSelected && styles.choiceTextSelected]}>{choice}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.buttonTopGap}>
        <Button title="정답 확인" onPress={handleSubmit} disabled={selectedIndex === null || !!feedback} />
      </View>

      {feedback ? (
        <View
          style={[
            styles.feedbackCard,
            feedback.kind === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong,
          ]}>
          <Text style={styles.feedbackTitle}>
            {feedback.kind === 'correct' ? '정답입니다!' : '오답입니다. 힌트를 확인해 주세요.'}
          </Text>
          <Text style={styles.feedbackBody}>{feedback.message}</Text>

          <View style={styles.buttonTopGap}>
            {feedback.kind === 'wrong' ? (
              <Button
                title="다시 도전"
                onPress={() => {
                  setSelectedIndex(null);
                  setFeedback(undefined);
                }}
              />
            ) : (
              <Button
                title={
                  activeMode === 'challenge'
                    ? '피드백 화면으로 이동'
                    : isLastWeakness
                      ? '피드백 화면으로 이동'
                      : '다음 약점 문제'
                }
                onPress={handleContinue}
              />
            )}
          </View>
        </View>
      ) : null}
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
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    color: '#3b6b4c',
    fontWeight: '600',
  },
  question: {
    fontSize: 20,
    lineHeight: 30,
    marginTop: 8,
    fontWeight: '600',
  },
  choicesContainer: {
    marginTop: 12,
    gap: 10,
  },
  choiceButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  choiceButtonSelected: {
    borderColor: '#2f7a4f',
    backgroundColor: '#e8f4ec',
  },
  choiceText: {
    fontSize: 16,
    color: '#111',
    lineHeight: 22,
  },
  choiceTextSelected: {
    color: '#1e5d38',
    fontWeight: '700',
  },
  buttonTopGap: {
    marginTop: 12,
  },
  feedbackCard: {
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 8,
  },
  feedbackCorrect: {
    borderWidth: 1,
    borderColor: '#bce2c5',
    backgroundColor: '#effbf2',
  },
  feedbackWrong: {
    borderWidth: 1,
    borderColor: '#f2b8b8',
    backgroundColor: '#fff5f5',
  },
  feedbackTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  feedbackBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
});
