// features/quiz/exam/screens/exam-diagnosis-screen.tsx
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandColors } from '@/constants/brand';
import { DiagnosisChatBubble } from '@/features/quiz/components/diagnosis-chat-bubble';
import { DiagnosisFlowCard } from '@/features/quiz/components/diagnosis-flow-card';
import { DiagnosisMethodSelectorCard } from '@/features/quiz/components/diagnosis-method-selector-card';

import { ExamProblemCard } from '../components/exam-problem-card';
import { NextProblemCard } from '../components/next-problem-card';
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
  nextProblemNumber: number | null;
  onComplete: () => void;   // 진단 완료 시 호출
  onNext: () => void;       // 다음 문제로 이동
  onBackToResult: () => void;
};

export function ExamDiagnosisPage({
  examId,
  problemNumber,
  userAnswer,
  width,
  isActive,
  nextProblemNumber,
  onComplete,
  onNext,
  onBackToResult,
}: ExamDiagnosisPageProps) {
  const hook = useExamDiagnosis({ examId, problemNumber, userAnswer, onComplete });
  const scrollRef = useRef<ScrollView>(null);

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
            entering={
              entry.kind === 'next-problem'
                ? undefined
                : FadeInDown.duration(220).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
            }>
            <EntryRenderer
              entry={entry}
              hook={hook}
              nextProblemNumber={nextProblemNumber}
              onNext={onNext}
              onBackToResult={onBackToResult}
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
  nextProblemNumber: number | null;
  onNext: () => void;
  onBackToResult: () => void;
};

function EntryRenderer({
  entry,
  hook,
  nextProblemNumber,
  onNext,
  onBackToResult,
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
        onFinalConfirm={hook.onFinalConfirm}
      />
    );
  }

  if (entry.kind === 'next-problem') {
    return (
      <NextProblemCard
        nextProblemNumber={nextProblemNumber}
        onNext={onNext}
        onBackToResult={onBackToResult}
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
});
