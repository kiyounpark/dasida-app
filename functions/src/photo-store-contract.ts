/**
 * 1.0.11 약속 파일 — 앱·서버가 같은 모양을 보는 유일한 자리 (줄 0, 2026-10-02 🔒).
 *
 * 세 줄(1 동의 화면 · 2 서버 저장 · 3 다른 기기 보기)이 이 파일만 보고 동시에 만든다.
 * 고쳐야 하면 혼자 고치지 말고 줄 0을 다시 연다 — 다른 두 줄이 옛 모양으로 짓고 있다.
 * 설계 근거: ~/dev/dasida-measure/2026-10-02-consent-at-login/fable-q3-r2.md (astra·Fable 두 판)
 *
 * import 0 — zod·firebase-admin·@/ 전부 금지. 그래야 앱(Metro tsconfig paths·jest·tsc)과
 * functions(tsc NodeNext) 양쪽에서 그대로 돈다. 앱은 `@/functions/src/photo-store-contract`로 읽는다
 * (앞선 예: features/learning/review-chain.ts:1의 `@/functions/shared/…`).
 * 서버 zod는 각 handler 파일에서 `satisfies z.ZodType<…>`로 이 타입에 묶는다.
 * 앱 PhotoNote와 칸이 같은지는 features/photo/__tests__/photo-store-contract.test.ts가 tsc로 잡는다.
 */

// ── 1. 동의 ──────────────────────────────────────────────────────────────────

/** 🔒 화면 순서 그대로 — [필수] 전송 · [필수] 보관 · [선택] 검토. 동의 화면은 이 배열 순서로 그린다 */
export const CONSENT_KINDS = ['analysis', 'store', 'review'] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

/** 누른 방식 — 'all' = 전체 동의로 넘김, 'individual' = 하나씩 골라 넘김. 문서와 GA가 같은 값을 쓴다 */
export const CONSENT_VIA = ['all', 'individual'] as const;
export type ConsentVia = (typeof CONSENT_VIA)[number];

/** 문구 판 — "다시 물어야 할 만큼" 바뀐 칸만 올린다. 올리면 그 칸이 필수인 사람 전원이 화면을 다시 본다 */
export const CONSENT_COPY_VERSION: Record<ConsentKind, number> = { analysis: 1, store: 1, review: 1 };

/**
 * 필수/선택. 🔒 10.02 오후 "합친다" → store도 필수.
 * 되돌릴 땐 이 값 하나 + 문구만 바꾼다. 화면 꼬리표·[다음] 잠금·서버 403이 전부 이 값을 본다.
 */
export const CONSENT_REQUIRED: Record<ConsentKind, boolean> = { analysis: true, store: true, review: false };

export type ConsentEntry = {
  /** 마지막으로 답한 문구 판 */
  version: number;
  /** 마지막으로 켠 시각(ISO, 서버 시계). 한 번도 안 켰으면 null */
  agreedAt: string | null;
  /** 마지막으로 끈 시각(ISO, 서버 시계). agreedAt보다 뒤면 지금 꺼짐 */
  revokedAt: string | null;
};
// 전이: 처음 거부 = 둘 다 null · 켬 = agreedAt=now, revokedAt=null · 끔 = agreedAt 유지, revokedAt=now
//       같은 선택 재전송 = 시각 안 바꿈. version은 보낸 판으로 갱신.
// 끔의 뜻(보유 약속은 안 바꾼다): store 끔 = 이후 저장만 막는다 · review 끔 = 이후 수집만 막는다.
//   기존 검토본을 끄는 즉시 지울지 만료까지 둘지는 제출 전에 기윤이 정한다(STATUS 「제출 전 확인」).

/** users/{accountKey}/private/consent — private/auth 옆. 탈퇴 recursiveDelete가 같이 지운다 */
export type ConsentDoc = {
  schemaVersion: 1;
  accountKey: string;
  analysis: ConsentEntry;
  store: ConsentEntry;
  review: ConsentEntry;
  /** 마지막 제출을 어떻게 눌렀나 — 칸마다가 아니라 제출 한 번에 하나 */
  via: ConsentVia;
  updatedAt: string;
  appVersion: string | null;
};

