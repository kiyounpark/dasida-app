import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';

export async function hasSeenLandscapeHint(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(StorageKeys.landscapeHintSeen);
    return value === '1';
  } catch (error) {
    console.warn('[landscape-hint-store] hasSeenLandscapeHint failed', error);
    return false;
  }
}

export async function markLandscapeHintSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(StorageKeys.landscapeHintSeen, '1');
  } catch (error) {
    console.warn('[landscape-hint-store] markLandscapeHintSeen failed', error);
  }
}
