import { useState } from 'react';
import { router } from 'expo-router';

import { problemData } from '@/data/problemData';
import { DiagnosticQuizStage } from '@/features/quiz/components/diagnostic-quiz-stage';
import type { DiagnosticQuizStageModel } from '@/features/quiz/hooks/use-diagnostic-screen';

const problems = problemData.filter((p) => p.grade === 'g1').slice(0, 10);
const TOTAL = problems.length;

export default function DevQuizStageScreen() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [exitModalVisible, setExitModalVisible] = useState(false);

  const problem = problems[index]!;

  const quizStage: DiagnosticQuizStageModel = {
    problem,
    currentQuestionNumber: index + 1,
    questionCount: TOTAL,
    stepLabel: `${index + 1} / ${TOTAL}`,
    progressPercent: `${Math.round(((index + 1) / TOTAL) * 100)}%`,
    selectedIndex: selected,
    canGoPrevious: index > 0,
    isNextDisabled: selected === null,
    isExitModalVisible: exitModalVisible,
    onSelectChoice: (i) => setSelected(i),
    onPreviousQuestion: () => { setIndex((n) => Math.max(0, n - 1)); setSelected(null); },
    onNextQuestion: () => { setIndex((n) => Math.min(TOTAL - 1, n + 1)); setSelected(null); },
    onOpenExitModal: () => setExitModalVisible(true),
    onCloseExitModal: () => setExitModalVisible(false),
    onConfirmExit: () => { setExitModalVisible(false); router.back(); },
  };

  return <DiagnosticQuizStage quizStage={quizStage} />;
}
