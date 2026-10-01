import { useEffect, useRef, useState } from 'react';

import type { EventName } from '@/features/analytics/event-types';
import { logEvent } from '@/features/analytics/log-event';
import { spawnMistakeReviewTasks } from '@/features/learning/review-scheduler';
import type { ReviewTaskStore } from '@/features/learning/review-task-store';

import {
  downscaleToDataUrl,
  newSubmissionId,
  pickPhoto,
  requestAnalyze,
} from '../flow/analyze-photo-request';
import { askPhotoSource } from '../flow/ask-photo-source';
import { requestDiagnoseMethod } from '../flow/diagnose-method-request';
import { requestQuizVerify } from '../flow/verify-quiz-request';
import { savePhotoNote } from '../note-store';
import { persistNotePhoto } from '../photo-file-store';
import { createPhotoScript } from '../script/photo-script';
import type { ScriptEvent } from '../script/script-events';
import type { NoteView, PhotoScript, ScriptIO } from '../script/script-io';
import type { PhotoNote } from '../types';
import { usePhotoThread, type PhotoThread } from './use-photo-thread';

/** 대본 이벤트 → 앱 GA 이름. 의미는 공용, 이름은 앱 것(photo_*) — 웹은 같은 이벤트를 원래 이름으로 보낸다 */
const APP_EVENT_NAME = {
  method_confirm: 'photo_method_confirm',
  error_point_react: 'photo_error_point_react',
  quiz_verify: 'photo_quiz_verify',
  check_answer: 'photo_check_answer',
  survey_pick: 'photo_survey_pick',
  weakness_card_shown: 'photo_weakness_card_shown',
  note_shown: 'photo_note_shown',
  weakness_labeled: 'photo_weakness_labeled',
  weakness_picked: 'photo_weakness_picked',
} as const satisfies Record<ScriptEvent['name'], EventName>;

function logScriptEvent({ name, ...params }: ScriptEvent) {
  // 칸 모양은 script-events.ts와 event-types.ts에 같게 적혀 있다 — 이름만 바꿔 보낸다
  logEvent(APP_EVENT_NAME[name], params as never);
}

export type PhotoFlowStatus = 'upload' | 'analyzing' | 'chat';

export type PhotoFlow = {
  status: PhotoFlowStatus;
  imageUri: string | null;
  error: string | null;
  thread: PhotoThread;
  /** 사진 고르기 → 축소 → 분석 → 대화 시작 */
  start: () => void;
  /** 처음(업로드 화면)으로 */
  restart: () => void;
};

/**
 * 사진 흐름 — 업로드·분석·저장·복습 과제만 여기 있다. 대화(무슨 말 · 어떤 버튼 · 누르면 어디로)는
 * 웹과 같은 대본 모듈(features/photo/script)이 정하고, 이 훅은 그걸 화면·저장에 잇는 어댑터다 (B, 10.01).
 *
 * accountKey는 화면이 위에서 내려준다. 훅이 직접 useCurrentLearner를 부르지 않는 이유:
 * 사진 화면 테스트가 프로바이더 없이 화면을 그리는데, 훅 안에서 부르면 그게 전부 죽는다.
 * 키가 없으면(테스트·아직 세션이 안 붙은 순간) 저장만 건너뛰고 흐름은 그대로 돈다.
 */
