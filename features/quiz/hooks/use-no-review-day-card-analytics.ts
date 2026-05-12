import { useCallback, useEffect, useRef } from 'react';
import { logEvent } from '@/features/analytics/log-event';

interface UseNoReviewDayCardAnalyticsArgs {
  visible: boolean;
  daysUntil: number;
  onPressExam: () => void;
}

interface UseNoReviewDayCardAnalyticsResult {
  handlePressExam: () => void;
}

/**
 * NoReviewDayCard 분석 발화. 카드가 노출되는 1회만 viewed 발화.
 * daysUntil 변경(자정 경과)으로 재발화하지 않음.
 */
export function useNoReviewDayCardAnalytics({
  visible,
  daysUntil,
  onPressExam,
}: UseNoReviewDayCardAnalyticsArgs): UseNoReviewDayCardAnalyticsResult {
  const viewedFiredRef = useRef(false);
  const daysUntilRef = useRef(daysUntil);
  daysUntilRef.current = daysUntil;

  useEffect(() => {
    if (!visible) {
      viewedFiredRef.current = false;
      return;
    }
    if (viewedFiredRef.current) return;
    viewedFiredRef.current = true;
    logEvent('no_review_day_card_viewed', {
      days_until_next_review: daysUntilRef.current,
    });
  }, [visible]);

  const handlePressExam = useCallback(() => {
    logEvent('no_review_day_card_cta_pressed', {
      days_until_next_review: daysUntilRef.current,
    });
    onPressExam();
  }, [onPressExam]);

  return { handlePressExam };
}
