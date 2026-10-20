import Constants from 'expo-constants';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { FirestoreLearnerProfileStore } from '../firestore-learner-profile-store';

jest.mock('firebase/app', () => ({ getApp: jest.fn(() => 'app') }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.15' } } }));

beforeEach(() => {
  jest.clearAllMocks();
  (doc as jest.Mock).mockReturnValue('profile-ref');
  (serverTimestamp as jest.Mock).mockReturnValue('SERVER_TIMESTAMP');
  (setDoc as jest.Mock).mockResolvedValue(undefined);
});

it.each([
  { status: 'answered', source: 'youtube_shorts' },
  { status: 'skipped', source: null },
] as const)('heardFrom $status: 해당 칸만 merge하고 서버 시각과 앱 버전을 싣는다', async (answer) => {
  await new FirestoreLearnerProfileStore().saveHeardFrom('user:uid-123', answer);
  expect(doc).toHaveBeenCalledWith(undefined, 'users', 'uid-123', 'profile', 'data');
  expect(setDoc).toHaveBeenCalledTimes(1);
  expect(setDoc).toHaveBeenCalledWith('profile-ref', {
    heardFrom: { schemaVersion: 1, ...answer, recordedAt: 'SERVER_TIMESTAMP', appVersion: '1.0.15' },
  }, { merge: true });
  expect(Object.keys((setDoc as jest.Mock).mock.calls[0][1])).toEqual(['heardFrom']);
  expect(serverTimestamp).toHaveBeenCalledTimes(1);
});

it('앱 버전이 없으면 null로 쓴다', async () => {
  const config = Constants.expoConfig;
  Constants.expoConfig = null;
  try {
    await new FirestoreLearnerProfileStore().saveHeardFrom('user:uid-123', { status: 'skipped', source: null });
    expect((setDoc as jest.Mock).mock.calls[0][1].heardFrom.appVersion).toBeNull();
  } finally { Constants.expoConfig = config; }
});

it('load는 Firestore Timestamp 객체를 변환하지 않고 유지한다', async () => {
  const recordedAt = { seconds: 123, nanoseconds: 0, toDate: () => new Date(123000) };
  const profile = { accountKey: 'user:uid-123', heardFrom: { schemaVersion: 1, status: 'skipped', source: null, recordedAt, appVersion: null } };
  (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => profile });
  const loaded = await new FirestoreLearnerProfileStore().load('user:uid-123');
  expect(loaded?.heardFrom?.recordedAt).toBe(recordedAt);
});
