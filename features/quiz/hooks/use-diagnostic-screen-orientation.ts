import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

import { lockToPortrait, unlockAllOrientations } from '@/hooks/use-orientation-lock';

type Options = {
  isTablet: boolean;
  onOrientationChange?: () => void;
};

// 진입 시 iPad에서만 4방향 unlock, 이탈 시 portrait 재잠금.
// onOrientationChange는 회전 도중 in-progress stroke 같은 휘발 상태를 끊기 위한 콜백.
export function useDiagnosticScreenOrientation({
  isTablet,
  onOrientationChange,
}: Options): void {
  useFocusEffect(
    useCallback(() => {
      if (isTablet) {
        void unlockAllOrientations();
      }
      return () => {
        void lockToPortrait();
      };
    }, [isTablet]),
  );

  useEffect(() => {
    if (!onOrientationChange) return;
    const subscription = ScreenOrientation.addOrientationChangeListener(() => {
      onOrientationChange();
    });
    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, [onOrientationChange]);
}
