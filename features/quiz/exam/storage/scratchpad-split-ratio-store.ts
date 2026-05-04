import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';

function makeKey(accountKey: string): string {
  return `${StorageKeys.scratchpadSplitRatioPrefix}${accountKey}`;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export async function saveSplitRatio(accountKey: string, ratio: number): Promise<void> {
  try {
    await AsyncStorage.setItem(makeKey(accountKey), String(clamp01(ratio)));
  } catch {}
}

export async function loadSplitRatio(accountKey: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(makeKey(accountKey));
    if (raw === null) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return n;
  } catch {
    return null;
  }
}