export function emptyConsentEntry(): ConsentEntry {
  return { version: 0, agreedAt: null, revokedAt: null };
}

/** 지금 켜져 있고 요구 판 이상인가. ISO 문자열은 길이가 같아 >= 비교가 곧 시각 비교다 */
export function isConsentOn(entry: ConsentEntry | null | undefined, kind: ConsentKind): boolean {
  if (!entry || !entry.agreedAt) return false;
  if (entry.revokedAt && entry.revokedAt >= entry.agreedAt) return false;
  return entry.version >= CONSENT_COPY_VERSION[kind];
}

/** 동의 화면을 띄워야 하나 — 필수 칸 중 하나라도 현재 판에서 안 켜져 있으면. 선택 칸은 다시 안 묻는다 */
export function needsConsentScreen(doc: ConsentDoc | null | undefined): boolean {
  return CONSENT_KINDS.some((kind) => CONSENT_REQUIRED[kind] && !isConsentOn(doc?.[kind], kind));
}

export type ConsentDecisions = Record<ConsentKind, boolean>;

/** POST saveConsent — 세 칸 전부 보낸다(한 화면에서 한 번에 넘긴다). 시각은 서버가 찍는다 */
export type SaveConsentRequest = {
  accountKey: string;
  decisions: ConsentDecisions;
  /** 학생이 본 문구 판 = 앱의 CONSENT_COPY_VERSION */
  copyVersion: Record<ConsentKind, number>;
  via: ConsentVia;
  appVersion: string | null;
};
export type SaveConsentResponse = { consent: ConsentDoc };

/** GET getConsent?accountKey= — null = 한 번도 안 봄(≠ 전부 동의) */
export type GetConsentResponse = { consent: ConsentDoc | null };

/**
 * GA(앱만). 이벤트 타입 추가는 1줄이 features/analytics/event-types.ts에 한다 — 여기선 이름만
 * (EventName을 import하면 import 0이 깨진다). 필수 둘은 늘 true라 submit에 안 싣는다.
 */
export const CONSENT_GA_EVENTS = { view: 'consent_view', submit: 'consent_submit' } as const;
export type ConsentSubmitParams = { review: boolean; via: ConsentVia };

// ── 2. 노트 ──────────────────────────────────────────────────────────────────

/** features/photo/types.ts·analyze-photo-core.ts와 같은 6개. 고정값이라 서버도 enum으로 막는다 */
export const MISTAKE_TYPE_IDS = [
  'concept_gap',
  'formula_recall',
  'setup_error',
  'calc_slip',
  'procedure_miss',
  'answer_read',
] as const;

/**
 * methodId·weaknessIds가 지킬 글자. enum으로는 안 막는다 — 서버는 노트를 읽지 않고,
 * 약점이 늘 때마다(C칸) functions를 먼저 배포해야 노트가 저장되는 묶임을 피한다.
 */
export const DOMAIN_ID_PATTERN = /^[a-z0-9_]{1,64}$/;

/**
 * 폰 PhotoNote(features/photo/types.ts)에서 폰 전용 칸 셋(photoUri · submissionId · cloudStoredAt)을 뺀 것.
 * id 칸들은 string — 앱이 내려받을 때 note-store의 isPhotoNoteLike로 거른다.
 */
export type PhotoNoteWire = {
  id: string;
  createdAt: string;
  schemaVersion: 1;
  dateLabel: string;
  quote: string;
  why: string;
  fix: string;
  methodLabel: string;
  typeLabel: string;
  methodId: string;
  mistakeType: (typeof MISTAKE_TYPE_IDS)[number];
  weaknessIds: string[];
  primaryWeaknessId: string | null;
  checkPassed: boolean;
  checkSkipped?: boolean;
  retryResult: 'pass' | 'fail' | 'skip' | 'none';
};

/** users/{accountKey}/photoNotes/{noteId} — 문서 id = note.id 원문(치환은 파일명만). 본문 불변, create 한 번 */
export type PhotoNoteDoc = PhotoNoteWire & {
  accountKey: string;
  /** notePhotoPath(). 사진 없이 올린 노트만 null — 사진 업로드가 실패하면 문서를 안 쓴다 */
  photoPath: string | null;
  /** 옛 노트는 null — 지어내지 않는다 */
  submissionId: string | null;
  appVersion: string | null;
  /** 서버 시계 */
  storedAt: string;
  /** 1.0.11은 늘 null(지우는 UI 없음). 있으면 "삭제됨" — 올리기·저장이 본다 */
  deletedAt: string | null;
};

