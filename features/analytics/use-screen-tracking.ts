import { useEffect, useRef } from 'react';
import { useSegments } from 'expo-router';

import { logScreenView } from './log-event';
import type { ScreenName } from './event-types';

function segmentsToScreenName(segments: readonly string[]): ScreenName {
  const key = segments.join('/');
  switch (key) {
    case '(tabs)/quiz':
      return 'quiz_hub';
    case 'quiz/mock-exam-intro':
      return 'mock_exam_intro';
    case 'quiz/mock-exam-session':
      return 'mock_exam_session';
    case 'quiz/review-session':
      return 'review_session';
    case 'quiz/weakness-practice':
      return 'weakness_practice';
    case 'quiz/diagnostic':
      return 'diagnostic_screen';
    case '(tabs)/history':
      return 'history';
    case '(tabs)/profile':
      return 'profile';
    case 'sign-in':
      return 'sign_in';
    case 'onboarding':
      return 'onboarding';
    default:
      return 'unknown';
  }
}

export function useScreenTracking(): void {
  const segments = useSegments();
  const key = segments.join('/');
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    const screen = segmentsToScreenName(segments);
    logScreenView(screen);
  }, [key]);
}
