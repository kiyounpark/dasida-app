import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { MathText } from '@/components/math/MathText';
import { ProblemStatement } from '@/components/math/problem-statement';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import type { WeaknessId } from '@/data/diagnosisMap';
import { diagnosisTree, methodOptions, type SolveMethodId } from '@/data/diagnosisTree';
import { problemData } from '@/data/problemData';
import { useQuizSession } from '@/features/quiz/session';

export default function QuizIndexScreen() {
  const { state, startSession, submitAnswer, submitDiagnosis } = useQuizSession();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // 진행 중인 오답 진단의 1단계(풀이법) 선택 상태
  const [tempMethodId, setTempMethodId] = useState<SolveMethodId | null>(null);

  const currentProblem = useMemo(
    () => problemData[state.currentQuestionIndex],
    [state.currentQuestionIndex],
  );

  useEffect(() => {
    setSelectedIndex(null);
  }, [state.currentQuestionIndex]);

  useEffect(() => {
    if (state.result) {
      router.replace('/quiz/result');
    }
  }, [state.result]);

  useEffect(() => {
    // 진단 문제가 넘어갈 때 풀이법 선택 초기화
    setTempMethodId(null);
  }, [state.currentDiagnosisIndex]);

  const handleSubmit = () => {
    if (!currentProblem || selectedIndex === null) return;
    const isCorrect = selectedIndex === currentProblem.answerIndex;
    submitAnswer(currentProblem.id, selectedIndex, isCorrect);
  };

  const handleMethodSelect = (methodId: SolveMethodId) => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }
    setTempMethodId(methodId);
  };

  const handleWeaknessSelect = (weaknessId: WeaknessId) => {
    if (!tempMethodId) return;
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }
    const answerIndex = state.diagnosisQueue[state.currentDiagnosisIndex];
    submitDiagnosis(answerIndex, tempMethodId, weaknessId);
  };

  if (!currentProblem && !state.result && !state.isDiagnosing) {
    return (
      <View style={styles.screen}>
        <BrandHeader compact />
        <View style={styles.loadingBody}>
          <Text style={styles.loadingText}>결과를 계산 중입니다...</Text>
        </View>
      </View>
    );
  }

  // --- 진단 단계(DIAGNOSING) 렌더링 ---
  if (state.isDiagnosing) {
    const wrongAnswerIndex = state.diagnosisQueue[state.currentDiagnosisIndex];
    const wrongAnswer = state.answers[wrongAnswerIndex];
    const problem = problemData.find((p) => p.id === wrongAnswer.problemId);

    if (!problem) return null;

    const stepTitle = `${state.currentDiagnosisIndex + 1} / ${state.diagnosisQueue.length}`;
    const progressRatio = (state.currentDiagnosisIndex + 1) / state.diagnosisQueue.length;
    const progressPercent = `${Math.max(progressRatio * 100, 8)}%` as `${number}%`;
    const methodStep = tempMethodId ? diagnosisTree[tempMethodId] : null;

    return (
      <View style={styles.screen}>
        <BrandHeader />
        <ScrollView
          style={styles.scroll}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.container}>
          <View style={styles.surfaceCard}>
            <View style={styles.progressHeader}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progressPercent, backgroundColor: '#f39c12' }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text style={styles.progressLabel}>오답 진단 진행률</Text>
                <Text style={[styles.progress, { color: '#e67e22' }]}>{stepTitle}</Text>
              </View>
            </View>
            <View style={styles.topicRow}>
              <Text style={styles.topicChip}>{problem.topic}</Text>
            </View>
            <ProblemStatement question={problem.question} />
          </View>

          <View style={styles.diagnosisCard}>
            <Text style={styles.diagnosisTitle}>오답 원인 분석</Text>
            {!methodStep ? (
              <>
                <Text selectable style={styles.diagnosisText}>어떤 방법으로 풀었나요?</Text>
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
                <Text selectable style={styles.diagnosisText}>{methodStep.prompt}</Text>
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
        </ScrollView>
      </View>
    );
  }

  // --- 정상 문제 풀이(QUIZ) 단계 렌더링 ---
  if (!currentProblem) return null;

  const stepTitle = `${state.currentQuestionIndex + 1} / ${problemData.length}`;
  const progressRatio = (state.currentQuestionIndex + 1) / problemData.length;
  const progressPercent = `${Math.max(progressRatio * 100, 8)}%` as `${number}%`;

  return (
    <View style={styles.screen}>
      <BrandHeader />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>
        {!state.hasStarted ? (
          <View style={styles.introCard}>
            <Text style={styles.introEyebrow}>진단 시작 전</Text>
            <Text style={styles.introTitle}>10문제 약점 진단</Text>
            <Text selectable style={styles.introBody}>
              짧은 10문항으로 자주 흔들리는 단원을 찾고, 결과에서 바로 약점 연습으로
              이어집니다.
            </Text>
            <View style={styles.introMetaRow}>
              <View style={styles.introMetaChip}>
                <Text style={styles.introMetaText}>10문항</Text>
              </View>
              <View style={styles.introMetaChip}>
                <Text style={styles.introMetaText}>약 3분</Text>
              </View>
            </View>
            <BrandButton title="진단 시작하기" onPress={startSession} />
          </View>
        ) : (
          <View style={styles.surfaceCard}>
            <View style={styles.progressHeader}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progressPercent }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text style={styles.progressLabel}>진행률</Text>
                <Text style={styles.progress}>{stepTitle}</Text>
              </View>
            </View>
            <View style={styles.topicRow}>
              <Text style={styles.topicChip}>{currentProblem.topic}</Text>
            </View>
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
                disabled={selectedIndex === null}
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
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
    boxShadow: '0 12px 32px rgba(41, 59, 39, 0.08)',
  },
  introCard: {
    backgroundColor: BrandColors.card,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.md,
    boxShadow: '0 12px 32px rgba(41, 59, 39, 0.08)',
  },
  introEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primarySoft,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: BrandColors.text,
  },
  introBody: {
    fontSize: 16,
    lineHeight: 24,
    color: BrandColors.mutedText,
  },
  introMetaRow: {
    flexDirection: 'row',
    gap: BrandSpacing.xs,
  },
  introMetaChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: '#F7FAF6',
  },
  introMetaText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.text,
    fontVariant: ['tabular-nums'],
  },
  progressHeader: {
    gap: BrandSpacing.xs,
    marginBottom: BrandSpacing.xs,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E3ECE2',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: BrandColors.primary,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.mutedText,
  },
  progress: {
    fontSize: 14,
    color: BrandColors.primarySoft,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  topicRow: {
    marginTop: 2,
    marginBottom: BrandSpacing.xs,
  },
  topicChip: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EEF5EC',
    color: BrandColors.primarySoft,
    fontSize: 12,
    fontWeight: '700',
  },
  choicesContainer: {
    marginTop: BrandSpacing.sm,
    gap: BrandSpacing.sm,
  },
  choiceButton: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
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
    borderCurve: 'continuous',
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
    borderCurve: 'continuous',
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
