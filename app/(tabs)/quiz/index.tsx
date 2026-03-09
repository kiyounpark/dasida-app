import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { MathText } from '@/components/math/MathText';
import { ProblemStatement } from '@/components/math/problem-statement';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import type { WeaknessId } from '@/data/diagnosisMap';
import { diagnosisTree, methodOptions, type SolveMethodId } from '@/data/diagnosisTree';
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
      <View style={styles.screen}>
        <BrandHeader compact />
        <View style={styles.loadingBody}>
          <Text style={styles.loadingText}>결과를 계산 중입니다...</Text>
        </View>
      </View>
    );
  }

  if (!currentProblem) {
    return null;
  }

  const stepTitle = `${state.currentQuestionIndex + 1} / ${problemData.length}`;
  const methodStep = pendingWrong?.methodId ? diagnosisTree[pendingWrong.methodId] : null;

  return (
    <View style={styles.screen}>
      <BrandHeader />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>
        <View style={styles.surfaceCard}>
          <Text style={styles.sectionTitle}>10문제 약점 진단</Text>
          <Text style={styles.progress}>{stepTitle}</Text>
          <Text style={styles.topic}>{currentProblem.topic}</Text>
          <ProblemStatement question={currentProblem.question} />

          <View style={styles.choicesContainer}>
            {currentProblem.choices.map((choice, index) => {
              const isSelected = selectedIndex === index;
              return (
                <Pressable
                  key={`${currentProblem.id}_${index}`}
                  style={[styles.choiceButton, isSelected && styles.choiceButtonSelected]}
                  onPress={() => setSelectedIndex(index)}>
                  <MathText
                    text={choice}
                    style={[styles.choiceText, isSelected && styles.choiceTextSelected]}
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.submitContainer}>
            <BrandButton
              title="답 제출하기"
              onPress={handleSubmit}
              disabled={selectedIndex === null || pendingWrong !== null}
            />
          </View>
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
  loadingBody: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: BrandSpacing.lg,
  },
  loadingText: {
    marginTop: BrandSpacing.lg,
    textAlign: 'center',
    color: BrandColors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  surfaceCard: {
    backgroundColor: BrandColors.card,
    borderRadius: BrandRadius.lg,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
    boxShadow: '0 12px 32px rgba(41, 59, 39, 0.08)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.text,
  },
  progress: {
    fontSize: 14,
    color: BrandColors.primarySoft,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  topic: {
    fontSize: 13,
    color: BrandColors.mutedText,
    marginTop: 2,
  },
  choicesContainer: {
    marginTop: BrandSpacing.sm,
    gap: BrandSpacing.sm,
  },
  choiceButton: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: BrandRadius.sm,
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  choiceButtonSelected: {
    borderColor: BrandColors.primarySoft,
    backgroundColor: BrandColors.primarySoft,
  },
  choiceText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
  },
  choiceTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  submitContainer: {
    marginTop: BrandSpacing.md,
  },
  diagnosisCard: {
    borderWidth: 1,
    borderColor: '#E6C7C7',
    borderRadius: BrandRadius.md,
    backgroundColor: '#FFF4F4',
    padding: BrandSpacing.md,
    gap: BrandSpacing.sm,
  },
  diagnosisTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9A3434',
  },
  diagnosisText: {
    fontSize: 15,
    color: '#4b4b4b',
    lineHeight: 22,
  },
  diagnosisChoices: {
    gap: BrandSpacing.xs,
  },
  diagnosisChoiceButton: {
    borderWidth: 1,
    borderColor: '#F2B8B8',
    borderRadius: BrandRadius.sm,
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
