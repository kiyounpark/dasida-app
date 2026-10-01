/**
 * 사진 → 오답노트 대화의 대본(무슨 말 · 어떤 버튼 · 누르면 어디로). 웹(번들)과 앱(훅)이 같이 읽는다 —
 * 학생이 보는 글자는 여기서만 정한다. 그리기·사진·저장·전송은 ScriptIO 너머 각자.
 * 원본은 web-proto app.js 518~1177(B 이전). 규칙: react-native·expo·DOM import 금지.
 * 설계 docs/research/2026-10-01-b-shared-script-design.md
 */
import { diagnosisMethodRoutingCatalog } from '@/data/diagnosis-method-routing';
import { resolveWeaknessLabel, type WeaknessId } from '@/data/diagnosisMap';
import type { SolveMethodId } from '@/data/diagnosisTree';

import { ro } from '../flow/korean-particle';
import { mistakeTypeFix, mistakeTypeLabel } from '../flow/mistake-types';
import { readCheckQuiz, readRetryQuiz } from '../flow/quiz-guard';
import {
  canPointAtError,
  filterCandidates,
  matchMethodsByKeywords,
  methodLabel,
  routeFromAnalysis,
  selectableMethodIds,
  TOPIC_TOP_N,
} from '../flow/route-from-analysis';
import { ANSWER_READ_HINT, surveyOptionsFor } from '../flow/survey-options';
import { weaknessCandidatesFor, weaknessChoiceText } from '../flow/weakness-mistake-type-map';
import type { AnalyzePhotoResult, MistakeTypeId, PhotoAction } from '../types';
import { createQuizVerifyRunner, type RunnerVerdict, type VerifyKind } from './quiz-verify-runner';
import type {
  CheckResult,
  PhotoScript,
  ScriptDeps,
  ScriptIO,
  ScriptRetryResult,
  WeaknessCardView,
} from './script-io';

/** 오답노트를 채우는 데 필요한, 대화가 진행되며 쌓인 것 */
type NoteContext = { methodId: SolveMethodId; mistakeType: MistakeTypeId; checkResult: CheckResult };

/**
 * 사진 거르기에 걸린 사진 — 왜 막혔는지 말하고 그 자리에서 다시 고르게 한다.
 * blocked_small: "너무 작아서"는 학생 폰 화면에선 멀쩡해 보여 "내 눈엔 안 작은데?"가 된다 — 반문을 첫마디로 막는다(10.01 기윤).
 */
const GATE_COPY: Record<string, { text: string; retake: string }> = {
  blocked_rotation: {
    text: '사진이 옆으로 누워 있어. 글씨가 바로 서게 세로로 다시 찍어줘 — 누운 채로는 네 풀이를 잘못 읽어.',
    retake: '📷 세로로 다시 찍기',
  },
  blocked_small: {
    text: '화면에선 괜찮아 보여도, 이 사진은 내가 글씨를 또렷하게 못 읽어. 캡처나 잘라낸 사진 말고, 찍은 원본을 올려줘.',
    retake: '다른 사진 올리기',
  },
};

const CLOSED_LINE = '알겠어. 다른 문제 생기면 또 올려줘.';

