import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandColors, BrandRadius } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import { FontFamilies } from '@/constants/typography';
import { DiagnosisChatBubble } from '@/features/quiz/components/diagnosis-chat-bubble';
import { DiagnosisFlowCard } from '@/features/quiz/components/diagnosis-flow-card';
import { getSingleParam } from '@/utils/get-single-param';
import type { SolveMethodId } from '@/data/diagnosisTree';

import {
  useExamDiagnosis,
  type ExamDiagEntry,
  type MethodChoice,
} from '../hooks/use-exam-diagnosis';

export function ExamDiagnosisScreen() {
  const params = useLocalSearchParams();
  const examId = getSingleParam(params.examId) ?? '';
  const problemNumber = Number(getSingleParam(params.problemNumber) ?? '0');
  const wrongCount = Number(getSingleParam(params.wrongCount) ?? '0');
  const diagnosedCount = Number(getSingleParam(params.diagnosedCount) ?? '0');

  const hook = useExamDiagnosis({ examId, problemNumber, wrongCount, diagnosedCount });

  return (
    <ExamDiagnosisScreenView
      {...hook}
    />
  );
}

type ViewProps = ReturnType<typeof useExamDiagnosis>;

function ExamDiagnosisScreenView({
  problemNumber,
  topic,
  progressLabel,
  progressPercent,
  entries,
  methodChoices,
  isDone,
  isSaving,
  onSelectMethod,
  onChoicePress,
  onExplainContinue,
  onExplainDontKnow,
  onCheckPress,
  onCheckDontKnow,
  onFinalConfirm,
  onBack,
}: ViewProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 200);
    return () => clearTimeout(id);
  }, [entries.length]);

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      {/* ── 헤더 ── */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerInner}>
          <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button">
            <Text style={styles.backText}>← 채점 결과</Text>
          </Pressable>
          <Text selectable style={styles.headerTitle}>{problemNumber}번 · {topic}</Text>
          <Text selectable style={styles.headerSub}>오답 분석 {progressLabel}</Text>
        </View>
        <View style={styles.progTrack}>
          <View style={[styles.progFill, { width: `${progressPercent}%` }]} />
        </View>
      </SafeAreaView>

      {/* ── 대화 ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.canvas}
        contentContainerStyle={styles.canvasContent}
        keyboardDismissMode="on-drag">
        {entries.map((entry) => (
          <Animated.View
            key={entry.id}
            entering={FadeInDown.duration(220).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })}>
            <EntryRenderer
              entry={entry}
              methodChoices={methodChoices}
              onSelectMethod={onSelectMethod}
              onChoicePress={onChoicePress}
              onExplainContinue={onExplainContinue}
              onExplainDontKnow={onExplainDontKnow}
              onCheckPress={onCheckPress}
              onCheckDontKnow={onCheckDontKnow}
              onFinalConfirm={onFinalConfirm}
            />
          </Animated.View>
        ))}
        {isSaving && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={BrandColors.primarySoft} />
            <Text style={styles.savingText}>저장 중...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function EntryRenderer({
  entry,
  methodChoices,
  onSelectMethod,
  onChoicePress,
  onExplainContinue,
  onExplainDontKnow,
  onCheckPress,
  onCheckDontKnow,
  onFinalConfirm,
}: {
  entry: ExamDiagEntry;
  methodChoices: MethodChoice[];
  onSelectMethod: (id: SolveMethodId) => void;
  onChoicePress: (optionId: string) => void;
  onExplainContinue: () => void;
  onExplainDontKnow: () => void;
  onCheckPress: (optionId: string) => void;
  onCheckDontKnow: () => void;
  onFinalConfirm: () => void;
}) {
  if (entry.kind === 'bubble') {
    return (
      <DiagnosisChatBubble
        role={entry.role}
        text={entry.text}
        showAvatar={entry.role === 'assistant'}
      />
    );
  }

  if (entry.kind === 'method-choices') {
    return (
      <View style={styles.methodChoices}>
        {methodChoices.map((choice) => (
          <Pressable
            key={choice.id}
            onPress={() => onSelectMethod(choice.id)}
            disabled={!entry.interactive}
            style={[
              styles.methodChoice,
              !entry.interactive && styles.methodChoiceDisabled,
            ]}
            accessibilityRole="button">
            <Text
              selectable
              style={[
                styles.methodChoiceText,
                !entry.interactive && styles.methodChoiceTextDisabled,
              ]}>
              {choice.label}
            </Text>
          </Pressable>
        ))}
      </View>
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
        onChoicePress={onChoicePress}
        onExplainContinue={onExplainContinue}
        onExplainDontKnow={onExplainDontKnow}
        onCheckPress={onCheckPress}
        onCheckDontKnow={onCheckDontKnow}
        onFinalConfirm={onFinalConfirm}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DiagnosisTheme.canvas,
  },
  header: {
    backgroundColor: BrandColors.primaryDark,
  },
  headerInner: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 4,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backText: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    color: '#6BAA72',
  },
  headerTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  headerSub: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  progTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    backgroundColor: '#7FC87A',
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
  methodChoices: {
    gap: 8,
    paddingLeft: 36,
  },
  methodChoice: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: DiagnosisTheme.choiceBorder,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  methodChoiceDisabled: {
    opacity: 0.5,
  },
  methodChoiceText: {
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    color: DiagnosisTheme.ink,
  },
  methodChoiceTextDisabled: {
    color: '#8E8A81',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  savingText: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.primarySoft,
  },
});
