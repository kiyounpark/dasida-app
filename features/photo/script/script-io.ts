// 공용 대본이 화면·저장·전송과 만나는 자리. 대본은 이 타입만 안다 — 그리는 법은 웹(app.js)·앱(훅)이 각자.
// 설계 docs/research/2026-10-01-b-shared-script-design.md §1.3
import type { WeaknessId } from '@/data/diagnosisMap';
import type { SolveMethodId } from '@/data/diagnosisTree';

import type { DiagnoseMethodResult } from '../flow/diagnose-method-request';
import type { QuizVerdict, QuizVerifyBody } from '../flow/verify-quiz-request';
import type { AnalyzePhotoResult, MistakeTypeId, PhotoAction, RetryResult } from '../types';
import type { ScriptEvent } from './script-events';

/** 웹 retryResult 'unverified'(검산 통과 못 한 재도전)는 앱 RetryResult에 없다 — 저장 땐 앱 어댑터가 'none'으로 */
export type ScriptRetryResult = RetryResult | 'unverified';
/** 쪽지시험 — 'skip'은 학생이 안 본 것(검산에서 빠짐·문제가 깨져 옴). 실패가 아니다 */
export type CheckResult = 'pass' | 'fail' | 'skip';

/** 노트 카드에 들어갈 것 전부(날것 — 수식 포매터는 그릴 때). id·createdAt·schemaVersion은 앱 어댑터가 붙인다 */
export type NoteView = {
  dateLabel: string;
  photoUri: string | null;
  /** ''이면 카드에 '(없음)' */
  quote: string;
  why: string;
  fix: string;
  methodId: SolveMethodId;
  mistakeType: MistakeTypeId;
  methodLabel: string;
  typeLabel: string;
  weaknessIds: WeaknessId[];
  primaryWeaknessId: WeaknessId | null;
  checkResult: CheckResult;
  retryResult: ScriptRetryResult;
  /** 📌 "수능장에서 이 풀이를 생각해 낼 수 있는가…" 접기 줄 — 웹·앱 둘 다 (🔒 10.01 갈림길 ①) */
  askLine: boolean;
};

/** 설문 결말 카드. 저장 안 함(🔒 10.01 갈림길 ③). 라벨은 웹 곡선이 쓴다 */
export type WeaknessCardView = {
  /** 전체 목록의 [잘 모르겠어]로 왔으면 null */
  methodId: SolveMethodId | null;
  mistakeType: MistakeTypeId;
  methodLabel: string;
  typeLabel: string;
  title: string;
  body: string;
};

export type ScriptEnding =
  | { kind: 'note'; variant: 'success' | 'fail'; note: NoteView }
  | { kind: 'weakness'; card: WeaknessCardView }
  /** "오늘은 여기까지" → "알겠어…" 뒤. 웹은 버튼 없이, 앱은 [처음부터 다시] */
  | { kind: 'closed' };

/** 다시 찍기 — restart는 처음부터(이어 붙이지 않음), retake_from_gate는 거르기에 걸린 사진의 번호를 잇는다 */
export type ScriptEffect = 'restart' | 'retake_from_gate';

/** 방법을 학생 말로 받는 입력칸. 버튼(PhotoAction)과 따로 — 둘 중 하나만 뜬다 */
export type TextPrompt = {
  placeholder: string;
  maxLength: number;
  submitLabel: string;
  /** 앞뒤 공백을 걷은, 빈 문자열이 아닌 글자만 넘긴다 — 빈 값은 어댑터가 막는다 */
  onSubmit: (text: string) => void;
};

export type ScriptIO = {
  say: (text: string) => void;
  mySay: (text: string) => void;
  /** 버튼을 통째로 갈아끼운다. 누른 순간 버튼부터 비우는 건 어댑터 */
  ask: (actions: PhotoAction[]) => void;
  /** 입력칸. 보낸 순간 입력칸부터 비우는 것도 어댑터 */
  askText: (prompt: TextPrompt) => void;
  showNote: (note: NoteView) => void;
  showWeaknessCard: (card: WeaknessCardView) => void;
  end: (ending: ScriptEnding) => void;
  run: (effect: ScriptEffect) => void;
  log: (event: ScriptEvent) => void;
};

export type ScriptDeps = {
  /** 절대 안 던진다(verify-quiz-request.ts) */
  verifyQuiz: (body: QuizVerifyBody) => Promise<QuizVerdict>;
  /** 실패·오프라인 = null. 안 던진다 */
  diagnoseMethod: (rawText: string) => Promise<DiagnoseMethodResult | null>;
  submissionId: string | null;
  qa: boolean;
  photoUri: string | null;
  /** 노트 날짜 — 테스트에서 고정 */
  now?: () => Date;
  profile: {
    /** 약점 후보가 둘 이상이면 노트 전에 학생한테 묻는다 — 앱만(🔒 08.11·09.20, 웹엔 고른 값을 둘 곳이 없다) */
    picksWeakness: boolean;
    /** false면 입력칸 대신 전체 목록 버튼으로 간다(앱 ④를 자를 때만) */
    textInput: boolean;
  };
};

export type PhotoScript = {
  /** 분석 결과가 닿은 순간. 거르기·풀이 없음도 여기로 */
  start: (result: AnalyzePhotoResult) => void;
  /** 새 사진·처음부터 다시·화면 이탈. 이 뒤에 깨어난 await는 아무것도 안 한다(출력·로그·저장·효과 전부) */
  dispose: () => void;
};