/** 「저장됨」 — 서버가 사진 실패 때 문서를 안 쓰므로 "문서가 있고 안 지워짐" = 사진·글 둘 다 남음 */
export function isNoteStored(doc: PhotoNoteDoc | null | undefined): boolean {
  return !!doc && doc.deletedAt === null;
}

/** 노트 카드 ☁ 줄의 입력. 2줄이 그리고, 3줄·올리기가 같은 값을 넣는다. store 필수라 '꺼짐'은 없다 */
export type CloudNoteState =
  | { kind: 'local-only' }
  | { kind: 'saving' }
  | { kind: 'failed'; retryable: boolean }
  | { kind: 'stored'; storedAt: string; hasPhoto: boolean };

/** 서버가 문서를 만든다 — 2줄 handler용 */
export function buildPhotoNoteDoc(
  note: PhotoNoteWire,
  extra: {
    accountKey: string;
    photoPath: string | null;
    submissionId: string | null;
    appVersion: string | null;
    storedAt: string;
  },
): PhotoNoteDoc {
  return { ...note, ...extra, deletedAt: null };
}

/** 내려받은 문서 → 폰 노트 모양(서버 전용 칸 뗌). photoUri = 이 기기에 내려받은 경로 — 3줄용 */
export function toLocalNote(
  doc: PhotoNoteDoc,
  photoUri: string | null,
): PhotoNoteWire & { photoUri: string | null; submissionId: string | null; cloudStoredAt: string } {
  const { accountKey: _a, photoPath: _p, appVersion: _v, storedAt, deletedAt: _d, ...note } = doc;
  return { ...note, photoUri, cloudStoredAt: storedAt };
}

/**
 * "같은 id·다른 내용"(409)을 가릴 때 쓰는 정규화. 칸 순서와 undefined 칸에 흔들리지 않는다
 * (Firestore엔 stripUndefined로 undefined 칸이 아예 없다). 서버 문서와 비교할 땐
 * 서버 전용 칸(accountKey·photoPath·submissionId·appVersion·storedAt·deletedAt)을 먼저 뗀다.
 */
export function canonicalNoteJson(note: PhotoNoteWire): string {
  const keys = (Object.keys(note) as (keyof PhotoNoteWire)[])
    .filter((key) => note[key] !== undefined)
    .sort();
  return JSON.stringify(keys.map((key) => [key, note[key]]));
}

// ── 3. Storage ───────────────────────────────────────────────────────────────

export const NOTE_PHOTO_PREFIX = 'photo-notes';
export const REVIEW_PHOTO_PREFIX = 'review';
/** 버킷 수명 규칙(콘솔)과 방침 문장이 같이 보는 숫자 */
export const REVIEW_PHOTO_RETENTION_DAYS = 30;

/** 폰 파일명과 같은 규칙 — features/photo/photo-file-store.ts가 이 함수를 쓴다(한 집) */
export function safeNoteFileStem(noteId: string): string {
  return noteId.replace(/[^A-Za-z0-9_-]/g, '-');
}

/**
 * photo-notes/{accountKey}/{stem}.jpg — 서버는 늘 .jpg(받는 건 축소한 JPEG뿐).
 * 폰 파일은 원본 확장자를 따라가므로 stem만 같다.
 */
export function notePhotoPath(accountKey: string, noteId: string): string {
  return `${NOTE_PHOTO_PREFIX}/${accountKey}/${safeNoteFileStem(noteId)}.jpg`;
}

/** 탈퇴 때 이 prefix를 통째로 지운다 */
export function accountNotePhotoPrefix(accountKey: string): string {
  return `${NOTE_PHOTO_PREFIX}/${accountKey}/`;
}

/**
 * review/{kstDate}/{accountKey}/{submissionId}.jpg — kstDate = 첫 수신 시각의 KST 날짜.
 * 날짜 아래 흩어지므로 탈퇴 때 prefix로 못 지운다 → 원장의 경로를 모아 지운다(아래 6).
 * 재시도가 자정을 넘겨도 첫 날짜·경로를 다시 쓴다.
 */
