import { useRef, useState } from 'react';

import type { SolveMethodId } from '@/data/diagnosisTree';

import { downscaleToDataUrl, pickPhoto, requestAnalyze } from '../flow/analyze-photo-request';
import {
  canPointAtError,
  filterCandidates,
  matchMethodsByKeywords,
  methodLabel,
  routeFromAnalysis,
  selectableMethodIds,
  type PhotoRoute,
} from '../flow/route-from-analysis';
import type { AnalyzePhotoResult, PhotoAction } from '../types';
import { usePhotoThread, type PhotoThread } from './use-photo-thread';

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
 * 사진 흐름 전체. web-proto app.js의 흐름 함수들을 그대로 옮긴 자리 —
 * 문구·분기·순서는 그쪽이 원본이고 여기서 새로 정하지 않는다.
 *
 * 오늘 만든 조각은 **방법 확정까지**다. 짚어주는 대화·쪽지시험·재도전·오답노트는 다음 조각.
 */
export function usePhotoFlow(): PhotoFlow {
  const thread = usePhotoThread();
  const [status, setStatus] = useState<PhotoFlowStatus>('upload');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 주머니: analyzePhoto 원샷 결과 전체. 방법이 뒤집히면 오류 진단은 무효가 된다. */
  const resultRef = useRef<AnalyzePhotoResult | null>(null);
  const busyRef = useRef(false);

  const { say, mySay, ask } = thread;

  async function start() {
    if (busyRef.current) return; // 두 번 눌러 vision이 두 번 도는 것(이중 과금) 방지
    busyRef.current = true;
    setError(null);
    try {
      const photo = await pickPhoto();
      if (!photo) return; // 취소
      setImageUri(photo.uri);
      setStatus('analyzing');

      const imageDataUrl = await downscaleToDataUrl(photo);
      const result = await requestAnalyze(imageDataUrl);
      resultRef.current = result;

      setStatus('chat');
      runRoute(routeFromAnalysis(result));
    } catch (caught) {
      setStatus('upload');
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      busyRef.current = false;
    }
  }

  function restart() {
    resultRef.current = null;
    thread.clear();
    setImageUri(null);
    setError(null);
    setStatus('upload');
  }

  function runRoute(route: PhotoRoute) {
    switch (route.kind) {
      case 'retake':
        offerRetake();
        return;
      case 'assert':
        assertMethod(route.methodId, route.label, route.snippet);
        return;
      case 'soft-assert':
        softAssertMethod(route.methodId, route.label, route.snippet);
        return;
      case 'candidates':
        showCandidates(route.methodIds);
        return;
    }
  }

  /** 갈래 1: 단언 + 탈출구 */
  function assertMethod(methodId: SolveMethodId, label: string, snippet: string) {
    say(`풀이 읽었어. ${snippet ? `${snippet} — ` : ''}${label}(으)로 접근했네.`);
    say('그럼 여기서부터 같이 보자.');
    ask([
      {
        label: '맞아, 시작하자',
        kind: 'primary',
        onPress: () => {
          mySay('맞아');
          confirmMethod(methodId);
        },
      },
      {
        label: '아니야, 다른 방법으로 풀었어',
        kind: 'ghost',
        onPress: () => {
          mySay('아니야');
          showTopicMethods(undefined, [methodId]);
        },
      },
    ]);
  }

  /** 갈래 2 중간 확신: 단정 대신 추측 확인 — "~같아. 맞아?" */
  function softAssertMethod(methodId: SolveMethodId, label: string, snippet: string) {
    say(`풀이에 ${snippet ? `"${snippet}" ` : ''}쓴 게 보이던데 — ${label}(으)로 푼 것 같아. 맞아?`);
    ask([
      {
        label: '맞아',
        kind: 'primary',
        onPress: () => {
          mySay('맞아');
          confirmMethod(methodId);
        },
      },
      {
        label: '아니야, 다른 방법이야',
        kind: 'ghost',
        onPress: () => {
          mySay('아니야');
          // 거절된 1등은 후보에서 뺀다 — 거절한 게 또 뜨지 않게
          showCandidates(resultRef.current?.candidateMethodIds ?? [], undefined, [methodId]);
        },
      },
    ]);
  }

  /** 갈래 2: AI 후보 (최대 4개). 후보가 비면 전체를 쏟지 않고 주제로 좁힌다. */
  function showCandidates(
    candidateIds: SolveMethodId[],
    promptText?: string,
    excludeIds: SolveMethodId[] = [],
  ) {
    const candidates = filterCandidates(candidateIds, excludeIds);
    if (candidates.length === 0) {
      showTopicMethods(promptText, excludeIds);
      return;
    }
    say(promptText ?? '풀이를 봤는데 확실하지 않아. 이 중에 어떤 방법이었어?');
    ask([
      ...candidates.map(methodButton),
      {
        label: '이 중엔 없어',
        kind: 'ghost',
        onPress: () => showTopicMethods(undefined, [...excludeIds, ...candidates]),
      },
    ]);
  }

  /** 후보를 못 좁혔을 때: 읽은 풀이 내용의 주제로 상위 5개만 */
  function showTopicMethods(promptText?: string, excludeIds: SolveMethodId[] = []) {
    const source = [resultRef.current?.transcription, resultRef.current?.reason]
      .filter(Boolean)
      .join(' ');
    const matched = matchMethodsByKeywords(source).filter((id) => !excludeIds.includes(id));
    if (matched.length === 0) {
      showAllMethods(excludeIds);
      return;
    }
    say(promptText ?? '네가 푼 방식이랑 비슷해 보이는 방법들이야. 이 중에 있어?');
    ask([
      ...matched.map(methodButton),
      {
        label: '여기에도 없어',
        kind: 'ghost',
        onPress: () => showAllMethods([...excludeIds, ...matched]),
      },
    ]);
  }

  /**
   * 마지막 폴백.
   * web-proto는 여기서 학생이 자기 말로 적으면 diagnoseMethod(AI)가 방법을 찾아준다 —
   * 그 경로는 서버 호출이 하나 더 붙어서 다음 조각으로 미뤘다. 지금은 막다른 길만 없앤다.
   */
  function showAllMethods(excludeIds: SolveMethodId[] = []) {
    const rest = selectableMethodIds.filter((id) => !excludeIds.includes(id));
    say('그럼 전체에서 골라볼래?');
    ask(rest.map(methodButton));
  }

  function methodButton(id: SolveMethodId): PhotoAction {
    return {
      label: methodLabel(id),
      onPress: () => {
        mySay(methodLabel(id));
        confirmMethod(id);
      },
    };
  }

  /** 갈래 3: 풀이 흔적 없음 → 다시 찍기 유도 */
  function offerRetake() {
    say(
      '사진에서 풀이 과정을 못 찾았어. 혹시 종이에 풀었으면, 풀이까지 나오게 다시 찍어줄래? 그러면 어디서 틀렸는지 내가 직접 짚어줄 수 있어.',
    );
    say('머리로 푼 거면 괜찮아 — 어떤 방법으로 풀었는지만 알려줘.');
    ask([
      { label: '📷 풀이까지 나오게 다시 찍기', kind: 'primary', onPress: restart },
      {
        label: '✏️ 내가 방법 고를게',
        kind: 'ghost',
        onPress: () => showTopicMethods('어떤 방법으로 풀었는지 골라줄래?'),
      },
    ]);
  }

  /** 방법 확정의 단일 관문. 주머니 일치 + 자신감 통과 → 짚기, 아니면 설문. */
  function confirmMethod(methodId: SolveMethodId) {
    const result = resultRef.current;
    if (canPointAtError(result, methodId)) {
      say('좋아. 그럼 풀이를 좀 더 보자 — 여기서부터 틀린 데를 짚어줄게.');
      stopHere('짚어주는 대화');
      return;
    }
    if (result && result.predictedMethodId === methodId && result.hasSolvingWork) {
      // 방법은 맞는데 오류를 못 찾은 날 — 관찰을 솔직하게 보고한다
      say('그런데 좀 신기해 — 풀이 과정에서는 틀린 데를 못 찾았어. 과정은 맞게 간 것 같거든.');
      say('이러면 보통 마지막에 답을 옮겨 적을 때나 검산에서 새는 경우가 많아.');
      stopHere('느낌 설문');
      return;
    }
    stopHere('느낌 설문');
  }

  /** 오늘 만든 조각은 여기까지. 다음이 아직 없으니 어디로 갈 차례였는지만 정직하게 말한다. */
  function stopHere(nextPiece: string) {
    say(`(여기까지가 오늘 만든 조각이야. 다음은 "${nextPiece}"로 이어져.)`);
    ask([{ label: '처음부터 다시', kind: 'ghost', onPress: restart }]);
  }

  return { status, imageUri, error, thread, start, restart };
}
