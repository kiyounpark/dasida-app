import { FirebaseAuthClient } from '../firebase-auth-client';
import { clearLocalConsent } from '@/features/consent/consent-store';
import { clearStoredAuthSession, loadStoredAuthSession } from '../session-store';

/**
 * 로그아웃·탈퇴 때 사진 동의 사본을 지운다 (1.0.11 1줄).
 * 안 지우면: 이 기기에서 같은 계정으로 다시 들어올 때 서버와 상관없이 옛 사본으로 동의 화면을 건너뛴다.
 */

const SESSION = {
  status: 'authenticated',
  accountKey: 'user:uid-1',
  firebaseUid: 'uid-1',
  provider: 'apple',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const mockUser = {
  uid: 'uid-1',
  providerId: 'firebase',
  providerData: [{ providerId: 'apple.com' }],
  getIdToken: jest.fn(async () => 'id-token'),
};

jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: jest.fn(),
  OAuthProvider: jest.fn(),
  deleteUser: jest.fn(async () => undefined),
  getAdditionalUserInfo: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  signInWithCredential: jest.fn(),
  signOut: jest.fn(async () => undefined),
}));

jest.mock('../firebase-app', () => ({
  getFirebaseAuthInstance: () => ({ currentUser: mockUser, authStateReady: async () => undefined }),
}));

jest.mock('../firebase-config', () => ({
  getGoogleClientIdForCurrentPlatform: jest.fn(),
  isFirebaseAuthConfigured: () => true,
  isGoogleAuthConfigured: () => true,
}));

jest.mock('../session-store', () => ({
  clearStoredAuthSession: jest.fn(async () => undefined),
  createAnonymousSession: jest.fn(),
  createAuthenticatedSession: jest.fn(() => SESSION),
  loadStoredAuthSession: jest.fn(async () => SESSION),
  saveAuthSession: jest.fn(async () => undefined),
}));

jest.mock('@/features/consent/consent-store', () => ({ clearLocalConsent: jest.fn(async () => undefined) }));
jest.mock('@/features/learning/local-learning-history-storage', () => ({
  clearLearningHistoryStorage: jest.fn(async () => undefined),
}));
jest.mock('@/features/photo/note-store', () => ({ clearPhotoNotes: jest.fn(async () => undefined) }));

beforeEach(() => {
  jest.clearAllMocks();
  (loadStoredAuthSession as jest.Mock).mockResolvedValue(SESSION);
});

it('로그아웃: 세션을 지우기 전에 잡아 둔 계정의 동의 사본을 지운다', async () => {
  await new FirebaseAuthClient().signOut();

  expect(clearStoredAuthSession).toHaveBeenCalled();
  expect(clearLocalConsent).toHaveBeenCalledWith('user:uid-1');
});

it('로그아웃: 세션이 없으면 지울 계정도 없다', async () => {
  (loadStoredAuthSession as jest.Mock).mockResolvedValue(null);

  await new FirebaseAuthClient().signOut();

  expect(clearLocalConsent).not.toHaveBeenCalled();
});

it('탈퇴: 서버 삭제가 끝난 뒤 노트·기록과 같은 자리에서 동의 사본도 지운다', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ success: true }) })) as unknown as typeof fetch;

  await new FirebaseAuthClient().deleteAccount('user:uid-1', 'https://example.test/deleteAccount');

  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(clearLocalConsent).toHaveBeenCalledWith('user:uid-1');
});
