import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageKeys } from '@/constants/storage-keys';

export type StrokePoint = {
  x: number;
  y: number;
  p: number;
};

export type StrokeTool = 'pen' | 'highlighter';

export type Stroke = {
  id: string;
  tool: StrokeTool;
  color: string;
  size: number;
  points: StrokePoint[];
};

export type ProblemScratchpad = {
  examId: string;
  problemNumber: number;
  strokes: Stroke[];
  updatedAt: number;
};

function makeKey(accountKey: string, examId: string, problemNumber: number): string {
  return `${StorageKeys.scratchpadPrefix}${accountKey}/${examId}/${problemNumber}`;
}

function parse(raw: string): ProblemScratchpad | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.examId !== 'string') return null;
    if (typeof parsed.problemNumber !== 'number') return null;
    if (!Array.isArray(parsed.strokes)) return null;
    if (typeof parsed.updatedAt !== 'number') return null;
    return parsed as ProblemScratchpad;
  } catch {
    return null;
  }
}

export async function saveScratchpad(
  accountKey: string,
  scratchpad: ProblemScratchpad,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      makeKey(accountKey, scratchpad.examId, scratchpad.problemNumber),
      JSON.stringify(scratchpad),
    );
  } catch {}
}

export async function loadScratchpad(
  accountKey: string,
  examId: string,
  problemNumber: number,
): Promise<ProblemScratchpad | null> {
  try {
    const raw = await AsyncStorage.getItem(makeKey(accountKey, examId, problemNumber));
    return raw ? parse(raw) : null;
  } catch {
    return null;
  }
}
