import type { SolveMethodId } from '@/data/diagnosisTree';

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
  errorCandidates: unknown[];
  errorConfidence: number;
};

/**
 * 대화에 쌓이는 한 칸. 밑으로만 쌓이고 지워지지 않는다 — 대화 자체가 상태다.
 * paras가 배열인 이유: 연달아 나오는 코치 말은 새 말풍선을 만들지 않고 문단으로 이어 붙인다
 * (한 생각 = 한 덩어리). web-proto app.js의 coachSays와 같은 규칙.
 */
export type PhotoBubble =
  | { id: number; kind: 'coach'; paras: string[]; ask: boolean }
  | { id: number; kind: 'me'; paras: string[] };

/** 하단 버튼. 하나를 누르면 통째로 갈아끼운다. */
export type PhotoAction = {
  label: string;
  kind?: 'primary' | 'ghost';
  onPress: () => void;
};
