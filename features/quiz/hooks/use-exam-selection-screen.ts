import { useState } from 'react';
import { Alert, useWindowDimensions } from 'react-native';

import { router } from 'expo-router';

import { useCurrentLearner } from '@/features/learner/provider';
import {
  ACADEMIC_ASSESSMENT_CATALOG,
  MOCK_EXAM_CATALOG,
  type ExamCategory,
  type ExamCatalogItem,
} from '@/features/quiz/data/exam-catalog';

export type UseExamSelectionScreenResult = {
  isCompactLayout: boolean;
  showCategoryToggle: boolean;
  selectedCategory: ExamCategory;
  onSelectCategory: (category: ExamCategory) => void;
  examItems: ExamCatalogItem[];
  onSelectExam: (examId: string) => void;
  onBack: () => void;
};

export function useExamSelectionScreen(): UseExamSelectionScreenResult {
  const { profile } = useCurrentLearner();
  const { width } = useWindowDimensions();
  const isCompactLayout = width < 390;

  const isG3 = profile?.grade === 'g3';
  const showCategoryToggle = isG3;

  const [selectedCategory, setSelectedCategory] = useState<ExamCategory>(
    isG3 ? 'mock_exam' : 'academic_assessment',
  );

  const examItems =
    selectedCategory === 'mock_exam'
      ? MOCK_EXAM_CATALOG
      : ACADEMIC_ASSESSMENT_CATALOG;

  const onSelectExam = (examId: string) => {
    const item = examItems.find((e) => e.id === examId);
    Alert.alert('시험 선택', `${item?.title ?? examId}\n(준비 중인 기능입니다)`);
  };

  const onBack = () => {
    router.back();
  };

  return {
    isCompactLayout,
    showCategoryToggle,
    selectedCategory,
    onSelectCategory: setSelectedCategory,
    examItems,
    onSelectExam,
    onBack,
  };
}
