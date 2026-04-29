import { router } from 'expo-router';

export type UseMockExamIntroScreenResult = {
  onStartExam: () => void;
};

export function useMockExamIntroScreen(): UseMockExamIntroScreenResult {
  const onStartExam = () => {
    router.push('/(tabs)/exam');
  };

  return { onStartExam };
}