export function reviewPhotoPath(kstDate: string, accountKey: string, submissionId: string): string {
  return `${REVIEW_PHOTO_PREFIX}/${kstDate}/${accountKey}/${submissionId}.jpg`;
}

/** 검토본 만료 = 첫 수신 + 30일. 재시도로 늘리지 않는다 */
export function reviewExpiresAt(receivedAtIso: string): string {
  return new Date(Date.parse(receivedAtIso) + REVIEW_PHOTO_RETENTION_DAYS * 86_400_000).toISOString();
}

/**
 * 사진 객체 메타데이터 — 치환 때문에 다른 id가 같은 파일명이 될 수 있어 원래 id를 적는다.
 * 같은 경로에 다른 id가 있으면 PATH_CONFLICT, 덮지 않는다(남의 노트 사진을 조용히 덮는 사고를 막는다).
 */
export const PHOTO_OBJECT_META_NOTE_ID = 'dasida-note-id';
export const PHOTO_OBJECT_META_SUBMISSION_ID = 'dasida-submission-id';

// ── 4. 엔드포인트 ─────────────────────────────────────────────────────────────

/** features/photo/flow/analyze-photo-request.ts의 ANALYZE_URL과 같은 곳. env.ts는 안 쓴다(worktree·EAS 어디서 오는지 안 보인다) */
export const FUNCTIONS_BASE_URL = 'https://asia-northeast3-dasida-app.cloudfunctions.net';

export const PHOTO_STORE_ENDPOINTS = {
  /** POST — 1줄 */
  saveConsent: 'saveConsent',
  /** GET — 1줄 */
  getConsent: 'getConsent',
  /** POST — 2줄 */
  savePhotoNote: 'savePhotoNote',
  /** GET — 3줄 */
  listPhotoNotes: 'listPhotoNotes',
  /** GET — 3줄 */
  getPhotoNoteImage: 'getPhotoNoteImage',
} as const;

export function photoStoreUrl(name: keyof typeof PHOTO_STORE_ENDPOINTS): string {
  return `${FUNCTIONS_BASE_URL}/${PHOTO_STORE_ENDPOINTS[name]}`;
}

/*
 * 인증(다섯 개 공통): x-dasida-account-key + Authorization: Bearer <idToken>
 * (앱 createRemoteAuthHeaders — features/learning/firebase-learning-history-api.ts).
 * accountKey는 헤더 = 본문/쿼리. firebase 계정만 받는다 — 운영엔 익명이 없다.
 */

/** 오류 응답 — 기존 {error} 위에 code·retryable을 더한다(앱의 옛 읽기는 error만 보니 안 깨진다) */
export type ApiErrorCode =
  | 'INVALID_REQUEST' // 400
  | 'UNAUTHORIZED' // 401·403 인증
  | 'CONSENT_REQUIRED' // 403 동의 꺼짐·판 낮음
  | 'NOTE_CONFLICT' // 409 같은 id·다른 내용
  | 'PATH_CONFLICT' // 409 같은 파일명·다른 id
  | 'NOTE_DELETED' // 410 deletedAt 있음
  | 'PHOTO_MISSING' // 404 문서는 있는데 사진 없음
  | 'TOO_LARGE' // 413
  | 'TEMPORARY_FAILURE'; // 500·503 — 재시도

export type ApiErrorResponse = { error: string; code: ApiErrorCode; retryable: boolean };

export const RETRYABLE_CODES: ReadonlySet<ApiErrorCode> = new Set<ApiErrorCode>(['TEMPORARY_FAILURE']);