export function createPhotoScript(rawIO: ScriptIO, deps: ScriptDeps): PhotoScript {
  // 화면 이탈·새 사진 뒤엔 아무것도 안 나가게 — 깨어난 await와 남은 버튼 둘 다 여기서 막힌다
  let alive = true;
  const guard =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      if (alive) fn(...args);
    };
  const io: ScriptIO = {
    say: guard(rawIO.say),
    mySay: guard(rawIO.mySay),
    ask: guard(rawIO.ask),
    askText: guard(rawIO.askText),
    showNote: guard(rawIO.showNote),
    showWeaknessCard: guard(rawIO.showWeaknessCard),
    end: guard(rawIO.end),
    run: guard(rawIO.run),
    log: guard(rawIO.log),
  };
  const runner = createQuizVerifyRunner(deps.verifyQuiz, { submissionId: deps.submissionId, qa: deps.qa });
  const now = deps.now ?? (() => new Date());

  // 주머니: analyzePhoto 원샷 결과 전체. 방법이 뒤집히면 오류 진단은 무효.
  let pocket: AnalyzePhotoResult | null = null;
  // 읽은 풀이 내용 — 후보가 비었을 때 주제 좁히기의 재료. 학생이 직접 쓰면 그 말로 바뀐다
  let lastAnalysisText = '';
  // 학생 말로 물어본 횟수 — 2번 물어봐도 못 좁히면 전체 목록으로 (막다른 길 없음)
  let textAskCount = 0;

  function start(result: AnalyzePhotoResult) {
    const route = routeFromAnalysis(result);
    if (route.kind === 'gate') {
      offerRetakeForGate(route.decision);
      return;
    }
    pocket = result;
    lastAnalysisText = [result.transcription, result.reason].filter(Boolean).join(' ');
    runner.start(result);
    switch (route.kind) {
      case 'retake':
        offerRetake();
        return;
      case 'soft-assert':
        softAssertMethod(route.methodId, route.label, route.snippet);
        return;
      case 'candidates':
        showCandidateCards(route.methodIds);
        return;
      case 'assert':
        assertMethod(route.methodId, route.label, route.snippet);
        return;
    }
  }

  // 갈래 1: 단언 + 탈출구
  function assertMethod(methodId: SolveMethodId, label: string, snippet: string) {
    io.say(`풀이 읽었어. ${snippet ? `${snippet} — ` : ''}${ro(label)} 접근했네.`);
    io.say('그럼 여기서부터 같이 보자.');
    io.ask([
      {
        label: '맞아, 시작하자',
        kind: 'primary',
        onPress: () => {
          io.mySay('맞아');
          io.log({ name: 'method_confirm', answer: 'yes', mode: 'assert' });
          confirmMethod(methodId);
        },
      },
      {
        label: '아니야, 다른 방법으로 풀었어',
        kind: 'ghost',
        onPress: () => {
          io.mySay('아니야');
          io.log({ name: 'method_confirm', answer: 'no', mode: 'assert' });
          showTopicMethods(undefined, [methodId]);
        },
      },
    ]);
  }

  // 갈래 2 중간 확신: 단정 대신 추측 확인 — "~같아. 맞아?"
  function softAssertMethod(methodId: SolveMethodId, label: string, snippet: string) {
    io.say(`풀이에 ${snippet ? `"${snippet}" ` : ''}쓴 게 보이던데 — ${ro(label)} 푼 것 같아. 맞아?`);
    io.ask([
      {
        label: '맞아',
        kind: 'primary',
        onPress: () => {
          io.mySay('맞아');
          io.log({ name: 'method_confirm', answer: 'yes', mode: 'soft' });
          confirmMethod(methodId);
        },
      },
      {
        label: '아니야, 다른 방법이야',
        kind: 'ghost',
        onPress: () => {
          io.mySay('아니야');
          io.log({ name: 'method_confirm', answer: 'no', mode: 'soft' });
          // 거절된 1등은 후보에서 뺀다 — 거절한 게 또 뜨지 않게
          showCandidateCards(pocket?.candidateMethodIds ?? [], undefined, [methodId]);
        },
      },
    ]);
  }

  // 방법 확정의 단일 관문. 주머니 일치 + 자신감 통과 → 짚기, 아니면 설문.
  function confirmMethod(methodId: SolveMethodId) {
    if (canPointAtError(pocket, methodId)) {
      startPointing(0);
      return;
    }
    if (pocket && pocket.predictedMethodId === methodId && pocket.hasSolvingWork) {
      // 방법은 맞는데 오류를 못 찾은 날 — 관찰을 솔직하게 보고
      io.say('그런데 좀 신기해 — 풀이 과정에서는 틀린 데를 못 찾았어. 과정은 맞게 간 것 같거든.');
      io.say('이러면 보통 마지막에 답을 옮겨 적을 때나 검산에서 새는 경우가 많아.');
      showFeelingSurvey(methodId, '풀면서 느낌상 뭐가 걸렸어?', true);
      return;
    }
    showFeelingSurvey(methodId); // 방법 뒤집힘·풀이 없음: 주머니 무효
  }

  function methodButton(id: SolveMethodId): PhotoAction {
    return {
      label: methodLabel(id),
      onPress: () => {
        io.mySay(methodLabel(id));
        confirmMethod(id);
      },
    };
  }

  // 갈래 2: AI 후보 (최대 4개). 후보가 비면 전체를 쏟지 않고 주제로 좁힌다.
  function showCandidateCards(candidateIds: SolveMethodId[], promptText?: string, excludeIds: SolveMethodId[] = []) {
    const candidates = filterCandidates(candidateIds, excludeIds);
    if (candidates.length === 0) {
      showTopicMethods(promptText, excludeIds);
      return;
    }
    io.say(promptText ?? '풀이를 봤는데 확실하지 않아. 이 중에 어떤 방법이었어?');
    io.ask([
      ...candidates.map(methodButton),
      {
        label: '이 중엔 없어',
        kind: 'ghost',
        // 방금 보여준 후보는 다음 목록에서 뺀다 — 거절한 게 또 뜨지 않게
        onPress: () => showTopicMethods(undefined, [...excludeIds, ...candidates]),
      },
    ]);
  }

  // 후보를 못 좁혔을 때: 읽은 풀이 내용의 주제로 상위 N개만, 그래도 못 맞추면 학생 말로 받는다(전체 31개를 쏟지 않는다)
  function showTopicMethods(promptText?: string, excludeIds: SolveMethodId[] = []) {
    const matched = matchMethodsByKeywords(lastAnalysisText, TOPIC_TOP_N).filter((id) => !excludeIds.includes(id));
    if (matched.length === 0) {
      askMethodByText();
      return;
    }
    io.say(promptText ?? '네가 푼 방식이랑 비슷해 보이는 방법들이야. 이 중에 있어?');
    io.ask([
      ...matched.map(methodButton),
      { label: '여기에도 없어, 직접 쓸게', kind: 'ghost', onPress: () => askMethodByText() },
    ]);
  }

  // 학생 말로 받기: diagnoseMethod(AI)가 방법을 찾아 흐름에 잇는다
  function askMethodByText(promptText?: string) {
    if (!deps.profile.textInput) {
      showAllMethods();
      return;
    }
    io.say(promptText ?? '어떻게 풀었는지 짧게 알려줄래? 네 말 그대로 써도 돼.');
    io.askText({
      placeholder: '예: 근의 공식에 바로 대입했어',
      maxLength: 200,
      submitLabel: '보내기',
      onSubmit: (rawText) => {
        io.mySay(rawText);
        lastAnalysisText = rawText; // 이후 좁히기는 학생이 쓴 말을 재료로
        void routeFromText(rawText);
      },
    });
  }

  // 학생이 쓴 글 → AI 판별 → 흐름에 잇는다. AI 실패면 키워드, 2번 물어봐도 못 좁히면 전체 목록
  async function routeFromText(rawText: string) {
    textAskCount += 1;
    io.say('잠깐만, 읽어볼게…');

    const result = await deps.diagnoseMethod(rawText);
    if (!alive) return;

    // AI가 확신하면 그 방법의 흐름으로 바로
    if (result && !result.needsManualSelection && diagnosisMethodRoutingCatalog[result.predictedMethodId]) {
      io.say(`${ro(methodLabel(result.predictedMethodId))} 풀었구나. 그럼 여기서부터 같이 보자.`);
      confirmMethod(result.predictedMethodId);
      return;
    }

    // 애매하면 AI 후보로, AI 실패면 키워드로 후보
    const candidates = filterCandidates(
      result ? result.candidateMethodIds : matchMethodsByKeywords(rawText, TOPIC_TOP_N),
    );
    if (candidates.length > 0) {
      showCandidateCards(candidates, '이 중에 있어?');
      return;
    }

    if (textAskCount < 2) {
      askMethodByText('음… 잘 못 알아들었어. 어떤 공식이나 방법을 썼는지 조금만 더 자세히 알려줄래?');
      return;
    }
    showAllMethods();
  }

  // 마지막 수단: 전체 목록. 거기에도 없으면 [잘 모르겠어]로 방법 없이 설문
  function showAllMethods() {
    io.say('그럼 전체 목록에서 직접 골라볼래?');
    io.ask([
      ...selectableMethodIds.map(methodButton),
      {
        label: '잘 모르겠어',
        kind: 'ghost',
        onPress: () => {
          io.mySay('잘 모르겠어');
          showFeelingSurvey(null);
        },
      },
    ]);
  }

  // 갈래 3: 풀이 흔적 없음. 문제만 찍은 학생을 단언 갈래로 올리는 사다리
  function offerRetake() {
    io.say(
      '사진에서 풀이 과정을 못 찾았어. 혹시 종이에 풀었으면, 풀이까지 나오게 다시 찍어줄래? 그러면 어디서 틀렸는지 내가 직접 짚어줄 수 있어.',
    );
    io.say('머리로 푼 거면 괜찮아 — 어떤 방법으로 풀었는지 짧게만 알려줘.');
    io.ask([
      { label: '📷 풀이까지 나오게 다시 찍기', kind: 'primary', onPress: () => io.run('restart') },
      {
        label: '✏️ 직접 알려줄게',
        kind: 'ghost',
        onPress: () => askMethodByText('어떤 방법으로 풀었는지 짧게 알려줄래? 네 말 그대로 써도 돼.'),
      },
    ]);
  }

  function offerRetakeForGate(decision: string) {
    const copy = GATE_COPY[decision];
    if (!copy) {
      offerRetake(); // 서버가 새 걸림 이유를 먼저 내보낸 경우
      return;
    }
    io.say(copy.text);
    io.ask([
      { label: copy.retake, kind: 'primary', onPress: () => io.run('retake_from_gate') },
      { label: '오늘은 여기까지', kind: 'ghost', onPress: closeHere },
    ]);
  }

  function closeHere() {
    io.mySay('오늘은 여기까지');
    io.say(CLOSED_LINE);
    io.end({ kind: 'closed' });
  }

  // ── 오류 짚기 · 쪽지시험 · 노트 ──

  // 짚기(09.23 ⑤): 묻지 않고 말해준다. 틀린 자리를 모르는 학생은 "맞아?"에 [맞아]도 [아니야]도 못 누른다.
  // 그래서 확실히 답할 수 있는 것만 묻는다: 알겠나 / 모르겠나 / 그 글자를 내가 썼나. 2번 후보 사다리는 없다.
  function startPointing(idx: number) {
    const cand = pocket?.errorCandidates[idx];
    if (!pocket || !cand) {
      showFeelingSurvey(
        pocket?.predictedMethodId ?? null,
        '음, 그럼 내 눈에 보이는 데는 아니었나 보네. 각도를 바꿔보자 — 풀면서 느낌상 뭐가 제일 걸렸어?',
      );
      return;
    }
    io.say('그럼 풀이를 좀 더 보자.');
    io.say(`여기 — "${cand.quote}" 쓴 부분, 여기가 틀린 자리야.`);
    io.say(cand.why);
    // got_it은 "수긍"이지 적중 증명이 아니다(모르는 학생은 뭐든 수긍한다). 확실한 빗나감은 not_mine뿐
    io.ask([
      {
        label: '아, 이거였구나',
        kind: 'primary',
        onPress: () => {
          io.mySay('아, 이거였구나');
          io.log({ name: 'error_point_react', react: 'got_it' });
          void showCheck(idx, 'got_it');
        },
      },
      {
        label: '왜 틀린 건지 아직 모르겠어',
        kind: 'ghost',
        onPress: () => {
          io.mySay('왜 틀린 건지 아직 모르겠어');
          io.log({ name: 'error_point_react', react: 'dont_get_why' });
          explainAgain(idx);
        },
      },
      {
        label: '나 여기 이렇게 안 썼는데',
        kind: 'ghost',
        onPress: () => {
          io.mySay('나 여기 이렇게 안 썼는데');
          io.log({ name: 'error_point_react', react: 'not_mine' });
          stopMisread();
        },
      },
    ]);
  }

  // [모르겠어] — 같은 why를 또 읽히지 않는다. 개념 설명이 있으면 그걸, 없으면 fix를 꺼내고 쪽지로.
  // react를 갈라 넘긴다 — 설명을 본 학생과 fix만 본 학생이 check_answer에서 섞이면 "설명이 먹혔나"를 못 센다
  function explainAgain(idx: number) {
    const cand = pocket?.errorCandidates[idx];
    io.say('괜찮아, 말로 들어선 원래 잘 안 잡혀.');
    if (cand?.concept?.rule && cand.concept.violation) {
      io.say(cand.concept.rule);
      io.say(cand.concept.violation);
      void showCheck(idx, 'dont_get_why_concept');
      return;
    }
    if (cand?.fix) io.say(`다르게 말하면 — "${cand.fix}"`);
    void showCheck(idx, 'dont_get_why');
  }

  // [안 썼는데] — AI가 글씨를 잘못 읽은 날. 노트·이름표·설문 없음: 판독 실수가 학생 약점으로 둔갑하지 않게
  function stopMisread() {
    io.say('내가 네 글씨를 잘못 읽었나 봐. 미안 — 이 분석은 여기서 멈출게.');
    io.say('풀이가 선명하게 나오게 다시 찍어주면 처음부터 다시 볼게.');
    io.ask([
      { label: '📷 풀이가 선명하게 다시 찍기', kind: 'primary', onPress: () => io.run('restart') },
      { label: '오늘은 여기까지', kind: 'ghost', onPress: closeHere },
    ]);
  }

  function logQuizVerify(kind: VerifyKind, v: RunnerVerdict, react?: string) {
    io.log({
      name: 'quiz_verify',
      kind,
      result: v.verdict,
      reason: v.reason,
      verify_ms: v.ms,
      waited_ms: v.waitedMs,
      ...(react ? { react } : {}),
    });
  }

  async function showCheck(idx: number, react: string) {
    const cand = pocket?.errorCandidates[idx];
    if (!pocket || !cand) return;
    // 짚기는 방법이 주머니와 같을 때만 온다(confirmMethod) — 노트의 방법은 주머니 것
    const methodId = pocket.predictedMethodId;
    const ctx = (checkResult: CheckResult): NoteContext => ({ methodId, mistakeType: cand.mistakeType, checkResult });

    const v = await runner.verdict('check');
    if (!alive) return;
    logQuizVerify('check', v, react);
    const quiz = readCheckQuiz(cand);
    if (!quiz || v.verdict !== 'match') {
      // 건너뜀은 실패가 아니다 — 노트 ✗·"괜찮아" 톤·fail 결말 어디로도 안 간다
      void startRetry(idx, ctx('skip'));
      return;
    }
    // "노트 완성" 예고. 상황 칸이 있으면 재료를 먼저 깔고 질문 — 카드 밖(사진) 지칭으로 못 푸는 문제 방지
    if (quiz.setup) {
      io.say(`그럼 진짜 아는지 보자 — 이거 통과하면 오늘 오답노트 완성이야. ${quiz.setup}`);
      io.say(quiz.prompt);
    } else {
      io.say(`그럼 진짜 아는지 보자 — 이거 통과하면 오늘 오답노트 완성이야. ${quiz.prompt}`);
    }
    io.ask(
      quiz.options.map((option, i) => ({
        label: option,
        onPress: () => {
          io.mySay(option);
          const passed = i === quiz.answerIndex;
          io.log({ name: 'check_answer', passed: passed ? 1 : 0, react });
          if (passed) {
            io.say('그렇지. 이제 이 자리에서는 안 틀리겠네.');
          } else {
            // 재시험 없음 — 한 번만 더 짚고 넘어간다 (늘어지면 귀찮음 축 침범)
            io.say(`아직 헷갈리는구나. 정답은 "${quiz.options[quiz.answerIndex]}" — 아까랑 같은 원리야.`);
          }
          void startRetry(idx, ctx(passed ? 'pass' : 'fail'));
        },
      })),
    );
  }

  // 즉석 재도전: 아까 무너진 자리 재밟기. 관문 아님 — 어느 선택이든 노트로
  async function startRetry(idx: number, ctx: NoteContext) {
    const quiz = readRetryQuiz(pocket?.errorCandidates[idx]);
    if (!quiz) {
      showWrongNote(idx, ctx, 'none'); // 모양이 깨져 왔으면 조용히 건너뛴다 — 노트는 그래도 나온다
      return;
    }
    const v = await runner.verdict('retry');
    if (!alive) return;
    logQuizVerify('retry', v);
    if (v.verdict !== 'match') {
      showWrongNote(idx, ctx, 'unverified'); // 검산 통과 못 함 — 노트는 나온다
      return;
    }
    // 쪽지를 틀린 학생에게만 한 템포. 맞힌 학생·건너뛴 학생은 빠르게 (귀찮음 축)
    io.say(
      ctx.checkResult === 'fail'
        ? '괜찮아, 헷갈리라고 있는 자리야. 마지막으로 딱 한 번만 — 새 숫자로 가보자.'
        : '그럼 진짜 마지막 — 아까 그 자리, 새 숫자로 한 번만 다시 밟아보자.',
    );
    io.say(`${quiz.setup}\n${quiz.prompt}`);
    io.ask([
      ...quiz.options.map((option, i) => ({
        label: option,
        onPress: () => {
          io.mySay(option);
          if (i === quiz.answerIndex) {
            io.say('그렇지! 아까 무너진 그 자리, 이번엔 통과했어.');
            showWrongNote(idx, ctx, 'pass');
          } else {
            io.say(`아깝다 — 정답은 "${quiz.options[quiz.answerIndex]}". 아까랑 같은 원리야.`);
            showWrongNote(idx, ctx, 'fail'); // 재시도 없음
          }
        },
      })),
      {
        label: '지금은 넘어갈래',
        kind: 'ghost',
        onPress: () => {
          io.mySay('지금은 넘어갈래');
          showWrongNote(idx, ctx, 'skip');
        },
      },
    ]);
  }

  // 노트로 가는 갈림길. 통역표로 약점을 찾고, 앱은 둘 이상이면 노트 전에 학생한테 묻는다(08.11 🔒).
  // 웹은 안 묻고 "A 또는 B"로 — 고른 값을 둘 곳(저장·복습)이 없다
  function showWrongNote(idx: number, ctx: NoteContext, retryResult: ScriptRetryResult) {
    const weaknessIds = weaknessCandidatesFor(ctx.methodId, ctx.mistakeType);
    // 빈손(0개)도 반드시 남긴다 — 분모. 질문 앞에 있어야 말풍선에서 나간 학생이 분모에 남는다
    io.log({
      name: 'weakness_labeled',
      method_id: ctx.methodId,
      mistake_type: ctx.mistakeType,
      weakness_count: weaknessIds.length,
      labeled: weaknessIds.length > 0,
    });
    if (!deps.profile.picksWeakness || weaknessIds.length < 2) {
      finishNote(idx, ctx, retryResult, weaknessIds, weaknessIds.length === 1 ? weaknessIds[0] : null);
      return;
    }

    const choiceText = (id: WeaknessId) => weaknessChoiceText(ctx.methodId, id) ?? resolveWeaknessLabel(id);
    const picked = (id: WeaknessId | null) =>
      io.log({
        name: 'weakness_picked',
        method_id: ctx.methodId,
        mistake_type: ctx.mistakeType,
        candidate_count: weaknessIds.length,
        picked: id,
      });
    io.say('어디서 실수한 것 같아? 잘 모르겠으면 넘어가도 돼.');
    io.ask([
      // 버튼 문구는 그 약점이 달린 선택지 문장 — labelKo는 둘이 비슷해 학생이 못 가른다
      ...weaknessIds.map((id) => ({
        label: choiceText(id),
        kind: 'primary' as const,
        onPress: () => {
          io.mySay(choiceText(id));
          picked(id);
          finishNote(idx, ctx, retryResult, weaknessIds, id);
        },
      })),
      {
        label: '잘 모르겠어',
        kind: 'ghost' as const,
        onPress: () => {
          io.mySay('잘 모르겠어');
          picked(null);
          finishNote(idx, ctx, retryResult, weaknessIds, null); // 카드엔 "A 또는 B"
        },
      },
    ]);
  }

  // 오답노트 한 장 — 학생이 아는 양식(내 풀이/갈라진 지점/왜/다음엔)이 한 글자도 안 썼는데 채워져 나온다
  function finishNote(
    idx: number,
    ctx: NoteContext,
    retryResult: ScriptRetryResult,
    weaknessIds: WeaknessId[],
    primaryWeaknessId: WeaknessId | null,
  ) {
    const cand = pocket?.errorCandidates[idx];
    const today = now();
    io.say('자, 이게 오늘 네 오답노트야 — 네 손으로 적은 건 한 줄도 없지.');
    const note = {
      dateLabel: `${today.getMonth() + 1}/${today.getDate()}`,
      photoUri: deps.photoUri,
      quote: cand?.quote ?? '',
      why: cand?.why ?? '',
      // 짚기가 성공한 경로에선 AI 처방, 비었으면 유형별 통조림
      fix: cand?.fix || mistakeTypeFix(ctx.mistakeType),
      methodId: ctx.methodId,
      mistakeType: ctx.mistakeType,
      methodLabel: methodLabel(ctx.methodId),
      typeLabel: mistakeTypeLabel(ctx.mistakeType),
      weaknessIds,
      primaryWeaknessId,
      checkResult: ctx.checkResult,
      retryResult,
      askLine: true,
    };
    io.showNote(note);
    io.log({ name: 'note_shown', retry: retryResult }); // 깔때기 2 — 끝까지 걸어서 노트를 받은 수
    // 쪽지 ✗를 재도전으로 만회 못 했으면 성공 톤 금지. 쪽지를 건너뛴 건(skip) 실패가 아니다
    const failed = retryResult === 'fail' || (ctx.checkResult === 'fail' && retryResult !== 'pass');
    io.end({ kind: 'note', variant: failed ? 'fail' : 'success', note });
  }

  // 설문 결말 카드 — 사진 인용·쪽지 기록이 없어 노트를 채울 재료가 부족한 경로
  function showWeaknessCard(methodId: SolveMethodId | null, mistakeType: MistakeTypeId) {
    const label = methodLabel(methodId ?? undefined);
    const typeLabel = mistakeTypeLabel(mistakeType);
    const card: WeaknessCardView = {
      methodId,
      mistakeType,
      methodLabel: label,
      typeLabel,
      title: `오늘 찾은 약점 — ${label} × ${typeLabel}`,
      body: ['(네가 직접 짚어준 것)', mistakeTypeFix(mistakeType)].join('\n'),
    };
    io.showWeaknessCard(card);
    // 깔때기 2' — 설문 결말 도달 수. note_shown과 합치면 결말 도달 전체
    io.log({ name: 'weakness_card_shown', method: methodId || 'unknown', mistake: mistakeType || 'unknown' });
    io.end({ kind: 'weakness', card });
  }

  // 느낌 설문: "어디서 틀렸어?"(분석 숙제)가 아니라 "뭐가 걸렸어?"(경험 증언)만 묻는다
  function showFeelingSurvey(methodId: SolveMethodId | null, promptText?: string, withAnswerReadHint = false) {
    const options = surveyOptionsFor(methodId);
    if (withAnswerReadHint) {
      // 마지막 보기를 힌트 버전으로 교체 (없으면 추가)
      const i = options.findIndex((option) => option.type === 'answer_read');
      if (i >= 0) options[i] = ANSWER_READ_HINT;
      else options.push(ANSWER_READ_HINT);
    }
    io.say(promptText || '그럼 — 풀면서 느낌상 뭐가 제일 걸렸어?');
    io.ask([
      ...options.map((option) => ({
        label: option.text,
        onPress: () => {
          io.mySay(option.text);
          io.log({ name: 'survey_pick', mistake: option.type });
          showWeaknessCard(methodId, option.type);
        },
      })),
      {
        label: '잘 모르겠어',
        kind: 'ghost',
        onPress: () => {
          io.mySay('잘 모르겠어');
          io.log({ name: 'survey_pick', mistake: 'dont_know' });
          showWeaknessCard(methodId, 'concept_gap');
        },
      },
    ]);
  }

  return {
    start,
    dispose() {
      alive = false;
      runner.dispose();
    },
  };
}
