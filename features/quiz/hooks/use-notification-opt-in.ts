import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { LocalReviewTaskStore } from '@/features/learning/review-task-store';
import {
  cancelAllReviewNotifications,
  requestNotificationPermission,
  scheduleReviewNotifications,
} from '@/features/quiz/notifications/review-notification-scheduler';

import type { NotificationOptInCardState } from '@/features/quiz/components/notification-opt-in-card';

const reviewStore = new LocalReviewTaskStore();

type RegisterPushToken = (
  accountKey: string,
  token: string,
  platform: 'ios' | 'android',
) => Promise<void>;

type Params = {
  accountKey: string | undefined;
  /** 물을 자리인가 — 결과 화면은 약점이 잡혔을 때, 홈은 사진 「내일 복습」 카드가 뜰 때(1.0.12 ②) */
  eligible: boolean;
  isAuthenticated: boolean;
  registerPushToken: RegisterPushToken;
};

// 「나중에」(onDismiss)는 없다 — 애플 HIG pre-alert: 버튼 하나, 닫기 없음(1.0.12 Q1', Fable 10.05).
// 안 묻고 싶은 학생은 카드를 지나치거나 시스템 창에서 「허용 안 함」 → denied로 카드가 사라진다.
type Result = {
  state: NotificationOptInCardState;
  onEnable: () => Promise<void>;
};

async function activateForAuthenticated(
  accountKey: string,
  registerPushToken: RegisterPushToken,
): Promise<void> {
  await cancelAllReviewNotifications().catch((err: unknown) => {
    console.warn('[useNotificationOptIn] cancel failed', err);
  });
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const platform = Platform.OS === 'android' ? 'android' : 'ios';
    await registerPushToken(accountKey, data, platform);
  } catch (err: unknown) {
    console.warn('[useNotificationOptIn] expo push token failed', err);
  }
}

async function activateForGuest(accountKey: string): Promise<void> {
  await scheduleReviewNotifications(accountKey, reviewStore).catch(
    (err: unknown) => {
      console.warn('[useNotificationOptIn] schedule failed', err);
    },
  );
}

export function useNotificationOptIn({
  accountKey,
  eligible,
  isAuthenticated,
  registerPushToken,
}: Params): Result {
  const [state, setState] = useState<NotificationOptInCardState>('dismissed');
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const activate = useCallback(
    async (key: string) => {
      if (isAuthenticated) {
        await activateForAuthenticated(key, registerPushToken);
      } else {
        await activateForGuest(key);
      }
    },
    [isAuthenticated, registerPushToken],
  );

  // accountKey/eligible 변동 시 재활성화될 수 있음(예: 세션 결과로
  // eligible 토글). 인증 사용자의 토큰 등록은 서버 upsert로 멱등,
  // cancel도 멱등이라 의도적으로 허용 — best-effort 설계.
  useEffect(() => {
    let cancelled = false;
    if (!accountKey || !eligible) {
      setState('dismissed');
      return () => {
        cancelled = true;
      };
    }

    void Notifications.getPermissionsAsync()
      .then(async ({ status, canAskAgain }) => {
        if (cancelled) return;
        if (status === 'granted') {
          setState('granted');
          if (cancelled) return;
          await activate(accountKey);
          return;
        }
        // 안드 13+ 새 설치는 묻기 전에도 denied(canAskAgain true)다 — 그땐 아직 물을 수 있으니 카드를 띄운다.
        if (status === 'denied' && canAskAgain !== true) {
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
  }, [accountKey, eligible, activate]);

  const onEnable = useCallback(async () => {
    if (!accountKey) return;
    setState('requesting');
    const granted = await requestNotificationPermission().catch(() => false);
    if (!mountedRef.current) return;
    if (granted) {
      setState('granted');
      if (!mountedRef.current) return;
      await activate(accountKey);
    } else {
      setState('denied');
    }
  }, [accountKey, activate]);

  return { state, onEnable };
}
