import { useEffect, useMemo, useState } from 'react';
import { Button, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { diagnosisTree, methodOptions, type SolveMethodId } from '@/data/diagnosisTree';
import type { WeaknessId } from '@/data/diagnosisMap';
import { problemData } from '@/data/problemData';
import { useQuizSession } from '@/features/quiz/session';

type PendingWrongState = {
  problemId: string;
  selectedIndex: number;
  methodId?: SolveMethodId;
};

export default function QuizIndexScreen() {
  const { state, submitCorrectAnswer, submitWrongAnswer } = useQuizSession();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pendingWrong, setPendingWrong] = useState<PendingWrongState | null>(null);

  const currentProblem = useMemo(
    () => problemData[state.currentQuestionIndex],
    [state.currentQuestionIndex],
  );

  useEffect(() => {
    setSelectedIndex(null);
    setPendingWrong(null);
  }, [state.currentQuestionIndex]);

  useEffect(() => {
    if (state.result) {
      router.replace('/quiz/result');
    }
  }, [state.result]);

  const handleSubmit = () => {
    if (!currentProblem || selectedIndex === null) return;

    const isCorrect = selectedIndex === currentProblem.answerIndex;

    if (isCorrect) {
      submitCorrectAnswer(currentProblem.id, selectedIndex);
      return;
    }

    setPendingWrong({
      problemId: currentProblem.id,
      selectedIndex,
    });
  };

  const handleMethodSelect = (methodId: SolveMethodId) => {
    setPendingWrong((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        methodId,
      };
    });
  };

  const handleWeaknessSelect = (weaknessId: WeaknessId) => {
    if (!pendingWrong?.methodId) return;

    submitWrongAnswer(
      pendingWrong.problemId,
      pendingWrong.selectedIndex,
      pendingWrong.methodId,
      weaknessId,
    );
  };

  if (!currentProblem && !state.result) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>결과를 계산 중입니다...</Text>
      </View>
    );
  }

  if (!currentProblem) {
    return null;
  }

  const stepTitle = `${state.currentQuestionIndex + 1} / ${problemData.length}`;
  const methodStep = pendingWrong?.methodId ? diagnosisTree[pendingWrong.methodId] : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>10문제 약점 진단</Text>
      <Text style={styles.progress}>{stepTitle}</Text>
      <Text style={styles.topic}>{currentProblem.topic}</Text>
      <Text style={styles.question}>{currentProblem.question}</Text>

      <View style={styles.choicesContainer}>
        {currentProblem.choices.map((choice, index) => {
          const isSelected = selectedIndex === index;
          return (
            <Pressable
              key={`${currentProblem.id}_${index}`}
              style={[styles.choiceButton, isSelected && styles.choiceButtonSelected]}
              onPress={() => setSelectedIndex(index)}>
              <Text style={[styles.choiceText, isSelected && styles.choiceTextSelected]}>
                {choice}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.submitContainer}>
        <Button title="제출하기" onPress={handleSubmit} disabled={selectedIndex === null || pendingWrong !== null} />
      </View>

      {pendingWrong ? (
        <View style={styles.diagnosisCard}>
          <Text style={styles.diagnosisTitle}>오답 진단</Text>
          {!methodStep ? (
            <>
              <Text style={styles.diagnosisText}>어떤 방법으로 풀었나요?</Text>
              <View style={styles.diagnosisChoices}>
                {methodOptions.map((option) => (
                  <Pressable
                    key={option.id}
                    style={styles.diagnosisChoiceButton}
                    onPress={() => handleMethodSelect(option.id)}>
                    <Text style={styles.diagnosisChoiceText}>{option.labelKo}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.diagnosisText}>{methodStep.prompt}</Text>
              <View style={styles.diagnosisChoices}>
                {methodStep.choices.map((choice) => (
                  <Pressable
                    key={choice.id}
                    style={styles.diagnosisChoiceButton}
                    onPress={() => handleWeaknessSelect(choice.weaknessId)}>
                    <Text style={styles.diagnosisChoiceText}>{choice.text}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
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
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  progress: {
    fontSize: 15,
    color: '#3b6b4c',
    fontWeight: '600',
  },
  topic: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
  },
  question: {
    fontSize: 20,
    lineHeight: 30,
    marginTop: 6,
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
  },
  choiceTextSelected: {
    color: '#1e5d38',
    fontWeight: '700',
  },
  submitContainer: {
    marginTop: 14,
  },
  diagnosisCard: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ffd8d8',
    borderRadius: 12,
    backgroundColor: '#fff5f5',
    padding: 14,
    gap: 10,
  },
  diagnosisTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9a3434',
  },
  diagnosisText: {
    fontSize: 15,
    color: '#4b4b4b',
    lineHeight: 22,
  },
  diagnosisChoices: {
    gap: 8,
  },
  diagnosisChoiceButton: {
    borderWidth: 1,
    borderColor: '#f2b8b8',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  diagnosisChoiceText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
});
