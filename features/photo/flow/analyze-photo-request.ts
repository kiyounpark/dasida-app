import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { AnalyzePhotoResult } from '../types';

const ANALYZE_URL = 'https://asia-northeast3-dasida-app.cloudfunctions.net/analyzePhoto';
/** functions/src/analyze-photo.ts의 MAX_IMAGE_DATA_URL_LENGTH와 같은 값 — 넘으면 서버가 400 */
const MAX_IMAGE_DATA_URL_LENGTH = 8_000_000;
/**
 * web-proto downscaleToDataUrl과 같은 값 (10.01 웹 바꿈 → 1.0.10에 같이, 기윤 🔒).
 * 옛 규칙(긴 변 1568)은 세로 긴 사진(스크린샷·세로로 자른 사진)의 짧은 변을 800 밑으로 눌러,
 * 원본이 커도 서버 거르기(functions/src/analyze-photo.ts)에 걸렸다. 카메라 3:4 사진은 그대로 1176×1568.
 */
const DOWNSCALE_MAX_PIXELS = 1176 * 1568;
const DOWNSCALE_MAX_LONG_SIDE = 2048;
const JPEG_QUALITY = 0.82;
/**
 * 마감 사슬 AI 150초 → 서버 함수 180초 → 여기 195초 (web-proto ANALYZE_CLIENT_DEADLINE_MS와 같은 값).
 * 서버는 clientDeadlineMs − 15초(최대 177초)를 응답 예산으로 쓰고, 표식이 없으면(1.0.9) 옛 57초로 돈다.
 */
const ANALYZE_CLIENT_DEADLINE_MS = 195_000;
/** 시간 초과·5xx — 다시 눌러도 같은 사진은 같게 실패한다. 재시도를 권하지 않는다 (09.30 웹과 같은 문구) */
const ANALYZE_FAILED_MESSAGE = '분석을 끝내지 못했어. 이번에는 풀이가 맞는지 틀렸는지 판단하지 못했어.';

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

/** 픽셀 총량과 긴 변 둘 다 넘지 않게 줄이는 배율. 1이면 그대로 (web-proto와 같은 식) */
export function downscaleRatio(width: number, height: number): number {
  return Math.min(
    1,
    Math.sqrt(DOWNSCALE_MAX_PIXELS / (width * height)),
    DOWNSCALE_MAX_LONG_SIDE / Math.max(width, height),
  );
}

/** 서버 상한 안으로 줄여 data URL로. 폰 원본(3024×4032)은 여기서 470~700KB가 된다. */
export async function downscaleToDataUrl(photo: PickedPhoto): Promise<string> {
  const scale = downscaleRatio(photo.width, photo.height);
  const context = ImageManipulator.manipulate(photo.uri);
  if (scale < 1) {
    // 긴 변만 지정하면 짧은 변은 비율대로 따라온다
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
 * 사진 한 장의 번호. 고를 때마다 새로 — 원장이 재시도·다시 찍기를 이 값으로 잇는다.
 * 서버 SUBMISSION_ID_PATTERN(8~64자 영숫자·_·-)에 맞는 모양이다.
 */
export function newSubmissionId(): string {
  return Crypto.randomUUID();
}

/**
 * analyzePhoto 호출.
 * AbortSignal.timeout은 브라우저에만 있다 (web-proto는 쓰지만 RN에는 없다) → 직접 만든다.
 *
 * 계정 헤더·출처(app)·앱 버전·qa는 서버 사용량 원장(photoAnalysisRuns)에 적힌다 — 1.0.9부터.
 * 설계: docs/superpowers/specs/2026-09-23-photo-usage-log-design.md
 * submissionId·retakeOf·clientDeadlineMs는 1.0.10부터 (원장 v2, web-proto와 같은 값).
 */
export async function requestAnalyze(
  imageDataUrl: string,
  options: {
    headers?: Record<string, string>;
    qa?: boolean;
    submissionId?: string | null;
    /** 거르기에 걸려 [다시 찍기]로 온 제출이면 직전 submissionId */
    retakeOf?: string | null;
  } = {},
): Promise<AnalyzePhotoResult> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), ANALYZE_CLIENT_DEADLINE_MS);
  let response: Response;
  try {
    response = await fetch(ANALYZE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: JSON.stringify({
        imageDataUrl,
        channel: 'app',
        // app.config.js의 version — 프로필 화면이 보여주는 값과 같다
        appVersion: Constants.expoConfig?.version,
        qa: options.qa ?? false,
        // null이면 서버는 없는 것으로 본다
        submissionId: options.submissionId ?? null,
        retakeOf: options.retakeOf ?? null,
        // "긴 마감을 아는 클라이언트" 표식 — 없으면 서버는 옛 57초 예산으로 돈다
        clientDeadlineMs: ANALYZE_CLIENT_DEADLINE_MS,
      }),
      signal: abortController.signal,
    });
  } catch (caught) {
    // 195초 마감에 끊긴 것 — 학생 화면에 "Aborted" 같은 원문이 나가지 않게
    if (abortController.signal.aborted) throw new Error(ANALYZE_FAILED_MESSAGE);
    throw caught;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    // 5xx·429 — 09.30에 바꿨다(웹과 같은 문구). 옛 문구 "잠깐 늦어졌어. 한 번만 다시 눌러줄래?"는
    // 긴 풀이 시간 초과에서 학생이 4번 다시 눌러 4번 52초를 기다리게 했고, 학생은 "내 오답이라 못 잡았다"로 읽었다.
    // 다시 눌러도 같은 사진은 같게 실패한다 → 재시도를 권하지 않고, 판단을 못 했다는 사실만 말한다.
    if (response.status >= 500 || response.status === 429) {
      throw new Error(ANALYZE_FAILED_MESSAGE);
    }
    throw new Error(`분석 서버가 ${response.status}로 답했어`);
  }
  return (await response.json()) as AnalyzePhotoResult;
}
