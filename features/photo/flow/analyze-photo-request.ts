import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { AnalyzePhotoResult } from '../types';

const ANALYZE_URL = 'https://asia-northeast3-dasida-app.cloudfunctions.net/analyzePhoto';
/** functions/src/analyze-photo.ts의 MAX_IMAGE_DATA_URL_LENGTH와 같은 값 — 넘으면 서버가 400 */
const MAX_IMAGE_DATA_URL_LENGTH = 8_000_000;
/** web-proto downscaleToDataUrl과 같은 값 (긴 변 1568px, JPEG 0.82) */
const MAX_DIM = 1568;
const JPEG_QUALITY = 0.82;
/** 서버 타임아웃(60s)보다 살짝 길게 */
const REQUEST_TIMEOUT_MS = 75_000;

export type PickedPhoto = { uri: string; width: number; height: number };

/** 사진첩에서 한 장. 권한 거부·취소는 null로 돌려주고 던지지 않는다. */
export async function pickPhoto(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(`사진첩 권한이 없어 (${permission.status})`);
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1, // 축소·압축은 아래 manipulator가 한 번만 한다
  });
  if (picked.canceled) return null;

  const asset = picked.assets[0];
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

/** 서버 상한 안으로 줄여 data URL로. 폰 원본(3024×4032)은 여기서 470~700KB가 된다. */
export async function downscaleToDataUrl(photo: PickedPhoto): Promise<string> {
  const scale = Math.min(1, MAX_DIM / Math.max(photo.width, photo.height));
  const context = ImageManipulator.manipulate(photo.uri);
  if (scale < 1) {
    // 긴 변만 지정하면 짧은 변은 비율대로 따라온다 (web-proto와 같은 규칙)
    context.resize(
      photo.width >= photo.height
        ? { width: Math.round(photo.width * scale) }
        : { height: Math.round(photo.height * scale) },
    );
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: JPEG_QUALITY,
    base64: true,
  });
  if (!saved.base64) {
    throw new Error('사진을 줄이는 데까지는 됐는데 변환이 안 됐어');
  }

  const dataUrl = `data:image/jpeg;base64,${saved.base64}`;
  if (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    throw new Error('사진이 너무 커. 조금 더 작게 찍어줄래?');
  }
  return dataUrl;
}

/**
 * analyzePhoto 호출.
 * AbortSignal.timeout은 브라우저에만 있다 (web-proto는 쓰지만 RN에는 없다) → 직접 만든다.
 */
export async function requestAnalyze(imageDataUrl: string): Promise<AnalyzePhotoResult> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(ANALYZE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl }),
      signal: abortController.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`분석 서버가 ${response.status}로 답했어`);
  }
  return (await response.json()) as AnalyzePhotoResult;
}
