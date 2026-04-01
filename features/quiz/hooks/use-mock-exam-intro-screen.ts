import { router } from 'expo-router';

export type UseMockExamIntroScreenResult = {
  onStartExam: () => void;
};

export function useMockExamIntroScreen(): UseMockExamIntroScreenResult {
  const onStartExam = () => {
    router.push('/quiz/exams');
  };

  return { onStartExam };
}
