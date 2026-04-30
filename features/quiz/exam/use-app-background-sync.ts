import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * 앱이 active → background/inactive로 전환될 때 onSync를 한 번 호출한다.
 * iOS에서 active→inactive→background 연속 전환 시 중복 호출을 방지한다.
 * fire-and-forget이며 실패해도 다음 sync point(잠시 쉬기/홈)에서 회복된다.
 */
export function useAppBackgroundSync(onSync: () => void): void {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;
  const prevStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = prevStateRef.current;
      prevStateRef.current = nextState;
      if (prev === 'active' && (nextState === 'background' || nextState === 'inactive')) {
        onSyncRef.current();
      }
    });
    return () => sub.remove();
  }, []);
}
