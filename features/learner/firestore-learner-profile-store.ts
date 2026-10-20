import Constants from 'expo-constants';
import { getApp } from 'firebase/app';
import {
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import type { LearnerProfileStore } from './profile-store';
import type { HeardFromAnswer, LearnerProfile } from './types';

function createRandomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class FirestoreLearnerProfileStore implements LearnerProfileStore {
  private get db() {
    return getFirestore(getApp());
  }

  private profileRef(accountKey: string) {
    // accountKey는 "user:{firebaseUid}" 형태. Firestore 경로에는 순수 UID만 사용한다.
    const uid = accountKey.startsWith('user:') ? accountKey.slice(5) : accountKey;
    return doc(this.db, 'users', uid, 'profile', 'data');
  }

  async load(accountKey: string): Promise<LearnerProfile | null> {
    const snap = await getDoc(this.profileRef(accountKey));
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as LearnerProfile;
  }

  async createInitial(accountKey: string): Promise<LearnerProfile> {
    const timestamp = new Date().toISOString();
    const profile: LearnerProfile = {
      accountKey,
      learnerId: createRandomId(),
      nickname: '',
      grade: 'unknown',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.save(profile);
    return profile;
  }

  async save(profile: LearnerProfile): Promise<void> {
    const data = Object.fromEntries(
      Object.entries({ ...profile, _updatedAt: serverTimestamp() }).filter(
        ([, v]) => v !== undefined,
      ),
    );
    // setDoc(full replace): undefined 필드는 filter로 제거되어 Firestore에서 삭제됨.
    // merge 모드나 updateDoc 전환 시 undefined 대신 deleteField() sentinel 필요.
    await setDoc(this.profileRef(profile.accountKey), data);
  }

  async saveHeardFrom(accountKey: string, answer: HeardFromAnswer): Promise<void> {
    // 다른 프로필 칸은 보내지 않고 이 칸만 추가한다.
    await setDoc(this.profileRef(accountKey), {
      heardFrom: {
        schemaVersion: 1,
        ...answer,
        recordedAt: serverTimestamp(),
        appVersion: Constants.expoConfig?.version ?? null,
      },
    }, { merge: true });
  }

  async reset(accountKey: string): Promise<void> {
    await deleteDoc(this.profileRef(accountKey));
  }
}
