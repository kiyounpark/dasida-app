import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { MathText } from '@/components/math/MathText';
import { ProblemStatement } from '@/components/math/problem-statement';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { diagnosisMethodRoutingCatalog } from '@/data/diagnosis-method-routing';
import type { WeaknessId } from '@/data/diagnosisMap';
import { diagnosisTree, methodOptions, type SolveMethodId } from '@/data/diagnosisTree';
import { problemData } from '@/data/problemData';
import { analyzeDiagnosisMethod, type DiagnosisRouterResult } from '@/features/quiz/diagnosis-router';
import { useQuizSession } from '@/features/quiz/session';

export default function QuizIndexScreen() {
  const { state, startSession, submitAnswer, confirmDiagnosisMethod, submitDiagnosisWeakness } = useQuizSession();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // 진행 중인 오답 진단의 1단계(풀이법) 선택 상태
  const [tempMethodId, setTempMethodId] = useState<SolveMethodId | null>(null);
  
  // 진단 1단계 자유입력 UI 상태
  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [routerResult, setRouterResult] = useState<DiagnosisRouterResult | null>(null);

  const currentProblem = useMemo(
    () => problemData[state.currentQuestionIndex],
    [state.currentQuestionIndex],
  );

  const availableMethods = useMemo(() => {
    if (!state.isDiagnosing) return [];
    const wrongAnswerIndex = state.diagnosisQueue[state.currentDiagnosisIndex];
    if (wrongAnswerIndex === undefined) return methodOptions;
    const wrongAnswer = state.answers[wrongAnswerIndex];
    const problem = problemData.find((p) => p.id === wrongAnswer.problemId);
    if (!problem?.diagnosisMethods) return methodOptions;
    return methodOptions.filter((opt) => problem.diagnosisMethods.includes(opt.id));
  }, [state.isDiagnosing, state.currentDiagnosisIndex, state.answers, state.diagnosisQueue]);

  useEffect(() => {
    setSelectedIndex(null);
  }, [state.currentQuestionIndex]);

  useEffect(() => {
    if (state.result) {
      router.replace('/quiz/result');
    }
  }, [state.result]);

  useEffect(() => {
    // 진단 문제가 넘어갈 때 풀이법 선택 및 입력 상태 초기화
    setTempMethodId(null);
    setDiagnosisInput('');
    setRouterResult(null);
  }, [state.currentDiagnosisIndex]);

  const handleSubmit = () => {
    if (!currentProblem || selectedIndex === null) return;
    const isCorrect = selectedIndex === currentProblem.answerIndex;
    submitAnswer(currentProblem.id, selectedIndex, isCorrect);
  };

  const handleInputChange = (text: string) => {
    setDiagnosisInput(text);
    setRouterResult(null); // 입력 수정 시 이전 예측 결과 무효화
  };

  const handleAnalyze = async () => {
    if (!diagnosisInput.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeDiagnosisMethod({
        rawText: diagnosisInput,
        allowedMethodIds: availableMethods.map(m => m.id),
      });
      setRouterResult(result);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 라우터가 예측한 고신뢰 결과(또는 사용자가 확정한 결과) 반영
  const handleConfirmPredicted = () => {
    if (!routerResult) return;
    if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
    
    // CONFIRM 액션으로 trace와 함께 스토어에 전달
    const trace = {
      ...routerResult,
      rawText: diagnosisInput,
      finalMethodId: routerResult.predictedMethodId,
      finalMethodSource: 'router' as const,
      source: 'mock-router' as const, // 추가
    };
    confirmDiagnosisMethod(state.diagnosisQueue[state.currentDiagnosisIndex], trace);
    setTempMethodId(routerResult.predictedMethodId);
  };

  // 저신뢰/수동 선택 목록에서 사용자가 직접 고를 때
  const handleManualSelect = (methodId: SolveMethodId) => {
    if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
    const trace = routerResult ? {
      ...routerResult,
      rawText: diagnosisInput,
      finalMethodId: methodId,
      finalMethodSource: 'manual' as const,
      source: 'mock-router' as const,
    } : {
      rawText: diagnosisInput,
      predictedMethodId: 'unknown' as SolveMethodId,
      confidence: 0,
      source: 'mock-router' as const,
      needsManualSelection: true,
      candidateMethodIds: availableMethods.map(m => m.id),
      finalMethodId: methodId,
      finalMethodSource: 'manual' as const,
    };
    confirmDiagnosisMethod(state.diagnosisQueue[state.currentDiagnosisIndex], trace);
    setTempMethodId(methodId);
  };

  const handleWeaknessSelect = (weaknessId: WeaknessId) => {
    if (!tempMethodId) return;
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }
    const answerIndex = state.diagnosisQueue[state.currentDiagnosisIndex];
    submitDiagnosisWeakness(answerIndex, weaknessId);
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
                
                {availableMethods.length > 0 && (
                  <Text style={styles.diagnosisHint}>
                    예) {availableMethods.slice(0, 2).map((m) => {
                      const ex = diagnosisMethodRoutingCatalog[m.id]?.exampleUtterances?.[0];
                      return ex ? `"${ex}"` : '';
                    }).filter(Boolean).join(', ')}
                  </Text>
                )}
                
                <TextInput
                  style={styles.diagnosisInput}
                  value={diagnosisInput}
                  onChangeText={handleInputChange}
                  placeholder="풀이 방법을 자유롭게 적어주세요"
                  placeholderTextColor="#999"
                  multiline
                />
                
                <Pressable
                  style={[styles.analyzeButton, !diagnosisInput.trim() && styles.analyzeButtonDisabled]}
                  onPress={handleAnalyze}
                  disabled={!diagnosisInput.trim() || isAnalyzing}>
                  {isAnalyzing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.analyzeButtonText}>방향 판단하기</Text>
                  )}
                </Pressable>
                
                {routerResult && !routerResult.needsManualSelection && (
                  <View style={styles.predictionCard}>
                    <Text style={styles.predictionLabel}>
                      {diagnosisMethodRoutingCatalog[routerResult.predictedMethodId]?.labelKo}
                    </Text>
                    <Text style={styles.predictionDesc}>
                      {diagnosisMethodRoutingCatalog[routerResult.predictedMethodId]?.summary}
                    </Text>
                    <Pressable style={styles.confirmButton} onPress={handleConfirmPredicted}>
                      <Text style={styles.confirmButtonText}>이 방식으로 계속</Text>
                    </Pressable>
                    <Pressable style={styles.manualTrigger} onPress={() => setRouterResult({ ...routerResult, needsManualSelection: true })}>
                      <Text style={styles.manualTriggerText}>직접 고를게요</Text>
                    </Pressable>
                  </View>
                )}
                
                {routerResult && routerResult.needsManualSelection && (
                  <>
                    <Text style={styles.lowConfidenceText}>확신이 낮아요. 직접 골라주세요.</Text>
                    <View style={styles.diagnosisChoices}>
                      {availableMethods.map((option) => (
                        <Pressable
                          key={option.id}
                          style={styles.diagnosisChoiceButton}
                          onPress={() => handleManualSelect(option.id)}>
                          <Text style={styles.diagnosisChoiceText}>{option.labelKo}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}
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
  diagnosisHint: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: BrandSpacing.xs,
  },
  diagnosisInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: BrandRadius.sm,
    padding: 12,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    marginBottom: BrandSpacing.sm,
  },
  analyzeButton: {
    backgroundColor: '#e67e22',
    borderRadius: BrandRadius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: BrandSpacing.md,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  predictionCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: BrandRadius.sm,
    padding: BrandSpacing.md,
    gap: BrandSpacing.xs,
    borderWidth: 1,
    borderColor: '#F5D76E',
    marginTop: BrandSpacing.sm,
  },
  predictionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9A7D0A',
  },
  predictionDesc: {
    fontSize: 14,
    color: '#666',
  },
  confirmButton: {
    backgroundColor: '#27ae60',
    borderRadius: BrandRadius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: BrandSpacing.xs,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  manualTrigger: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  manualTriggerText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
  lowConfidenceText: {
    fontSize: 14,
    color: '#c0392b',
    fontWeight: '600',
    marginBottom: BrandSpacing.xs,
  },
});
