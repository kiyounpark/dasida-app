import type { WeaknessId } from '@/data/diagnosisMap';
import type { SolveMethodId } from '@/data/diagnosisTree';

/** functions/src/analyze-photo-core.ts의 MISTAKE_TYPE_IDS와 같은 순서·같은 값 */
export const MISTAKE_TYPE_IDS = [
  'concept_gap',
  'formula_recall',
  'setup_error',
  'calc_slip',
  'procedure_miss',
  'answer_read',
] as const;

export type MistakeTypeId = (typeof MISTAKE_TYPE_IDS)[number];

/** AI가 짚은 오류 후보 하나. 원본은 functions/src/analyze-photo-core.ts의 ErrorCandidate. */
export type ErrorCandidate = {
  quote: string; // 학생이 실제 쓴 줄 인용
  why: string; // 왜 틀렸는지
  mistakeType: MistakeTypeId;
  fix: string; // 학생 맞춤 처방 한 줄
  checkSetup?: string; // 쪽지시험 상황 칸 — 질문이 그 자체로 완결이면 없다
  checkPrompt: string;
  checkOptions: string[];
  checkAnswerIndex: number;
  retrySetup?: string;
  retryPrompt?: string;
  retryOptions?: string[];
  retryAnswerIndex?: number;
};

/**
 * analyzePhoto(Cloud Functions) 응답.
 * 원본은 functions/src/analyze-photo-core.ts의 PhotoRouterResult — functions가 별도 패키지라
 * 타입을 가져올 수 없어 같은 모양을 여기 둔다. 서버 응답이 바뀌면 이 파일도 같이 고칠 것.
 */
export type AnalyzePhotoResult = {
  hasSolvingWork: boolean;
  userAnswer: string | null;
  transcription: string;
  predictedMethodId: SolveMethodId;
  confidence: number;
  candidateMethodIds: SolveMethodId[];
  reason: string;
  needsManualSelection: boolean;
  errorCandidates: ErrorCandidate[];
  errorConfidence: number;
};

/** 재도전까지 마친 결과 — 오답노트의 '오늘 확인' 칸에 들어간다 */
export type RetryResult = 'pass' | 'fail' | 'skip' | 'none';

/**
 * 오답노트 한 장. "진단 결과"가 아니라 학생이 아는 양식(내 풀이 / 갈라진 지점 / 왜 / 다음엔)이
 * 자기 손글씨 사진과 함께, 한 글자도 안 썼는데 채워져 나온다. 정답 칸은 없다.
 */
export type PhotoNote = {
  /** 노트를 만든 날 (예: '8/1') — 만드는 시점에 찍어 둔다 */
  dateLabel: string;
  photoUri: string | null;
  quote: string;
  why: string;
  fix: string;
  methodLabel: string;
  typeLabel: string;
  /**
   * 통역표가 (풀이법, 실수 유형)으로 찾아준 약점들. 빈 배열이면 못 찾은 것 — 카드에 줄 자체가 안 뜬다.
   * 하나로 안 좁혀지는 5개 조합은 여럿이 그대로 담긴다 (고르는 건 저장 경로 붙일 때 학생한테 물어본다, 08.11 🔒).
   */
  weaknessIds: WeaknessId[];
  checkPassed: boolean;
  retryResult: RetryResult;
};

/**
 * 대화에 쌓이는 한 칸. 밑으로만 쌓이고 지워지지 않는다 — 대화 자체가 상태다.
 * paras가 배열인 이유: 연달아 나오는 코치 말은 새 말풍선을 만들지 않고 문단으로 이어 붙인다
 * (한 생각 = 한 덩어리). web-proto app.js의 coachSays와 같은 규칙.
 */
export type PhotoBubble =
  | { id: number; kind: 'coach'; paras: string[]; ask: boolean }
  | { id: number; kind: 'me'; paras: string[] }
  | { id: number; kind: 'note'; note: PhotoNote };

/** 하단 버튼. 하나를 누르면 통째로 갈아끼운다. */
export type PhotoAction = {
  label: string;
  kind?: 'primary' | 'ghost';
  onPress: () => void;
};
