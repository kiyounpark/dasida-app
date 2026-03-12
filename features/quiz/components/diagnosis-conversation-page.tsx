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
  width: number;
  isActive: boolean;
  status: 'pending' | 'in_progress' | 'completed';
  chatEntries: DiagnosisConversationEntry[];
  methods: DiagnosisMethodCardOption[];
  diagnosisInput: string;
  routerResult: DiagnosisRouterResult | null;
  suggestedMethods: DiagnosisMethodCardOption[];
  analysisErrorMessage: string;
  isAnalyzing: boolean;
  onInputChange: (text: string) => void;
  onAnalyze: () => void;
  onManualSelect: (methodId: SolveMethodId) => void;
  onConfirmPredicted: () => void;
  onChoicePress: (optionId: string) => void;
  onExplainContinue: () => void;
  onExplainDontKnow: () => void;
  onCheckPress: (optionId: string) => void;
  onCheckDontKnow: () => void;
  onFinalConfirm: () => void;
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
  width,
  isActive,
  status,
  chatEntries,
  methods,
  diagnosisInput,
  routerResult,
  suggestedMethods,
  analysisErrorMessage,
  isAnalyzing,
  onInputChange,
  onAnalyze,
  onManualSelect,
  onConfirmPredicted,
  onChoicePress,
  onExplainContinue,
  onExplainDontKnow,
  onCheckPress,
  onCheckDontKnow,
  onFinalConfirm,
}: DiagnosisConversationPageProps) {
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    });
  }, [chatEntries.length, isActive]);

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
          onContentSizeChange={() => {
            if (isActive) {
              scrollRef.current?.scrollToEnd({ animated: true });
            }
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
                    routerResult={routerResult}
                    suggestedMethods={suggestedMethods}
                    analysisErrorMessage={analysisErrorMessage}
                    isAnalyzing={isAnalyzing}
                    disabled={!entry.interactive || status === 'completed'}
                    onInputChange={onInputChange}
                    onAnalyze={onAnalyze}
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
