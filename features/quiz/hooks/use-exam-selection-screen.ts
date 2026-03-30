import { useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { router } from 'expo-router';

import { useCurrentLearner } from '@/features/learner/provider';
import {
  EXAM_CATALOG,
  type ExamCatalogItem,
  type ExamSubject,
  type ExamType,
} from '@/features/quiz/data/exam-catalog';

// 화면에서 사용하는 필터 타입 (기존 ExamCategory 대체)
export type ExamTypeFilter = ExamType;

export type UseExamSelectionScreenResult = {
  isCompactLayout: boolean;
  showTypeToggle: boolean;
  selectedType: ExamTypeFilter;
  selectedSubject: ExamSubject | null;
  onSelectType: (type: ExamTypeFilter) => void;
  onSelectSubject: (subject: ExamSubject) => void;
  examItems: ExamCatalogItem[];
  onSelectExam: (examId: string) => void;
  onBack: () => void;
};

export function useExamSelectionScreen(): UseExamSelectionScreenResult {
  const { profile } = useCurrentLearner();
  const { width } = useWindowDimensions();
  const isCompactLayout = width < 390;

  const grade = (profile?.grade as 'g1' | 'g2' | 'g3' | undefined) ?? 'g3';
  const isG3 = grade === 'g3';

  const [selectedType, setSelectedType] = useState<ExamTypeFilter>(
    isG3 ? 'mock' : 'academic',
  );
  const [selectedSubject, setSelectedSubject] = useState<ExamSubject | null>(
    isG3 ? 'stats' : null,
  );

  const examItems = EXAM_CATALOG.filter((e) => {
    if (e.grade !== grade) return false;
    if (e.type !== selectedType) return false;
    if (isG3 && selectedSubject && e.subject !== selectedSubject) return false;
    return true;
  });

  const onSelectExam = (examId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push({ pathname: '/quiz/exam/solve' as any, params: { examId } });
  };

  return {
    isCompactLayout,
    showTypeToggle: isG3,
    selectedType,
    selectedSubject,
    onSelectType: setSelectedType,
    onSelectSubject: setSelectedSubject,
    examItems,
    onSelectExam,
    onBack: () => router.back(),
  };
}
