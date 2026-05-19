import type { AuthClient } from '@/features/auth/auth-client';

import { LearningHistoryRepositoryRouter } from './learning-history-repository-router';
import type { FirebaseLearningHistoryRepository } from './firebase-learning-history-repository';
import type { LocalLearningHistoryRepository } from './local-learning-history-repository';

const ACCOUNT = 'user:acc-1';

function makeRouter(status: 'authenticated' | 'anonymous') {
  const authClient = {
    loadSession: jest.fn(async () => ({ status, accountKey: ACCOUNT })),
  } as unknown as AuthClient;

  const localRepository = {
    flushPendingAttempts: jest.fn(async () => {}),
  } as unknown as LocalLearningHistoryRepository;
  const remoteRepository = {
    flushPendingAttempts: jest.fn(async () => {}),
  } as unknown as FirebaseLearningHistoryRepository;

  const router = new LearningHistoryRepositoryRouter({
    authClient,
    localRepository,
    remoteRepository,
  });
  return { router, localRepository, remoteRepository };
}

test('authenticated session flushes via the remote repository', async () => {
  const { router, remoteRepository, localRepository } = makeRouter('authenticated');
  await router.flushPendingAttempts(ACCOUNT);
  expect(remoteRepository.flushPendingAttempts).toHaveBeenCalledWith(ACCOUNT);
  expect(localRepository.flushPendingAttempts).not.toHaveBeenCalled();
});

test('guest session flushes via the local repository (no-op)', async () => {
  const { router, remoteRepository, localRepository } = makeRouter('anonymous');
  await router.flushPendingAttempts(ACCOUNT);
  expect(localRepository.flushPendingAttempts).toHaveBeenCalledWith(ACCOUNT);
  expect(remoteRepository.flushPendingAttempts).not.toHaveBeenCalled();
});