export function usePhotoFlow({
  accountKey,
  reviewTaskStore,
  getRemoteAuthHeaders,
}: {
  accountKey?: string | null;
  reviewTaskStore?: ReviewTaskStore | null;
  /** 사진 분석 요청에 싣는 계정 헤더(사용량 원장). 안 던진다 — remote-auth-headers.ts */
  getRemoteAuthHeaders?: ((accountKey: string) => Promise<Record<string, string>>) | null;
} = {}): PhotoFlow {
  const thread = usePhotoThread();
  const [status, setStatus] = useState<PhotoFlowStatus>('upload');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // state가 아니라 ref다 — 대본의 클로저는 대화를 시작한 렌더에서 만들어져 나중에 바뀐 state를 못 본다
  const photoUriRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  /** 지금 사진의 번호 — 사진을 고를 때마다 새로. 원장과 검산 로그가 이 값으로 잇는다 */
  const submissionIdRef = useRef<string | null>(null);
  /** 거르기에 걸려 [다시 찍기]로 왔으면 직전 번호. 처음부터 다시(restart)는 안 잇는다 (web-proto와 같은 규칙) */
  const retakeOfRef = useRef<string | null>(null);
  const scriptRef = useRef<PhotoScript | null>(null);

  // 헤더 뒤로가기(app/_layout.tsx)로 떠나면 언마운트된다 — 깨어난 검산 대기가 노트를 저장하고
  // 복습 과제를 만들지 않게 대본을 끊는다 (astra 4 — 1.0.10까지 있던 구멍)
  useEffect(
    () => () => {
      scriptRef.current?.dispose();
      scriptRef.current = null;
    },
    [],
  );

  async function start() {
    if (busyRef.current) return; // 두 번 눌러 vision이 두 번 도는 것(이중 과금) 방지
    busyRef.current = true;
    setError(null);
    // 사진을 실제로 고른 뒤에 터진 실패만 '분석 실패'로 센다.
    // 사진첩 자체가 못 열린 건 학생이 시도조차 못 한 것이라 분모에 넣으면 안 된다.
    let submitted = false;
    try {
      const source = await askPhotoSource();
      if (!source) return; // 묻는 창에서 취소

      const photo = await pickPhoto(source);
      if (!photo) return; // 카메라·사진첩에서 취소
      submitted = true;
      logEvent('photo_submit', { source });
      photoUriRef.current = photo.uri;
      submissionIdRef.current = newSubmissionId();
      setImageUri(photo.uri);
      setStatus('analyzing');

      // 헤더는 사진 줄이는 동안 같이 받는다 — 토큰 갱신 시간이 축소 시간에 숨는다. getRemoteAuthHeaders는 안 던진다
      const headersPromise = accountKey && getRemoteAuthHeaders ? getRemoteAuthHeaders(accountKey) : Promise.resolve({});
      const imageDataUrl = await downscaleToDataUrl(photo);
      // qa: 개발 빌드 사진은 서버 원장에서 빼고 센다. 스토어 빌드로 기윤이 돌린 건 집계 때 계정으로 뺀다
      const result = await requestAnalyze(imageDataUrl, {
        headers: await headersPromise,
        qa: __DEV__,
        submissionId: submissionIdRef.current,
        retakeOf: retakeOfRef.current,
      });

      logEvent('photo_analyzed', {
        success: true,
        method_id: result.predictedMethodId,
        has_solving_work: result.hasSolvingWork,
        needs_manual_selection: result.needsManualSelection,
        error_candidate_count: result.errorCandidates.length,
        gate_decision: result.gate?.decision ?? 'none',
      });

      setStatus('chat');
      scriptRef.current?.dispose();
      scriptRef.current = createPhotoScript(makeAppIO(), {
        verifyQuiz: requestQuizVerify,
        diagnoseMethod: (text) => requestDiagnoseMethod(text, { problemId: 'photo-flow-app' }),
        submissionId: submissionIdRef.current,
        qa: __DEV__,
        photoUri: photoUriRef.current,
        // 약점 후보가 둘 이상이면 노트 전에 묻는다 — 앱만(🔒 08.11·09.20). 입력칸은 ④(커밋 6)부터
        profile: { picksWeakness: true, textInput: false },
      });
      scriptRef.current.start(result);
    } catch (caught) {
      if (submitted) logEvent('photo_analyzed', { success: false });
      setStatus('upload');
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      busyRef.current = false;
    }
  }

  function restart() {
    retakeOfRef.current = null;
    resetToUpload();
  }

  /**
   * 거르기 화면의 [다시 찍기]. 처음부터 다시와 같지만 직전 번호를 retakeOf로 넘긴다 —
   * 원장이 "걸린 학생이 다시 찍어 왔나"를 이 값으로 센다 (web-proto resetUpload).
   */
  function retakeFromGate() {
    retakeOfRef.current = submissionIdRef.current;
    resetToUpload();
  }

  function resetToUpload() {
    scriptRef.current?.dispose(); // 기다리던 검산·diagnose가 새 대화를 덮지 않게
    scriptRef.current = null;
    photoUriRef.current = null;
    submissionIdRef.current = null;
    thread.clear();
    setImageUri(null);
    setError(null);
    setStatus('upload');
  }

  /** 화면이 끝나는 자리의 공통 마무리 — 노트·약점 카드·"오늘은 여기까지" 모두 */
  function endHere() {
    thread.ask([{ label: '처음부터 다시', kind: 'ghost', onPress: restart }]);
  }

  /**
   * 노트 한 장을 띄우고 저장한다. 학생이 한 글자도 안 썼는데 채워져 나온다.
   * 대본은 답(약점 고르기)을 받은 뒤에만 부른다 — savePhotoNote가 읽고-전체-쓰기라 두 번 저장이 서로를 덮는다.
   */
  function showNote(view: NoteView) {
    const createdAt = new Date().toISOString();
    const noteId = `photo-${createdAt}`;
    // 사진첩이 준 건 캐시 경로라 시스템이 언제든 지운다. 남길 거면 지금 문서 폴더로 옮긴다.
    // 계정이 없으면 어차피 저장을 안 하므로 복사도 하지 않는다.
    const storedPhotoUri = accountKey && photoUriRef.current ? persistNotePhoto(noteId, photoUriRef.current) : null;

    const note: PhotoNote = {
      id: noteId,
      createdAt,
      schemaVersion: 1,
      dateLabel: view.dateLabel,
      // 화면엔 뭐라도 보여준다 — 복사가 실패해도 캐시본은 지금 이 순간엔 살아 있다.
      photoUri: storedPhotoUri ?? photoUriRef.current,
      quote: view.quote,
      why: view.why,
      fix: view.fix,
      methodLabel: view.methodLabel,
      typeLabel: view.typeLabel,
      methodId: view.methodId,
      mistakeType: view.mistakeType,
      // 후보는 안 줄인다. 고른 건 primary뿐이고, 나머지도 "그 칸에 있던 것"으로 남긴다.
      weaknessIds: view.weaknessIds,
      primaryWeaknessId: view.primaryWeaknessId,
      checkPassed: view.checkResult === 'pass',
      checkSkipped: view.checkResult === 'skip',
      // 검산을 통과 못 해 안 낸 재도전은 저장 모양에 없다 — 1.0.10과 같이 'none'(카드엔 재도전 칸이 빈다)
      retryResult: view.retryResult === 'unverified' ? 'none' : view.retryResult,
    };
    thread.showNote(note);

    // 저장은 카드를 띄운 뒤에, 기다리지 않고 건다 — 실패해도 학생이 보는 장면은 그대로다.
    // 저장본에는 옮겨진 경로만 남긴다 — 캐시 경로를 저장해 두면 며칠 뒤 깨진 사진 칸을 본다.
    if (accountKey) {
      void savePhotoNote(accountKey, { ...note, photoUri: storedPhotoUri });
    }

    // E칸 — 노트가 복습 과제가 된다. 약점이 하나로 정해진 노트만(후보 0개·"잘 모르겠어"는 과제 없음).
    // 원격 store는 서버가 거절하면 던지므로 여기서 받는다 — 과제가 실패해도 노트 장면은 그대로다.
    if (accountKey && reviewTaskStore && note.primaryWeaknessId) {
      spawnMistakeReviewTasks(accountKey, noteId, [note.primaryWeaknessId], reviewTaskStore, 'photo').catch(
        console.warn,
      );
    }
  }

  function makeAppIO(): ScriptIO {
    return {
      say: thread.say,
      mySay: thread.mySay,
      ask: thread.ask,
      askText: thread.askText,
      showNote,
      showWeaknessCard: thread.showWeaknessCard,
      // 노트·약점 카드·"오늘은 여기까지" 전부 [처음부터 다시]로 끝난다. 웹의 망각곡선은 앱엔 없다 —
      // 곡선의 "앱에서는 이걸 알림으로 해줘"가 앱 안에선 거짓이고, 그 약속의 실물이 복습 과제(E칸)다
      end: endHere,
      run: (effect) => (effect === 'restart' ? restart() : retakeFromGate()),
      log: logScriptEvent,
    };
  }

  return { status, imageUri, error, thread, start, restart };
}