/** functions/src/analyze-photo.ts와 같은 상한 */
export const MAX_IMAGE_DATA_URL_LENGTH = 8_000_000;
export const IMAGE_DATA_URL_PATTERN = /^data:image\/jpeg;base64,/;
/** functions/src/photo-analysis-run-log.ts와 같은 값 */
export const SUBMISSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/** POST savePhotoNote */
export type SavePhotoNoteRequest = {
  accountKey: string;
  note: PhotoNoteWire;
  /** downscaleToDataUrl 결과 그대로. 폰에도 사진이 없으면 null */
  imageDataUrl: string | null;
  submissionId: string | null;
  appVersion: string | null;
};
export type SavePhotoNoteResponse = {
  noteId: string;
  photoPath: string | null;
  storedAt: string;
  /** 같은 id·같은 내용이 이미 있어 아무것도 안 썼다(재시도·중복 전송) */
  alreadyStored: boolean;
};
/*
 * 저장 규칙(서버, 2줄):
 *  ① 인증 → isConsentOn(store) 아니면 403 CONSENT_REQUIRED
 *     (탈퇴가 consent를 먼저 지우니 늦게 온 저장도 여기서 막힌다)
 *  ② 문서 읽기 — deletedAt 있음 → 410 NOTE_DELETED · canonicalNoteJson 같음 → 200 alreadyStored
 *     · 다름 → 409 NOTE_CONFLICT
 *  ③ imageDataUrl 있으면: 같은 경로 객체의 메타 noteId가 다르면 409 PATH_CONFLICT,
 *     아니면 업로드(메타 noteId·submissionId). 실패 → 500, 문서 안 씀
 *  ④ 문서 create(stripUndefined). ALREADY_EXISTS면 ②로 돌아가 판정
 *  타임아웃은 성공도 실패도 아니다 — 같은 요청을 다시 보낸다.
 *  로컬 저장의 반환값은 ☁ 「저장됨」의 증거가 아니다 — 서버 응답으로만 판정한다.
 */

/** GET listPhotoNotes?accountKey=&limit=&before= — before = createdAt 커서 */
export type ListPhotoNotesRequest = { accountKey: string; limit?: number; before?: string };
export const LIST_PHOTO_NOTES_DEFAULT_LIMIT = 100;
export const LIST_PHOTO_NOTES_MAX_LIMIT = 200;
/** createdAt 내림차순. deletedAt 있는 문서도 준다 — "안 올라감"과 "지웠음"을 가르려면 필요하다 */
export type ListPhotoNotesResponse = { notes: PhotoNoteDoc[]; nextBefore: string | null };
// 올리기 대상(4) = 로컬 cloudStoredAt 없음 ∧ 서버 목록에 같은 id 없음.

/**
 * GET getPhotoNoteImage?accountKey=&noteId= → 200 image/jpeg 바이트(Cache-Control: private, no-store)
 * · 404 PHOTO_MISSING. 서버가 문서의 photoPath를 읽는다 — 앱이 경로를 보내지 않는다.
 */
export type GetPhotoNoteImageRequest = { accountKey: string; noteId: string };

// ── 5. 원장(photoAnalysisRuns)에 2줄이 더하는 칸 ───────────────────────────────

/** PhotoAnalysisRunDoc에 붙는다. 노트 저장 성공과는 별개다 */
export type PhotoRunConsentFields = {
  /** unknown = 인증 미확인·동의 문서를 못 읽음. 1.0.10 이하·웹 행도 unknown */
  analysisConsent: 'agreed' | 'not-agreed' | 'unknown';
  reviewConsent: 'agreed' | 'not-agreed' | 'unknown';
  review: { status: 'skipped' | 'stored' | 'failed'; photoPath: string | null; expiresAt: string | null };
};
/*
 * 검토본 조건 = authVerified ∧ reviewConsent agreed ∧ submissionId 있음.
 * 분석 실패·사진 거르기 걸림도 대상. 응답 전에 쓴다(v2는 응답 뒤 작업이 잘릴 수 있다).
 * analyzePhoto는 동의로 막지 않는다 — 1.0.9·1.0.10·웹이 같은 함수를 쓴다. 기록만 한다.
 */

// ── 6. 탈퇴(2줄, functions/src/delete-account.ts에 더한다) ──────────────────────
/*
 * 순서: ① private/consent 삭제(새 저장 차단) ② 원장에서 이 계정의 review.photoPath 모으기(원장 지우기 전에)
 *       ③ Firestore recursiveDelete + 원장 삭제(지금 코드) ④ Storage — accountNotePhotoPrefix 전부 + ②의 경로들.
 * ④ 일부 실패 = 500(탈퇴 성공 아님). 지금 코드는 ③을 Promise.all로 동시에 지우니 순서를 세워야 한다.
 */
