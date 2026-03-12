import { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import type { DiagnosisFlowNode } from '@/data/detailedDiagnosisFlows';
import type { SolveMethodId } from '@/data/diagnosisTree';
import { DiagnosisFlowCard } from '@/features/quiz/components/diagnosis-flow-card';
import type { DiagnosisRouterResult } from '@/features/quiz/diagnosis-router';

import { DiagnosisChatBubble } from './diagnosis-chat-bubble';
import {
  DiagnosisMethodSelectorCard,
  type DiagnosisMethodCardOption,
} from './diagnosis-method-selector-card';
import { DiagnosisProblemBubble } from './diagnosis-problem-bubble';

export type DiagnosisConversationEntry =
  | {
      id: string;
      kind: 'problem';
      topic: string;
      question: string;
    }
  | {
      id: string;
      kind: 'bubble';
      role: 'assistant' | 'user';
      text: string;
      tone?: 'neutral' | 'positive' | 'warning' | 'info';
    }
  | {
      id: string;
      kind: 'method-selector';
      interactive: boolean;
    }
  | {
      id: string;
      kind: 'node';
      methodLabel: string;
      node: DiagnosisFlowNode;
      interactive: boolean;
    };

type DiagnosisConversationPageProps = {
  answerIndex: number;
  width: number;
  isActive: boolean;
  status: 'pending' | 'in_progress' | 'completed';
  chatEntries: DiagnosisConversationEntry[];
  methods: DiagnosisMethodCardOption[];
  diagnosisInput: string;
  clarifyingInput: string;
  hasSubmittedClarifyingInput: boolean;
  routerResult: DiagnosisRouterResult | null;
  suggestedMethods: DiagnosisMethodCardOption[];
  analysisErrorMessage: string;
  isAnalyzing: boolean;
  restoreOffset?: number;
  shouldRestoreScroll: boolean;
  shouldAutoScrollToEnd: boolean;
  onInputChange: (text: string) => void;
  onAnalyze: () => void;
  onClarifyingInputChange: (text: string) => void;
  onClarifyingAnalyze: () => void;
  onManualSelect: (methodId: SolveMethodId) => void;
  onConfirmPredicted: () => void;
  onChoicePress: (optionId: string) => void;
  onExplainContinue: () => void;
  onExplainDontKnow: () => void;
  onCheckPress: (optionId: string) => void;
  onCheckDontKnow: () => void;
  onFinalConfirm: () => void;
  onScrollOffsetChange: (answerIndex: number, offsetY: number) => void;
  onAutoScrollHandled: (answerIndex: number) => void;
  onRestoreHandled: (answerIndex: number) => void;
};

function getEntryAnimation(entry: DiagnosisConversationEntry) {
  if (entry.kind === 'bubble' && entry.role === 'user') {
    return FadeIn.duration(180).withInitialValues({
      opacity: 0,
      transform: [{ scale: 0.98 }],
    });
  }

  return FadeInDown.duration(220).withInitialValues({
    opacity: 0,
    transform: [{ translateY: 8 }],
  });
}

export function DiagnosisConversationPage({
  answerIndex,
  width,
  isActive,
  status,
  chatEntries,
  methods,
  diagnosisInput,
  clarifyingInput,
  hasSubmittedClarifyingInput,
  routerResult,
  suggestedMethods,
  analysisErrorMessage,
  isAnalyzing,
  restoreOffset,
  shouldRestoreScroll,
  shouldAutoScrollToEnd,
  onInputChange,
  onAnalyze,
  onClarifyingInputChange,
  onClarifyingAnalyze,
  onManualSelect,
  onConfirmPredicted,
  onChoicePress,
  onExplainContinue,
  onExplainDontKnow,
  onCheckPress,
  onCheckDontKnow,
  onFinalConfirm,
  onScrollOffsetChange,
  onAutoScrollHandled,
  onRestoreHandled,
}: DiagnosisConversationPageProps) {
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!isActive || !shouldRestoreScroll) {
      return;
    }

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: restoreOffset ?? 0,
        animated: false,
      });
      onRestoreHandled(answerIndex);
    });
  }, [answerIndex, isActive, onRestoreHandled, restoreOffset, shouldRestoreScroll]);

  useEffect(() => {
    if (!isActive || !shouldAutoScrollToEnd) {
      return;
    }

    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
      onAutoScrollHandled(answerIndex);
    });
  }, [answerIndex, isActive, onAutoScrollHandled, shouldAutoScrollToEnd]);

  return (
    <View style={[styles.page, { width }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          nestedScrollEnabled
          directionalLockEnabled
          contentContainerStyle={styles.content}
          scrollEventThrottle={16}
          onScroll={(event) => {
            onScrollOffsetChange(answerIndex, event.nativeEvent.contentOffset.y);
          }}>
          {chatEntries.map((entry, entryIndex) => {
            const isAfterProblemPrompt =
              entry.kind === 'bubble' && entry.role === 'assistant' && entryIndex === 1;

            if (entry.kind === 'problem') {
              return (
                <Animated.View
                  key={entry.id}
                  entering={getEntryAnimation(entry)}
                  style={styles.problemEntry}>
                  <DiagnosisProblemBubble
                    topic={entry.topic}
                    question={entry.question}
                  />
                </Animated.View>
              );
            }

            if (entry.kind === 'bubble') {
              return (
                <Animated.View
                  key={entry.id}
                  entering={getEntryAnimation(entry)}
                  style={isAfterProblemPrompt ? styles.promptEntry : null}>
                  <DiagnosisChatBubble
                    role={entry.role}
                    text={entry.text}
                    tone={entry.tone}
                  />
                </Animated.View>
              );
            }

            if (entry.kind === 'method-selector') {
              return (
                <Animated.View
                  key={entry.id}
                  entering={getEntryAnimation(entry)}
                  style={styles.assistantRow}>
                  <DiagnosisMethodSelectorCard
                    methods={methods}
                    diagnosisInput={diagnosisInput}
                    clarifyingInput={clarifyingInput}
                    hasSubmittedClarifyingInput={hasSubmittedClarifyingInput}
                    routerResult={routerResult}
                    suggestedMethods={suggestedMethods}
                    analysisErrorMessage={analysisErrorMessage}
                    isAnalyzing={isAnalyzing}
                    disabled={!entry.interactive || status === 'completed'}
                    onInputChange={onInputChange}
                    onAnalyze={onAnalyze}
                    onClarifyingInputChange={onClarifyingInputChange}
                    onClarifyingAnalyze={onClarifyingAnalyze}
                    onManualSelect={onManualSelect}
                    onConfirmPredicted={onConfirmPredicted}
                  />
                </Animated.View>
              );
            }

            return (
              <Animated.View
                key={entry.id}
                entering={getEntryAnimation(entry)}
                style={styles.assistantRow}>
                <View style={styles.flowWrap}>
                  <DiagnosisFlowCard
                    node={entry.node}
                    methodLabel={entry.methodLabel}
                    disabled={!entry.interactive || status === 'completed'}
                    onChoicePress={onChoicePress}
                    onExplainContinue={onExplainContinue}
                    onExplainDontKnow={onExplainDontKnow}
                    onCheckPress={onCheckPress}
                    onCheckDontKnow={onCheckDontKnow}
                    onFinalConfirm={onFinalConfirm}
                  />
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 14,
  },
  problemEntry: {
    marginBottom: 4,
  },
  promptEntry: {
    marginTop: 4,
    marginBottom: 2,
  },
  assistantRow: {
    width: '100%',
    alignItems: 'flex-start',
  },
  flowWrap: {
    width: '100%',
    maxWidth: '92%',
  },
});
