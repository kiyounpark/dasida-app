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
export type PhotoSource = 'camera' | 'library';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1, // 축소·압축은 아래 manipulator가 한 번만 한다
  // 기본값(Automatic)은 카드처럼 뜨는데, 그걸 닫고 나면 뒤 화면의 헤더가
  // 터치를 못 받는다 — 학생이 취소하면 사진 화면에 갇힌다 (08.26 실기 재현).
  // 카메라도 같은 UIImagePickerController를 쓰므로 같은 값을 준다.
  presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
};

/**
 * 카메라나 사진첩에서 한 장. 학생이 취소하면 null.
 * 권한을 거부하면 던진다 — 취소와 달리 왜 안 되는지 화면에 떠야 한다.
 */
export async function pickPhoto(source: PhotoSource): Promise<PickedPhoto | null> {
  const picked = source === 'camera' ? await launchCamera() : await launchLibrary();
  if (picked.canceled) return null;

  const asset = picked.assets[0];
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

/**
 * 권한 거부 문구는 학생이 그대로 읽는다 — 업로드 화면의 카드에 직행한다
 * (photo-upload-view.tsx). 그래서 상태 코드를 안 싣는다.
 *
 * 두 문구 모두 반드시 다른 길을 알려준다. 아이폰은 한 번 거부하면 다시 안 묻기
 * 때문에, 안내가 없으면 학생은 여기서 끝난다 — 남은 길이 멀쩡히 있는데도.
 */
const LIBRARY_DENIED =
  '사진첩을 못 열었어. 폰 설정에서 다시다 사진 접근을 켜면 돼.\n' +
  "아니면 '틀린 문제 사진 올리기'를 다시 눌러서 카메라로 찍어도 돼.";
const CAMERA_DENIED =
  '카메라를 못 열었어. 폰 설정에서 다시다 카메라를 켜면 돼.\n' +
  "아니면 '틀린 문제 사진 올리기'를 다시 눌러서 앨범에서 골라도 돼.";

async function launchLibrary() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(LIBRARY_DENIED);
  }
  return ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
}

async function launchCamera() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error(CAMERA_DENIED);
  }
  return ImagePicker.launchCameraAsync(PICKER_OPTIONS);
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
