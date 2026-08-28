import { useRef, useState } from 'react';

import type { SolveMethodId } from '@/data/diagnosisTree';
import { logEvent } from '@/features/analytics/log-event';

import { downscaleToDataUrl, pickPhoto, requestAnalyze } from '../flow/analyze-photo-request';
import { askPhotoSource } from '../flow/ask-photo-source';
import { mistakeTypeFix, mistakeTypeLabel } from '../flow/mistake-types';
import { readCheckQuiz, readRetryQuiz } from '../flow/quiz-guard';
import { weaknessCandidatesFor } from '../flow/weakness-mistake-type-map';
import {
  canPointAtError,
  filterCandidates,
  matchMethodsByKeywords,
  methodLabel,
  routeFromAnalysis,
  selectableMethodIds,
  type PhotoRoute,
} from '../flow/route-from-analysis';
import type {
  AnalyzePhotoResult,
  MistakeTypeId,
  PhotoAction,
  RetryResult,
} from '../types';
import { usePhotoThread, type PhotoThread } from './use-photo-thread';

/** 오답노트를 채우는 데 필요한, 대화가 진행되며 쌓인 것 */
type NoteContext = {
  methodId: SolveMethodId;
  mistakeType: MistakeTypeId;
  checkPassed: boolean;
};

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
  // 아래 둘은 state가 아니라 ref다 — 흐름 함수들의 클로저는 최초 렌더에서 만들어져
  // 나중에 바뀐 state를 못 본다. 노트의 사진이 비는 게 그 증상이었다.
  const photoUriRef = useRef<string | null>(null);
  const methodIdRef = useRef<SolveMethodId | null>(null);
  const busyRef = useRef(false);

  const { say, mySay, showNote, ask } = thread;

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
      setImageUri(photo.uri);
      setStatus('analyzing');

      const imageDataUrl = await downscaleToDataUrl(photo);
      const result = await requestAnalyze(imageDataUrl);
      resultRef.current = result;

      logEvent('photo_analyzed', {
        success: true,
        method_id: result.predictedMethodId,
        has_solving_work: result.hasSolvingWork,
        needs_manual_selection: result.needsManualSelection,
        error_candidate_count: result.errorCandidates.length,
      });

      setStatus('chat');
      runRoute(routeFromAnalysis(result));
    } catch (caught) {
      if (submitted) logEvent('photo_analyzed', { success: false });
      setStatus('upload');
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      busyRef.current = false;
    }
  }

  function restart() {
    resultRef.current = null;
    photoUriRef.current = null;
    methodIdRef.current = null;
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
    methodIdRef.current = methodId;
    if (canPointAtError(result, methodId)) {
      startPointing(0);
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

  function candidateAt(index: number) {
    return resultRef.current?.errorCandidates?.[index];
  }

  /** 짚기 사다리: 1번 → 2번("하나 더 걸리는 데 있었는데") → 느낌 설문. 세 번째 시도는 없다. */
  function startPointing(index: number) {
    const candidate = candidateAt(index);
    if (!candidate) {
      say(
        '음, 그럼 내 눈에 보이는 데는 아니었나 보네. 각도를 바꿔보자 — 풀면서 느낌상 뭐가 제일 걸렸어?',
      );
      stopHere('느낌 설문');
      return;
    }

    if (index === 0) {
      say('그럼 풀이를 좀 더 보자.');
      say(`여기 — "${candidate.quote}" 쓴 부분. 여기서 틀린 것 같아. 맞아?`);
    } else {
      say(`그래? 그럼 하나 더 걸리는 데가 있었는데 — "${candidate.quote}" 쓴 줄. 여기 아니야?`);
    }

    ask([
      {
        label: index === 0 ? '맞아, 거기서 틀렸어' : '맞아, 거기야',
        kind: 'primary',
        onPress: () => {
          mySay('맞아, 거기야');
          showWhy(index);
        },
      },
      {
        label: index === 0 ? '아니야, 거기 아니야' : '아니야',
        kind: 'ghost',
        onPress: () => {
          mySay('아니야');
          startPointing(index + 1);
        },
      },
    ]);
  }

  function showWhy(index: number) {
    const candidate = candidateAt(index);
    if (!candidate) return;
    say(candidate.why);
    ask([{ label: '그렇구나, 확인해볼래', kind: 'primary', onPress: () => showCheck(index) }]);
  }

  function showCheck(index: number) {
    const candidate = candidateAt(index);
    if (!candidate) return;
    const context = (passed: boolean): NoteContext => ({
      methodId: (methodIdRef.current ?? resultRef.current?.predictedMethodId) as SolveMethodId,
      mistakeType: candidate.mistakeType,
      checkPassed: passed,
    });

    const quiz = readCheckQuiz(candidate);
    if (!quiz) {
      // 보기·정답이 깨져 온 날은 쪽지시험을 조용히 건너뛴다 — 노트는 그래도 나온다
      startRetry(index, context(false));
      return;
    }

    // "노트 완성" 예고 — 문답이 노동이 아니라 결과물을 만드는 과정임을 먼저 말한다
    if (quiz.setup) {
      say(`그럼 진짜 아는지 보자 — 이거 통과하면 오늘 오답노트 완성이야. ${quiz.setup}`);
      say(quiz.prompt);
    } else {
      say(`그럼 진짜 아는지 보자 — 이거 통과하면 오늘 오답노트 완성이야. ${quiz.prompt}`);
    }

    ask(
      quiz.options.map((option, i) => ({
        label: option,
        onPress: () => {
          mySay(option);
          const passed = i === quiz.answerIndex;
          if (passed) {
            say('그렇지. 이제 이 자리에서는 안 틀리겠네.');
          } else {
            // 재시험 없음 — 한 번만 더 짚고 넘어간다 (늘어지면 귀찮음 축 침범)
            say(`아직 헷갈리는구나. 정답은 "${quiz.options[quiz.answerIndex]}" — 아까랑 같은 원리야.`);
          }
          startRetry(index, context(passed));
        },
      })),
    );
  }

  function startRetry(index: number, context: NoteContext) {
    const quiz = readRetryQuiz(candidateAt(index));
    if (!quiz) {
      showWrongNote(index, context, 'none');
      return;
    }

    // 쪽지를 틀린 학생에게만 한 템포 — 오답 직후 연타 방지. 맞힌 학생은 빠르게 (귀찮음 축)
    say(
      context.checkPassed
        ? '그럼 진짜 마지막 — 아까 그 자리, 새 숫자로 한 번만 다시 밟아보자.'
        : '괜찮아, 헷갈리라고 있는 자리야. 마지막으로 딱 한 번만 — 새 숫자로 가보자.',
    );
    say(`${quiz.setup}\n${quiz.prompt}`);

    ask([
      ...quiz.options.map((option, i) => ({
        label: option,
        onPress: () => {
          mySay(option);
          if (i === quiz.answerIndex) {
            say('그렇지! 아까 무너진 그 자리, 이번엔 통과했어.');
            showWrongNote(index, context, 'pass');
          } else {
            say(`아깝다 — 정답은 "${quiz.options[quiz.answerIndex]}". 아까랑 같은 원리야.`);
            showWrongNote(index, context, 'fail'); // 재시도 없음
          }
        },
      })),
      {
        label: '지금은 넘어갈래',
        kind: 'ghost' as const,
        onPress: () => {
          mySay('지금은 넘어갈래');
          showWrongNote(index, context, 'skip');
        },
      },
    ]);
  }

  /** 흐름의 결과물. 학생이 한 글자도 안 썼는데 채워져 나오는 노트 한 장. */
  function showWrongNote(index: number, context: NoteContext, retryResult: RetryResult) {
    const candidate = candidateAt(index);
    const now = new Date();
    // 통역표 첫 호출부. 못 찾으면 빈 배열이고, 그게 진단 트리가 얕은 자리다 (186칸 중 131칸).
    const weaknessIds = weaknessCandidatesFor(context.methodId, context.mistakeType);

    // 1.0.8이 재려는 숫자. 빈손(0개)도 반드시 남긴다 — 안 남기면 "몇 %"의 분모가 사라진다.
    logEvent('photo_weakness_labeled', {
      method_id: context.methodId,
      mistake_type: context.mistakeType,
      weakness_count: weaknessIds.length,
      labeled: weaknessIds.length > 0,
    });

    say('자, 이게 오늘 네 오답노트야 — 네 손으로 적은 건 한 줄도 없지.');
    showNote({
      dateLabel: `${now.getMonth() + 1}/${now.getDate()}`,
      photoUri: photoUriRef.current,
      quote: candidate?.quote ?? '',
      why: candidate?.why ?? '',
      // 짚기가 성공한 경로에선 AI의 처방을, 비었으면 유형별 통조림을 쓴다
      fix: candidate?.fix || mistakeTypeFix(context.mistakeType),
      methodLabel: methodLabel(context.methodId),
      typeLabel: mistakeTypeLabel(context.mistakeType),
      weaknessIds,
      checkPassed: context.checkPassed,
      retryResult,
    });

    // web-proto는 이 뒤에 개인화 망각곡선이 붙는다 — 다음 조각
    say('여기까지가 오늘 만든 데야. 다음 조각은 이 노트 뒤에 붙는 망각곡선이고.');
    ask([{ label: '처음부터 다시', kind: 'ghost', onPress: restart }]);
  }

  /** 아직 안 만든 갈래로 갈 차례였을 때, 어디로 갈 차례였는지만 정직하게 말한다. */
  function stopHere(nextPiece: string) {
    say(`(여기까지가 오늘 만든 조각이야. 다음은 "${nextPiece}"로 이어져.)`);
    ask([{ label: '처음부터 다시', kind: 'ghost', onPress: restart }]);
  }

  return { status, imageUri, error, thread, start, restart };
}
