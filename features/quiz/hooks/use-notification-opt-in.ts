import { useCallback, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';

import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import {
  requestNotificationPermission,
  scheduleReviewNotifications,
} from '@/features/quiz/notifications/review-notification-scheduler';

import type { NotificationOptInCardState } from '@/features/quiz/components/notification-opt-in-card';

const reviewStore = new LocalReviewTaskStore();

type Params = {
  accountKey: string | undefined;
  hasWeaknesses: boolean;
};

type Result = {
  state: NotificationOptInCardState;
  onEnable: () => Promise<void>;
  onDismiss: () => void;
};

export function useNotificationOptIn({ accountKey, hasWeaknesses }: Params): Result {
  const [state, setState] = useState<NotificationOptInCardState>('dismissed');
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!accountKey || !hasWeaknesses) {
      setState('dismissed');
      return () => {
        cancelled = true;
      };
    }

    void Notifications.getPermissionsAsync()
      .then(async ({ status }) => {
        if (cancelled) return;
        if (status === 'granted') {
          setState('granted');
          if (cancelled) return;
          await scheduleReviewNotifications(accountKey, reviewStore).catch((err: unknown) => {
            console.warn('[useNotificationOptIn] schedule failed', err);
          });
          return;
        }
        if (status === 'denied') {
          setState('denied');
          return;
        }
        setState('idle');
      })
      .catch((err: unknown) => {
        console.warn('[useNotificationOptIn] getPermissionsAsync failed', err);
        if (!cancelled) setState('dismissed');
      });

    return () => {
      cancelled = true;
    };
  }, [accountKey, hasWeaknesses]);

  const onEnable = useCallback(async () => {
    if (!accountKey) return;
    setState('requesting');
    const granted = await requestNotificationPermission().catch(() => false);
    if (!mountedRef.current) return;
    if (granted) {
      setState('granted');
      if (!mountedRef.current) return;
      await scheduleReviewNotifications(accountKey, reviewStore).catch((err: unknown) => {
        console.warn('[useNotificationOptIn] schedule failed', err);
      });
    } else {
      setState('denied');
    }
  }, [accountKey]);

  const onDismiss = useCallback(() => {
    setState('dismissed');
  }, []);

  return { state, onEnable, onDismiss };
}
