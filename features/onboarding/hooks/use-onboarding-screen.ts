import { router } from 'expo-router';
import { useState } from 'react';

import type { LearnerGrade } from '@/features/learner/types';
import { useCurrentLearner } from '@/features/learner/provider';

export type UseOnboardingScreenResult = {
  nickname: string;
  grade: Exclude<LearnerGrade, 'unknown'> | null;
  isBusy: boolean;
  isReady: boolean;
  errorMessage: string | null;
  onChangeNickname: (value: string) => void;
  onSelectGrade: (grade: Exclude<LearnerGrade, 'unknown'>) => void;
  onSubmit: () => Promise<void>;
};

export function useOnboardingScreen(): UseOnboardingScreenResult {
  const { updateOnboardingProfile } = useCurrentLearner();
  const [nickname, setNickname] = useState('');
  const [grade, setGrade] = useState<Exclude<LearnerGrade, 'unknown'> | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isReady = nickname.trim().length > 0 && grade !== null;

  const onSubmit = async () => {
    if (!isReady || isBusy || !grade) return;
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await updateOnboardingProfile(nickname.trim(), grade);
      router.replace('/(tabs)/quiz');
    } catch {
      setErrorMessage('저장 중 오류가 발생했어요. 다시 시도해 주세요.');
    } finally {
      setIsBusy(false);
    }
  };

  return {
    nickname,
    grade,
    isBusy,
    isReady,
    errorMessage,
    onChangeNickname: setNickname,
    onSelectGrade: setGrade,
    onSubmit,
  };
}
