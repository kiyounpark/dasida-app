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
  const [analysisErrorMessage, setAnalysisErrorMessage] = useState('');

  const currentProblem = useMemo(
    () => problemData[state.currentQuestionIndex],
    [state.currentQuestionIndex],
  );

  const currentDiagnosisProblem = useMemo(() => {
    if (!state.isDiagnosing) return undefined;
    const wrongAnswerIndex = state.diagnosisQueue[state.currentDiagnosisIndex];
    if (wrongAnswerIndex === undefined) return undefined;
    const wrongAnswer = state.answers[wrongAnswerIndex];
    return problemData.find((problem) => problem.id === wrongAnswer.problemId);
  }, [state.answers, state.currentDiagnosisIndex, state.diagnosisQueue, state.isDiagnosing]);

  const availableMethods = useMemo(() => {
    if (!state.isDiagnosing) return [];
    if (!currentDiagnosisProblem?.diagnosisMethods) return methodOptions;
    return methodOptions.filter((option) => currentDiagnosisProblem.diagnosisMethods.includes(option.id));
  }, [currentDiagnosisProblem, state.isDiagnosing]);

  const suggestedMethods = useMemo(() => {
    if (!routerResult?.needsManualSelection) {
      return [];
    }

    const suggestedIds = routerResult.candidateMethodIds.filter((methodId) => methodId !== 'unknown').slice(0, 2);
    return suggestedIds
      .map((methodId) => availableMethods.find((method) => method.id === methodId))
      .filter((method): method is (typeof availableMethods)[number] => Boolean(method));
  }, [availableMethods, routerResult]);

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
    setAnalysisErrorMessage('');
  }, [state.currentDiagnosisIndex]);

  const handleSubmit = () => {
    if (!currentProblem || selectedIndex === null) return;
    const isCorrect = selectedIndex === currentProblem.answerIndex;
    submitAnswer(currentProblem.id, selectedIndex, isCorrect);
  };

  const handleInputChange = (text: string) => {
    setDiagnosisInput(text);
    setRouterResult(null); // 입력 수정 시 이전 예측 결과 무효화
    setAnalysisErrorMessage('');
  };

  const handleAnalyze = async () => {
    if (!diagnosisInput.trim() || isAnalyzing || !currentDiagnosisProblem) return;
    setIsAnalyzing(true);
    setAnalysisErrorMessage('');
    try {
      const result = await analyzeDiagnosisMethod({
        problemId: currentDiagnosisProblem.id,
        rawText: diagnosisInput,
        allowedMethodIds: availableMethods.map((method) => method.id),
        allowedMethods: availableMethods.map((method) => {
          const info = diagnosisMethodRoutingCatalog[method.id];

          return {
            id: method.id,
            labelKo: method.labelKo,
            summary: info?.summary ?? method.labelKo,
            exampleUtterances: info?.exampleUtterances ?? [],
          };
        }),
      });
      setRouterResult(result);
    } catch {
      setRouterResult(null);
      setAnalysisErrorMessage('지금은 추천을 불러오지 못했어요. 위 선택지에서 고르거나 잠시 후 다시 시도해주세요.');
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
      source: routerResult.source,
    };
    confirmDiagnosisMethod(state.diagnosisQueue[state.currentDiagnosisIndex], trace);
    setAnalysisErrorMessage('');
    setTempMethodId(routerResult.predictedMethodId);
  };

  // 사용자가 풀이 방법 선택지에서 바로 고를 때
  const handleManualSelect = (methodId: SolveMethodId) => {
    if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
    const trace = routerResult ? {
      ...routerResult,
      rawText: diagnosisInput,
      finalMethodId: methodId,
      finalMethodSource: 'manual' as const,
      source: routerResult.source,
    } : {
      rawText: diagnosisInput,
      predictedMethodId: 'unknown' as SolveMethodId,
      confidence: 0,
      source: 'manual-selection' as const,
      needsManualSelection: true,
      candidateMethodIds: availableMethods.map((method) => method.id),
      finalMethodId: methodId,
      finalMethodSource: 'manual' as const,
    };
    confirmDiagnosisMethod(state.diagnosisQueue[state.currentDiagnosisIndex], trace);
    setAnalysisErrorMessage('');
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
    const problem = currentDiagnosisProblem;

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
                <View
                  style={[styles.progressFill, { width: progressPercent, backgroundColor: BrandColors.warning }]}
                />
              </View>
              <View style={styles.progressMeta}>
                <Text selectable style={styles.progressLabel}>오답 진단 진행률</Text>
                <Text selectable style={[styles.progress, { color: BrandColors.warning }]}>{stepTitle}</Text>
              </View>
            </View>
            <View style={styles.topicRow}>
              <Text style={styles.topicChip}>{problem.topic}</Text>
            </View>
            <ProblemStatement question={problem.question} />
          </View>

          <View style={styles.diagnosisCard}>
            <Text selectable style={styles.diagnosisTitle}>오답 원인 분석</Text>
            {!methodStep ? (
              <>
                <Text selectable style={styles.diagnosisText}>어떤 방법으로 풀었나요?</Text>
                <Text style={styles.diagnosisHelper}>
                  가장 가까운 방법을 고르거나, 아래 입력란에 직접 적어주세요.
                </Text>

                {availableMethods.length > 0 && (
                  <View style={styles.diagnosisChoices}>
                    {availableMethods.map((option) => {
                      const info = diagnosisMethodRoutingCatalog[option.id];

                      return (
                        <Pressable
                          key={option.id}
                          style={styles.diagnosisChoiceButton}
                          onPress={() => handleManualSelect(option.id)}>
                          <Text style={styles.diagnosisChoiceText}>{option.labelKo}</Text>
                          {info?.summary ? (
                            <Text style={styles.diagnosisChoiceSummary}>{info.summary}</Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                <View style={styles.diagnosisInputSection}>
                  <Text selectable style={styles.diagnosisInputLabel}>
                    선택지에 없다면, 어떤 식으로 풀었는지 짧게 적어주세요.
                  </Text>

                  {availableMethods.length > 0 && (
                    <Text selectable style={styles.diagnosisHint}>
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
                    placeholder="예: 근의 공식으로 풀다가 판별식 계산에서 막혔어요"
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
                      <Text style={styles.analyzeButtonText}>입력 내용으로 추천받기</Text>
                    )}
                  </Pressable>

                  {analysisErrorMessage ? (
                    <Text selectable style={styles.analysisErrorText}>
                      {analysisErrorMessage}
                    </Text>
                  ) : null}
                </View>

                {routerResult && !routerResult.needsManualSelection && (
                  <View style={styles.predictionCard}>
                    <Text selectable style={styles.predictionLabel}>
                      {diagnosisMethodRoutingCatalog[routerResult.predictedMethodId]?.labelKo}
                    </Text>
                    <Text selectable style={styles.predictionDesc}>
                      입력 내용을 기준으로 이 풀이 방법이 가장 가까워 보여요.
                    </Text>
                    <Pressable style={styles.confirmButton} onPress={handleConfirmPredicted}>
                      <Text style={styles.confirmButtonText}>이 추천으로 계속</Text>
                    </Pressable>
                  </View>
                )}

                {routerResult && routerResult.needsManualSelection && (
                  <View style={styles.lowConfidenceSection}>
                    <Text selectable style={styles.lowConfidenceText}>
                      설명만으로는 풀이 방법이 완전히 구분되진 않았어요.
                    </Text>

                    {suggestedMethods.length > 0 && (
                      <View style={styles.suggestedMethodsSection}>
                        <Text selectable style={styles.suggestedMethodsTitle}>
                          지금 설명으로는 아래 방법이 가장 가까워 보여요.
                        </Text>
                        <View style={styles.diagnosisChoices}>
                          {suggestedMethods.map((method) => {
                            const info = diagnosisMethodRoutingCatalog[method.id];

                            return (
                              <Pressable
                                key={method.id}
                                style={styles.suggestedMethodButton}
                                onPress={() => handleManualSelect(method.id)}>
                                <Text selectable style={styles.suggestedMethodLabel}>{method.labelKo}</Text>
                                {info?.summary ? (
                                  <Text selectable style={styles.suggestedMethodSummary}>{info.summary}</Text>
                                ) : null}
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    <Text selectable style={styles.lowConfidenceSubtext}>
                      {suggestedMethods.length > 0
                        ? '위 후보를 고르거나, 더 자세히 적어주시면 다시 추천해드릴게요.'
                        : '조금 더 자세히 적어주시면 다시 추천해드릴게요.'}
                    </Text>
                  </View>
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
                <Text selectable style={styles.progressLabel}>진행률</Text>
                <Text selectable style={styles.progress}>{stepTitle}</Text>
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
  diagnosisHelper: {
    fontSize: 14,
    lineHeight: 21,
    color: '#7A5A5A',
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
    gap: 4,
  },
  diagnosisChoiceText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
    fontWeight: '700',
  },
  diagnosisChoiceSummary: {
    fontSize: 13,
    color: '#7A7A7A',
    lineHeight: 18,
  },
  diagnosisInputSection: {
    gap: BrandSpacing.xs,
    paddingTop: BrandSpacing.xs,
  },
  diagnosisInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7A5A5A',
  },
  diagnosisHint: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  diagnosisInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    padding: 12,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  analyzeButton: {
    backgroundColor: BrandColors.warning,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    paddingVertical: 12,
    alignItems: 'center',
  },
  analyzeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  analysisErrorText: {
    fontSize: 13,
    lineHeight: 19,
    color: BrandColors.danger,
  },
  predictionCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    padding: BrandSpacing.md,
    gap: BrandSpacing.xs,
    borderWidth: 1,
    borderColor: '#F5D76E',
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
    backgroundColor: BrandColors.success,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: BrandSpacing.xs,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  lowConfidenceText: {
    fontSize: 14,
    color: BrandColors.danger,
    fontWeight: '600',
    lineHeight: 20,
  },
  lowConfidenceSection: {
    gap: BrandSpacing.xs,
  },
  suggestedMethodsSection: {
    gap: BrandSpacing.xs,
  },
  suggestedMethodsTitle: {
    fontSize: 14,
    color: '#7A5A5A',
    lineHeight: 20,
  },
  suggestedMethodButton: {
    borderWidth: 1,
    borderColor: '#F0C24C',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: '#FFF9E6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  suggestedMethodLabel: {
    fontSize: 15,
    color: '#9A7D0A',
    lineHeight: 20,
    fontWeight: '700',
  },
  suggestedMethodSummary: {
    fontSize: 13,
    color: '#7A6A2B',
    lineHeight: 18,
  },
  lowConfidenceSubtext: {
    fontSize: 13,
    color: '#7A5A5A',
    lineHeight: 19,
  },
});
