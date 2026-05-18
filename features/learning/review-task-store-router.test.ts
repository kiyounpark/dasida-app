import type { AuthClient } from '@/features/auth/auth-client';
import type { AuthSession } from '@/features/auth/types';

import { createReviewTaskStore } from './create-learning-history-repository';
import { ReviewTaskStoreRouter } from './review-task-store-router';
import type { ReviewTaskStore } from './review-task-store';

const ACCOUNT = 'user:acc-1';

function fakeStore(tag: string): ReviewTaskStore & { tag: string } {
  return {
    tag,
    load: jest.fn().mockResolvedValue([]),
    saveAll: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
  };
}

function authClientWith(session: AuthSession | null): AuthClient {
  return {
    loadSession: jest.fn().mockResolvedValue(session),
  } as unknown as AuthClient;
}

const authenticated: AuthSession = {
  status: 'authenticated',
  accountKey: ACCOUNT,
} as AuthSession;
const anonymous: AuthSession = {
  status: 'anonymous',
  accountKey: ACCOUNT,
} as AuthSession;

test('authenticated → remote store로 라우팅', async () => {
  const local = fakeStore('local');
  const remote = fakeStore('remote');
  const router = new ReviewTaskStoreRouter({
    authClient: authClientWith(authenticated),
    localStore: local,
    remoteStore: remote,
  });

  await router.load(ACCOUNT);

  expect(remote.load).toHaveBeenCalledWith(ACCOUNT);
  expect(local.load).not.toHaveBeenCalled();
});

test('anonymous → local store로 라우팅', async () => {
  const local = fakeStore('local');
  const remote = fakeStore('remote');
  const router = new ReviewTaskStoreRouter({
    authClient: authClientWith(anonymous),
    localStore: local,
    remoteStore: remote,
  });

  await router.saveAll(ACCOUNT, []);

  expect(local.saveAll).toHaveBeenCalled();
  expect(remote.saveAll).not.toHaveBeenCalled();
});

test('authenticated인데 remote 미구성 → throw', async () => {
  const router = new ReviewTaskStoreRouter({
    authClient: authClientWith(authenticated),
    localStore: fakeStore('local'),
    remoteStore: null,
  });

  await expect(router.load(ACCOUNT)).rejects.toThrow();
});

test('세션 없음 → throw', async () => {
  const router = new ReviewTaskStoreRouter({
    authClient: authClientWith(null),
    localStore: fakeStore('local'),
    remoteStore: fakeStore('remote'),
  });

  await expect(router.load(ACCOUNT)).rejects.toThrow();
});

test('accountKey 불일치 → throw', async () => {
  const router = new ReviewTaskStoreRouter({
    authClient: authClientWith(authenticated),
    localStore: fakeStore('local'),
    remoteStore: fakeStore('remote'),
  });

  await expect(router.load('user:other')).rejects.toThrow();
});

test('createReviewTaskStore: env 미구성 시 guest는 local로 동작(스모크)', async () => {
  const store = createReviewTaskStore(authClientWith(anonymous));
  await expect(store.saveAll(ACCOUNT, [])).resolves.toBeUndefined();
  await expect(store.load(ACCOUNT)).resolves.toEqual([]);
});
