// features/quiz/exam/screens/exam-diagnosis-screen.tsx
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandColors } from '@/constants/brand';
import { useIsTablet } from '@/hooks/use-is-tablet';
import { DiagnosisChatBubble } from '@/features/quiz/components/diagnosis-chat-bubble';
import { DiagnosisFlowCard } from '@/features/quiz/components/diagnosis-flow-card';
import { DiagnosisMethodSelectorCard } from '@/features/quiz/components/diagnosis-method-selector-card';

import { ExamProblemCard } from '../components/exam-problem-card';
import {
  useExamDiagnosis,
  type ExamDiagEntry,
  type UseExamDiagnosisResult,
} from '../hooks/use-exam-diagnosis';

type ExamDiagnosisPageProps = {
  examId: string;
  problemNumber: number;
  userAnswer: number;
  width: number;          // FlatList page width
  isActive: boolean;      // FlatList 현재 페이지 여부
  onComplete: () => void;   // 진단 완료 시 호출
};

export function ExamDiagnosisPage({
  examId,
  problemNumber,
  userAnswer,
  width,
  isActive,
  onComplete,
}: ExamDiagnosisPageProps) {
  const hook = useExamDiagnosis({ examId, problemNumber, userAnswer, onComplete });
  const scrollRef = useRef<ScrollView>(null);
  const isTablet = useIsTablet();

  useEffect(() => {
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 200);
    return () => clearTimeout(id);
  }, [hook.entries.length]);

  useEffect(() => {
    if (!isActive) {
      Keyboard.dismiss();
    }
  }, [isActive]);

  // 태블릿: 좌우 분할 레이아웃 (문제 이미지 | 진단 인터랙션)
  if (isTablet) {
    const problemEntry = hook.entries.find((e) => e.kind === 'problem-card');
    const interactionEntries = hook.entries.filter((e) => e.kind !== 'problem-card');

    return (
      <View style={styles.tabletPage}>
        {/* 왼쪽: 문제 이미지 패널 */}
        <ScrollView
          style={styles.tabletLeft}
          contentContainerStyle={styles.tabletLeftContent}
          showsVerticalScrollIndicator={false}>
          {problemEntry && (
            <EntryRenderer
              entry={problemEntry}
              hook={hook}
            />
          )}
        </ScrollView>

        {/* 오른쪽: 진단 인터랙션 패널 */}
        <KeyboardAvoidingView
          style={styles.tabletRight}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            style={styles.tabletRightScroll}
            contentContainerStyle={styles.tabletRightContent}
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}>
            {interactionEntries.map((entry) => (
              <Animated.View
                key={entry.id}
                entering={FadeInDown.duration(220).withInitialValues({
                  opacity: 0,
                  transform: [{ translateY: 8 }],
                })}>
                <EntryRenderer
                  entry={entry}
                  hook={hook}
                />
              </Animated.View>
            ))}
            {hook.isSaving && (
              <View style={styles.savingRow}>
                <ActivityIndicator size="small" color={BrandColors.primarySoft} />
                <Text style={styles.savingText}>저장 중...</Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={[styles.page, { width }]}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        style={styles.canvas}
        contentContainerStyle={styles.canvasContent}
        keyboardDismissMode="on-drag">
        {hook.entries.map((entry) => (
          <Animated.View
            key={entry.id}
            entering={FadeInDown.duration(220).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })}>
            <EntryRenderer
              entry={entry}
              hook={hook}
            />
          </Animated.View>
        ))}
        {hook.isSaving && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={BrandColors.primarySoft} />
            <Text style={styles.savingText}>저장 중...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

type EntryRendererProps = {
  entry: ExamDiagEntry;
  hook: UseExamDiagnosisResult;
};

function EntryRenderer({
  entry,
  hook,
}: EntryRendererProps) {
  if (entry.kind === 'problem-card') {
    return (
      <ExamProblemCard
        imageKey={entry.imageKey}
        userAnswer={entry.userAnswer}
        correctAnswer={entry.correctAnswer}
        problemType={entry.problemType}
      />
    );
  }

  if (entry.kind === 'bubble') {
    return (
      <DiagnosisChatBubble
        role={entry.role}
        text={entry.text}
        showAvatar={entry.role === 'assistant'}
      />
    );
  }

  if (entry.kind === 'method-selector') {
    return (
      <DiagnosisMethodSelectorCard
        methods={hook.methods}
        diagnosisInput={hook.diagnosisInput}
        routerResult={hook.routerResult}
        suggestedMethods={hook.suggestedMethods}
        analysisErrorMessage={hook.analysisErrorMessage}
        isAnalyzing={hook.isAnalyzing}
        disabled={!entry.interactive}
        onInputChange={hook.onInputChange}
        onAnalyze={hook.onAnalyze}
        onManualSelect={hook.onManualSelect}
        onConfirmPredicted={hook.onConfirmPredicted}
      />
    );
  }

  if (entry.kind === 'flow-node') {
    const node = entry.flow.nodes[entry.draft.currentNodeId];
    if (!node) return null;
    return (
      <DiagnosisFlowCard
        node={node}
        methodLabel={entry.flow.methodId as string}
        disabled={!entry.interactive}
        onChoicePress={hook.onChoicePress}
        onExplainContinue={hook.onExplainContinue}
        onExplainDontKnow={hook.onExplainDontKnow}
        onCheckPress={hook.onCheckPress}
        onCheckDontKnow={hook.onCheckDontKnow}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  canvasContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  savingText: {
    fontSize: 13,
    color: BrandColors.primarySoft,
  },
  tabletPage: {
    flex: 1,
    flexDirection: 'row',
  },
  tabletLeft: {
    flex: 0.6,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(41,59,39,0.15)',
  },
  tabletLeftContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  tabletRight: {
    flex: 0.4,
  },
  tabletRightScroll: {
    flex: 1,
  },
  tabletRightContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
});
