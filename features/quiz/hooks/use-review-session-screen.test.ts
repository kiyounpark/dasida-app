import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useReviewSessionScreen } from './use-review-session-screen';
import * as reviewFeedback from '@/features/quiz/review-feedback';
import * as reviewRouterModule from '@/features/quiz/review-router';
import * as buildCandidatesModule from '@/features/quiz/components/review-session/build-review-router-candidates';
import { reviewContentMap } from '@/data/review-content-map';
import { remedialFlows } from '@/data/review-remedial-flows';

jest.mock('@/features/analytics/log-event', () => ({
  logEvent: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ taskId: '__mock__' }),
}));

jest.mock('@/features/learner/provider', () => ({
  useCurrentLearner: () => ({
    session: { accountKey: 'acc-1' },
    refresh: jest.fn(),
    profile: { learnerId: 'l-1', grade: 'middle1' },
    recordAttempt: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@/features/learning/review-scheduler', () => ({
  completeReviewTask: jest.fn().mockResolvedValue(undefined),
  rescheduleReviewTask: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/features/quiz/notifications/review-notification-scheduler', () => ({
  rescheduleAllReviewNotifications: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/features/quiz/review-feedback', () => ({
  requestReviewFeedback: jest.fn(),
}));

jest.mock('@/features/quiz/review-router', () => ({
  analyzeReviewMethod: jest.fn().mockResolvedValue({
    predictedNodeId: 'fallback',
    confidence: 0,
    reason: 'default',
    candidateNodeIds: [],
    source: 'mock-router',
  }),
}));

jest.mock('@/features/quiz/components/review-session/build-review-router-candidates', () => ({
  buildReviewRouterCandidates: jest.fn(
    jest.requireActual('@/features/quiz/components/review-session/build-review-router-candidates')
      .buildReviewRouterCandidates,
  ),
}));

describe('entries-based flow', () => {
  // Task 6 fixture: inject weaknessId labels into formula_understanding data so that
  // the collection code path can be exercised. Restored after this describe runs.
  // Production data files (Task 8 territory) are NOT modified.
  const originalStep1Wrong0WeaknessId = (() => {
    const c = reviewContentMap.formula_understanding!.thinkingSteps[0].choices[0] as {
      weaknessId?: string;
    };
    return c.weaknessId;
  })();
  const originalCheckWrong1WeaknessId = (() => {
    const node = remedialFlows.formula_understanding!.nodes['fu_step1_A_check'] as {
      kind: string;
      options: ReadonlyArray<{ id: string; weaknessId?: string }>;
    };
    const opt = node.options.find((o) => o.id === 'wrong1');
    return opt?.weaknessId;
  })();

  beforeAll(() => {
    const step1Wrong0 = reviewContentMap.formula_understanding!.thinkingSteps[0].choices[0] as {
      weaknessId?: string;
    };
    step1Wrong0.weaknessId = 'basic_concept_needed';

    const checkNode = remedialFlows.formula_understanding!.nodes['fu_step1_A_check'] as {
      kind: string;
      options: ReadonlyArray<{ id: string; weaknessId?: string }>;
    };
    const wrong1 = checkNode.options.find((o) => o.id === 'wrong1') as {
      id: string;
      weaknessId?: string;
    };
    wrong1.weaknessId = 'expansion_sign_error';
  });

  afterAll(() => {
    const step1Wrong0 = reviewContentMap.formula_understanding!.thinkingSteps[0].choices[0] as {
      weaknessId?: string;
    };
    if (originalStep1Wrong0WeaknessId === undefined) delete step1Wrong0.weaknessId;
    else step1Wrong0.weaknessId = originalStep1Wrong0WeaknessId;

    const checkNode = remedialFlows.formula_understanding!.nodes['fu_step1_A_check'] as {
      kind: string;
      options: ReadonlyArray<{ id: string; weaknessId?: string }>;
    };
    const wrong1 = checkNode.options.find((o) => o.id === 'wrong1') as {
      id: string;
      weaknessId?: string;
    };
    if (originalCheckWrong1WeaknessId === undefined) delete wrong1.weaknessId;
    else wrong1.weaknessId = originalCheckWrong1WeaknessId;
  });

  it('1차 선택지에 weaknessId가 있으면 discoveredWeaknesses에 누적된다', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    await act(async () => {
      result.current.onSelectChoice(0); // wrong choice with weaknessId
    });

    expect(result.current.__test_discoveredForStep?.(0)).toContain(
      'basic_concept_needed',
    );
  });

  it('check 노드의 오답 옵션 선택 시 weaknessId 누적', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    // wrong choice → remedial flow → explain primary → check 노드 도달
    await act(async () => { result.current.onSelectChoice(0); });
    act(() => { result.current.onRemedialExplainPrimary('fu_step1_A_explain'); });

    // check 오답 옵션 클릭 (wrong1 = '8')
    act(() => { result.current.onRemedialCheckOption('fu_step1_A_check', 'wrong1'); });

    expect(result.current.__test_discoveredForStep?.(0)).toContain(
      'expansion_sign_error',
    );
  });

  it('초기 entries에 step-card와 input-area가 있다', () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    expect(result.current.entries[0]).toMatchObject({ kind: 'step-card' });
    expect(result.current.entries[1]).toMatchObject({ kind: 'input-area', interactive: true });
  });

  it('정답 선택 시 choice-bubble + feedback-banner + done-cta 추가', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const correctIdx = result.current.steps[0].choices.findIndex((c) => c.correct);

    await act(async () => {
      result.current.onSelectChoice(correctIdx);
    });

    const kinds = result.current.entries.map((e) => e.kind);
    expect(kinds).toContain('choice-bubble');
    expect(kinds).toContain('feedback-banner');
    expect(kinds).toContain('done-cta');
    const inputArea = result.current.entries.find((e) => e.kind === 'input-area');
    expect(inputArea).toMatchObject({ interactive: false });
  });

  it('오답 선택 시 choice-bubble + feedback-banner + 첫 remedial-node 추가', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const wrongIdx = result.current.steps[0].choices.findIndex((c) => !c.correct);

    await act(async () => {
      result.current.onSelectChoice(wrongIdx);
    });

    const kinds = result.current.entries.map((e) => e.kind);
    expect(kinds).toContain('choice-bubble');
    expect(kinds).toContain('feedback-banner');
    expect(kinds).toContain('remedial-node');
  });

  it('자유 입력 제출 시 user-bubble + ai-typing → ai-bubble로 교체', async () => {
    const spy = jest
      .spyOn(reviewFeedback, 'requestReviewFeedback')
      .mockResolvedValue({ replyText: 'AI 응답 내용' });

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    act(() => result.current.onChangeFreeText('이해한 내용 작성'));
    await act(async () => {
      await result.current.onSubmitFreeText();
    });

    const kinds = result.current.entries.map((e) => e.kind);
    expect(kinds).toContain('user-bubble');
    expect(kinds).toContain('ai-bubble');
    expect(kinds).not.toContain('ai-typing'); // 응답 도착 후 사라짐

    spy.mockRestore();
  });

  it('자유 입력 호출 실패 시 ai-typing 제거 + 에러 메시지 ai-bubble', async () => {
    const spy = jest
      .spyOn(reviewFeedback, 'requestReviewFeedback')
      .mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    act(() => result.current.onChangeFreeText('hello'));
    await act(async () => {
      await result.current.onSubmitFreeText();
    });

    const kinds = result.current.entries.map((e) => e.kind);
    expect(kinds).not.toContain('ai-typing');
    const lastAi = [...result.current.entries].reverse().find((e) => e.kind === 'ai-bubble');
    expect(lastAi).toBeDefined();

    spy.mockRestore();
  });

  it('1턴 응답 후 fallback-input(turn=2) 자동 추가', async () => {
    const spy = jest
      .spyOn(reviewFeedback, 'requestReviewFeedback')
      .mockResolvedValue({ replyText: '1차 응답' });

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    act(() => result.current.onChangeFreeText('첫 입력'));
    await act(async () => { await result.current.onSubmitFreeText(); });

    const fb = result.current.entries.find((e) => e.kind === 'fallback-input');
    expect(fb).toMatchObject({ turn: 2, interactive: true });

    spy.mockRestore();
  });

  it('remedial explain 카드의 primary → 다음 노드 entry 추가, 이전 노드 잠금', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const wrongIdx = result.current.steps[0].choices.findIndex((c) => !c.correct);
    await act(async () => { result.current.onSelectChoice(wrongIdx); });

    const firstNode = result.current.entries.find((e) => e.kind === 'remedial-node') as any;
    await act(async () => {
      result.current.onRemedialExplainPrimary(firstNode.node.id);
    });

    const nodes = result.current.entries.filter((e) => e.kind === 'remedial-node');
    expect(nodes.length).toBeGreaterThanOrEqual(2);
    expect(nodes[0]).toMatchObject({ interactive: false });
    expect(nodes[1]).toMatchObject({ interactive: true });
  });

  it('2턴 응답 후 done-cta 추가, fallback-input 잠금', async () => {
    const spy = jest
      .spyOn(reviewFeedback, 'requestReviewFeedback')
      .mockResolvedValueOnce({ replyText: '1차' })
      .mockResolvedValueOnce({ replyText: '2차 마무리' });

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    act(() => result.current.onChangeFreeText('첫 입력'));
    await act(async () => { await result.current.onSubmitFreeText(); });

    act(() => result.current.onChangeFallbackText('두 번째 입력'));
    await act(async () => { await result.current.onSubmitFallback(); });

    const fb = result.current.entries.find((e) => e.kind === 'fallback-input');
    expect(fb).toMatchObject({ interactive: false });
    const lastEntry = result.current.entries[result.current.entries.length - 1];
    expect(lastEntry.kind).toBe('done-cta');

    spy.mockRestore();
  });

  it('AI 챗 2턴 마무리 후 done-cta 라벨은 "다음으로" (이해했어요 강요 X) [spec §3.1]', async () => {
    const spy = jest
      .spyOn(reviewFeedback, 'requestReviewFeedback')
      .mockResolvedValue({ replyText: 'AI wrap-up 응답' });

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    // Drive to 2턴 close (1턴 free input → AI replies → 2턴 input → AI replies → done-cta)
    act(() => result.current.onChangeFreeText('도와주세요'));
    await act(async () => { await result.current.onSubmitFreeText(); });
    await waitFor(() => {
      const kinds = result.current.entries.map((e) => e.kind);
      expect(kinds.filter((k) => k === 'fallback-input').length).toBe(1);
    });

    act(() => result.current.onChangeFallbackText('더 모르겠어요'));
    await act(async () => { await result.current.onSubmitFallback(); });
    await waitFor(() => {
      const kinds = result.current.entries.map((e) => e.kind);
      expect(kinds).toContain('done-cta');
    });

    const doneCta = result.current.entries.find((e) => e.kind === 'done-cta') as {
      label: string;
    };
    expect(doneCta.label).not.toContain('이해했어요');
    // Adapt: non-last step → '다음으로', last step → '완료'
    expect(['다음으로', '완료']).toContain(doneCta.label);

    spy.mockRestore();
  });

  it('onPressContinue 후 다음 step의 entries로 리셋된다', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const correctIdx = result.current.steps[0].choices.findIndex((c) => c.correct);

    await act(async () => { result.current.onSelectChoice(correctIdx); });
    await act(async () => { result.current.onPressContinue(); });

    expect(result.current.currentStepIndex).toBe(1);
    expect(result.current.entries).toHaveLength(2);
    expect(result.current.entries[0]).toMatchObject({ kind: 'step-card', stepIndex: 1 });
    expect(result.current.entries[1]).toMatchObject({ kind: 'input-area', stepIndex: 1, interactive: true });
  });

  it('마지막 step 정답 시 done-cta 라벨이 "이해했어요, 완료"', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const totalSteps = result.current.steps.length;

    // 마지막 step까지 정답으로 진행
    for (let i = 0; i < totalSteps - 1; i += 1) {
      const correctIdx = result.current.steps[i].choices.findIndex((c) => c.correct);
      await act(async () => { result.current.onSelectChoice(correctIdx); });
      await act(async () => { result.current.onPressContinue(); });
    }

    const lastCorrectIdx = result.current.steps[totalSteps - 1].choices.findIndex((c) => c.correct);
    await act(async () => { result.current.onSelectChoice(lastCorrectIdx); });

    const doneCta = result.current.entries.find((e) => e.kind === 'done-cta');
    expect(doneCta).toMatchObject({ label: '이해했어요, 완료' });
  });

  it('onRemedialExplainSecondary("모르겠어요") → secondaryNextNodeId 노드 append + 이전 remedial-node 잠금 (Phase 2 정적 이동)', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const wrongIdx = result.current.steps[0].choices.findIndex((c) => !c.correct);
    await act(async () => { result.current.onSelectChoice(wrongIdx); });

    const firstNode = result.current.entries.find((e) => e.kind === 'remedial-node') as any;
    if (!firstNode || firstNode.node.kind !== 'explain') return;

    await act(async () => {
      result.current.onRemedialExplainSecondary(firstNode.node.id);
    });

    const lastEntry = result.current.entries[result.current.entries.length - 1] as any;
    expect(lastEntry.kind).toBe('remedial-node');
    expect(lastEntry.node.id).toBe(firstNode.node.secondaryNextNodeId);
    const remedialNodes = result.current.entries.filter((e) => e.kind === 'remedial-node');
    // 이전 노드들은 잠겨야 한다; 마지막(새로 추가된) 노드만 interactive
    expect(remedialNodes[0]).toMatchObject({ interactive: false });
  });

  it('자유 입력 호출 실패 시 input-area 복구 + freeText 복원', async () => {
    const spy = jest
      .spyOn(reviewFeedback, 'requestReviewFeedback')
      .mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    act(() => result.current.onChangeFreeText('재시도용 입력'));
    await act(async () => { await result.current.onSubmitFreeText(); });

    expect(result.current.freeText).toBe('재시도용 입력');
    const inputArea = result.current.entries.find((e) => e.kind === 'input-area');
    expect(inputArea).toMatchObject({ interactive: true });

    spy.mockRestore();
  });

  it('Scenario E (remedial 모르겠어요 → 정적 이동 Phase 2): 새 remedial-node가 append되고 폴백 챗 없음', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const wrongIdx = result.current.steps[0].choices.findIndex((c) => !c.correct);
    await act(async () => { result.current.onSelectChoice(wrongIdx); });

    const firstNode = result.current.entries.find((e) => e.kind === 'remedial-node') as any;
    if (!firstNode || firstNode.node.kind !== 'explain') return;

    await act(async () => {
      result.current.onRemedialExplainSecondary(firstNode.node.id);
    });

    const lastEntry = result.current.entries[result.current.entries.length - 1] as any;
    expect(lastEntry.kind).toBe('remedial-node');
    expect(lastEntry.node.id).toBe(firstNode.node.secondaryNextNodeId);
    expect(result.current.entries.some((e: any) => e.kind === 'fallback-input')).toBe(false);
  });

  it('스텝 내 dontKnow 누적 카운터가 새 step 시작 시 리셋된다', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    // 첫 스텝에서 모르겠어요 1회
    const wrongIdx = result.current.steps[0].choices.findIndex((c) => !c.correct);
    await act(async () => { result.current.onSelectChoice(wrongIdx); });
    const firstNode = result.current.entries.find((e) => e.kind === 'remedial-node') as any;
    if (!firstNode || firstNode.node.kind !== 'explain') return;

    await act(async () => {
      result.current.onRemedialExplainSecondary(firstNode.node.id);
    });
    expect(result.current.__test_dontKnowCount?.(0)).toBe(1);

    // 다음 step으로 진행
    await act(async () => {
      result.current.onPressContinue?.();
    });
    await waitFor(() => expect(result.current.currentStepIndex).toBe(1));

    // 새 스텝 카운터는 0
    expect(result.current.__test_dontKnowCount?.(1)).toBe(0);
  });

  it('스텝 내 모르겠어요 누적 2회 → AI 챗 진입 (코치 안내 + 자유 입력창)', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    // 오답 클릭 → remedial flow 진입
    const wrongIdx = result.current.steps[0].choices.findIndex((c) => !c.correct);
    await act(async () => {
      result.current.onSelectChoice(wrongIdx);
    });

    // 첫 번째 모르겠어요 — 정적 경로(easy explain 등)로 이동
    act(() => {
      result.current.onRemedialExplainSecondary('fu_step1_A_explain');
    });
    const kindsAfterFirst = result.current.entries.map((e) => e.kind);
    expect(kindsAfterFirst).not.toContain('fallback-input');

    // 두 번째 모르겠어요 — AI 챗 진입
    act(() => {
      result.current.onRemedialExplainSecondary('fu_step1_A_easy');
    });
    const kindsAfterSecond = result.current.entries.map((e) => e.kind);
    // ai-bubble (코치 안내) + fallback-input (자유 입력창)이 차례로 추가됨
    const aiBubbleIdx = kindsAfterSecond.findIndex(
      (k, i) => k === 'ai-bubble' && i > kindsAfterFirst.length - 1,
    );
    expect(aiBubbleIdx).toBeGreaterThanOrEqual(0);
    expect(kindsAfterSecond[aiBubbleIdx + 1]).toBe('fallback-input');

    const coachBubble = result.current.entries[aiBubbleIdx] as { text: string };
    expect(coachBubble.text).toContain('어떤 부분이 헷갈리는지');

    // 정적 경로 차단(interception) 검증: 2번째 모르겠어요 이후 done-cta가 추가되지 않아야 함
    // (fu_step1_A_easy.secondaryNextNodeId = fu_step1_exit → 정적 advance 시 done-cta 생성됨)
    const newEntriesAfterSecond = kindsAfterSecond.slice(kindsAfterFirst.length);
    expect(newEntriesAfterSecond).not.toContain('done-cta');
    // 마지막으로 추가된 엔트리가 fallback-input이어야 함 (정적 advance로 인한 후속 추가 없음)
    expect(kindsAfterSecond[kindsAfterSecond.length - 1]).toBe('fallback-input');
  });

  it('Scenario E (remedial 모르겠어요 정적 이동 후): remedial 흐름을 계속 진행하면 done-cta까지 도달', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const wrongIdx = result.current.steps[0].choices.findIndex((c) => !c.correct);
    await act(async () => { result.current.onSelectChoice(wrongIdx); });

    const firstNode = result.current.entries.find((e) => e.kind === 'remedial-node') as any;
    if (!firstNode || firstNode.node.kind !== 'explain') return;

    // 모르겠어요 → secondaryNextNode (fu_step1_A_easy)
    await act(async () => {
      result.current.onRemedialExplainSecondary(firstNode.node.id);
    });

    const secondNode = result.current.entries.find(
      (e: any) => e.kind === 'remedial-node' && e.node.id === firstNode.node.secondaryNextNodeId,
    ) as any;
    if (!secondNode) return;

    // primary → fu_step1_A_check (check 노드)
    await act(async () => {
      result.current.onRemedialExplainPrimary(secondNode.node.id);
    });

    const checkNode = result.current.entries.find(
      (e: any) => e.kind === 'remedial-node' && e.node.kind === 'check',
    ) as any;
    if (!checkNode) return;

    // 정답 선택 → exit → done-cta
    const correctOpt = checkNode.node.options.find((o: any) => o.isCorrect);
    if (!correctOpt) return;
    await act(async () => {
      result.current.onRemedialCheckOption(checkNode.node.id, correctOpt.id);
    });

    const lastEntry = result.current.entries[result.current.entries.length - 1];
    expect(lastEntry.kind).toBe('done-cta');
  });
});

describe('entries-based flow — kind sequence snapshots (spec §3 scenarios)', () => {
  const kindsOf = (entries: ReadonlyArray<{ kind: string }>) => entries.map((e) => e.kind);

  it('Scenario C (정답)', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const correctIdx = result.current.steps[0].choices.findIndex((c) => c.correct);
    await act(async () => { result.current.onSelectChoice(correctIdx); });

    expect(kindsOf(result.current.entries)).toMatchInlineSnapshot(`
[
  "step-card",
  "input-area",
  "choice-bubble",
  "feedback-banner",
  "done-cta",
]
`);
  });

  it('Scenario D (오답 → remedial 첫 노드)', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const wrongIdx = result.current.steps[0].choices.findIndex((c) => !c.correct);
    await act(async () => { result.current.onSelectChoice(wrongIdx); });

    expect(kindsOf(result.current.entries)).toMatchInlineSnapshot(`
[
  "step-card",
  "input-area",
  "choice-bubble",
  "feedback-banner",
  "remedial-node",
]
`);
  });

  it('Scenario B (자유입력 → 폴백 챗 2턴 → done)', async () => {
    const spy = jest
      .spyOn(reviewFeedback, 'requestReviewFeedback')
      .mockResolvedValueOnce({ replyText: '1차' })
      .mockResolvedValueOnce({ replyText: '2차' });

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));

    act(() => result.current.onChangeFreeText('첫 입력'));
    await act(async () => { await result.current.onSubmitFreeText(); });
    act(() => result.current.onChangeFallbackText('두 번째 입력'));
    await act(async () => { await result.current.onSubmitFallback(); });

    expect(kindsOf(result.current.entries)).toMatchInlineSnapshot(`
[
  "step-card",
  "input-area",
  "user-bubble",
  "ai-bubble",
  "fallback-input",
  "user-bubble",
  "ai-bubble",
  "done-cta",
]
`);
    spy.mockRestore();
  });

  it('Scenario E (오답 → remedial → 모르겠어요 정적이동 → 쉬운설명 → check → 정답 → done)', async () => {
    // Phase 2: 모르겠어요는 정적으로 다음 노드(easy)로 이동, 폴백 챗 없음
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const wrongIdx = result.current.steps[0].choices.findIndex((c) => !c.correct);
    await act(async () => { result.current.onSelectChoice(wrongIdx); });

    // fu_step1_A_explain 노드
    const firstNode = result.current.entries.find((e) => e.kind === 'remedial-node') as any;
    if (!firstNode || firstNode.node.kind !== 'explain') return;

    // 모르겠어요 → fu_step1_A_easy
    await act(async () => { result.current.onRemedialExplainSecondary(firstNode.node.id); });

    // fu_step1_A_easy의 primary → fu_step1_A_check
    const easyNode = result.current.entries.find(
      (e: any) => e.kind === 'remedial-node' && e.node.id === firstNode.node.secondaryNextNodeId,
    ) as any;
    if (!easyNode || easyNode.node.kind !== 'explain') return;
    await act(async () => { result.current.onRemedialExplainPrimary(easyNode.node.id); });

    // check 노드에서 정답 선택
    const checkNode = result.current.entries.find(
      (e: any) => e.kind === 'remedial-node' && e.node.kind === 'check',
    ) as any;
    if (!checkNode) return;
    const correctOpt = checkNode.node.options.find((o: any) => o.isCorrect);
    if (!correctOpt) return;
    await act(async () => { result.current.onRemedialCheckOption(checkNode.node.id, correctOpt.id); });

    expect(kindsOf(result.current.entries)).toMatchInlineSnapshot(`
[
  "step-card",
  "input-area",
  "choice-bubble",
  "feedback-banner",
  "remedial-node",
  "remedial-node",
  "remedial-node",
  "user-bubble",
  "done-cta",
]
`);
  });
});

describe('자유 입력 → 라우터 분기 (Phase 2)', () => {
  it('라우터 성공 시 remedial 노드 entries로 진입', async () => {
    jest.spyOn(reviewRouterModule, 'analyzeReviewMethod').mockResolvedValue({
      predictedNodeId: 'fu_step1_A_explain',
      confidence: 0.82,
      reason: 'matched',
      candidateNodeIds: ['fu_step1_A_explain'],
      source: 'openai-router',
    });

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    act(() => result.current.onChangeFreeText('왜 절반인지'));
    await act(async () => {
      await result.current.onSubmitFreeText();
    });

    const kinds = result.current.entries.map((e) => e.kind);
    expect(kinds).toContain('user-bubble');
    expect(kinds).toContain('ai-bubble'); // routing-bubble (spec §3 시나리오 A)
    expect(kinds).toContain('remedial-node');
    expect(kinds).not.toContain('ai-typing'); // typing은 routing-bubble로 교체됐어야 함
    // routing-bubble은 remedial-node 직전에 와야 한다.
    const remedialIdx = kinds.indexOf('remedial-node');
    expect(kinds[remedialIdx - 1]).toBe('ai-bubble');
  });

  it('라우터 fallback 시 기존 폴백 챗 경로 사용', async () => {
    jest.spyOn(reviewRouterModule, 'analyzeReviewMethod').mockResolvedValue({
      predictedNodeId: 'fallback',
      confidence: 0.2,
      reason: 'no match',
      candidateNodeIds: [],
      source: 'mock-router',
    });
    jest.spyOn(reviewFeedback, 'requestReviewFeedback').mockResolvedValue({
      replyText: '예시 풀이…',
    });

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    act(() => result.current.onChangeFreeText('아무거나'));
    await act(async () => {
      await result.current.onSubmitFreeText();
    });

    const kinds = result.current.entries.map((e) => e.kind);
    expect(kinds).toContain('user-bubble');
    expect(kinds).toContain('ai-bubble'); // 폴백 챗 응답
    expect(kinds).toContain('fallback-input'); // 2턴 입력창
  });

  it('라우터 hit 시 requestReviewFeedback(폴백 챗)이 호출되지 않는다', async () => {
    jest.spyOn(reviewRouterModule, 'analyzeReviewMethod').mockResolvedValue({
      predictedNodeId: 'fu_step1_A_explain',
      confidence: 0.85,
      reason: 'matched',
      candidateNodeIds: ['fu_step1_A_explain'],
      source: 'openai-router',
    });
    // 이전 테스트들에서 누적된 호출 카운트 초기화 (module-level mock이라 spyOn으론 안 리셋됨)
    (reviewFeedback.requestReviewFeedback as jest.Mock).mockClear();
    const chatSpy = jest
      .spyOn(reviewFeedback, 'requestReviewFeedback')
      .mockResolvedValue({ replyText: '이건 절대 호출되면 안 됨' });

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    act(() => result.current.onChangeFreeText('왜 절반인지'));
    await act(async () => {
      await result.current.onSubmitFreeText();
    });

    expect(chatSpy).not.toHaveBeenCalled();
    const kinds = result.current.entries.map((e) => e.kind);
    expect(kinds).toContain('remedial-node');
    // ai-bubble은 routing-bubble로 1개 있어야 한다 (폴백 챗 ai-bubble은 chatSpy로 차단됨)
    expect(kinds.filter((k) => k === 'ai-bubble')).toHaveLength(1);
    expect(kinds).not.toContain('fallback-input');
  });

  it('라우터가 source=fallback을 반환하면 remedial이 아니라 폴백 챗으로 분기', async () => {
    jest.spyOn(reviewRouterModule, 'analyzeReviewMethod').mockResolvedValue({
      predictedNodeId: 'fallback',
      confidence: 0,
      reason: 'all low',
      candidateNodeIds: [],
      source: 'fallback',
      fallbackReason: 'low_confidence',
    });
    jest.spyOn(reviewFeedback, 'requestReviewFeedback').mockResolvedValue({
      replyText: '예시 풀이…',
    });

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    act(() => result.current.onChangeFreeText('아무거나'));
    await act(async () => {
      await result.current.onSubmitFreeText();
    });

    const kinds = result.current.entries.map((e) => e.kind);
    expect(kinds).toContain('ai-bubble');
    expect(kinds).not.toContain('remedial-node');
  });

  it('후보 노드가 0개면 라우터 호출 스킵하고 곧장 폴백 챗', async () => {
    // Reset call count before this test's assertion window
    (reviewRouterModule.analyzeReviewMethod as jest.Mock).mockClear();
    jest
      .spyOn(buildCandidatesModule, 'buildReviewRouterCandidates')
      .mockReturnValue([]);
    jest.spyOn(reviewFeedback, 'requestReviewFeedback').mockResolvedValue({
      replyText: '예시…',
    });

    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    act(() => result.current.onChangeFreeText('아무거나'));
    await act(async () => {
      await result.current.onSubmitFreeText();
    });

    expect(reviewRouterModule.analyzeReviewMethod).not.toHaveBeenCalled();
  });
});

describe('Remedial 도중 "모르겠어요" 정적 이동 (Phase 2)', () => {
  // 공통 헬퍼: 오답 선택 후 첫 번째 remedial-node(explain kind)를 찾는다
  async function setupRemedialExplainNode(result: any) {
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const wrongIdx = result.current.steps[0].choices.findIndex((c: any) => !c.correct);
    await act(async () => { result.current.onSelectChoice(wrongIdx); });
    const firstNode = result.current.entries.find((e: any) => e.kind === 'remedial-node') as any;
    return firstNode;
  }

  it('explain "모르겠어요" 시 secondaryNextNodeId 노드가 entries에 append', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    const firstNode = await setupRemedialExplainNode(result);
    if (!firstNode || firstNode.node.kind !== 'explain') return;

    // fu_step1_A_explain 의 secondaryNextNodeId = 'fu_step1_A_easy'
    const secondaryId = firstNode.node.secondaryNextNodeId;

    await act(async () => {
      result.current.onRemedialExplainSecondary(firstNode.node.id);
    });

    const lastEntry = result.current.entries[result.current.entries.length - 1] as any;
    expect(lastEntry.kind).toBe('remedial-node');
    expect(lastEntry.node.id).toBe(secondaryId);

    // fallback-input(turn=1) 가 없어야 함
    const hasFallbackInput = result.current.entries.some(
      (e: any) => e.kind === 'fallback-input' && e.turn === 1,
    );
    expect(hasFallbackInput).toBe(false);
  });

  it('check "모르겠어요" 시 dontKnowNextNodeId 노드가 entries에 append', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    await waitFor(() => expect(result.current.steps.length).toBeGreaterThan(0));
    const wrongIdx = result.current.steps[0].choices.findIndex((c: any) => !c.correct);
    await act(async () => { result.current.onSelectChoice(wrongIdx); });

    // explain primary → check 노드로 이동
    const explainNode = result.current.entries.find((e: any) => e.kind === 'remedial-node') as any;
    if (!explainNode || explainNode.node.kind !== 'explain') return;
    await act(async () => { result.current.onRemedialExplainPrimary(explainNode.node.id); });

    const checkNode = result.current.entries.find(
      (e: any) => e.kind === 'remedial-node' && e.node.kind === 'check',
    ) as any;
    if (!checkNode) return;

    const dontKnowId = checkNode.node.dontKnowNextNodeId;
    await act(async () => {
      result.current.onRemedialCheckDontKnow(checkNode.node.id);
    });

    const lastEntry = result.current.entries[result.current.entries.length - 1] as any;
    expect(lastEntry.kind).toBe('remedial-node');
    expect(lastEntry.node.id).toBe(dontKnowId);
  });

  it('정적 이동 시 aiHelpUsedPerStepRef 는 변경되지 않는다 (AI 호출 없음)', async () => {
    const { result } = renderHook(() => useReviewSessionScreen());
    const firstNode = await setupRemedialExplainNode(result);
    if (!firstNode || firstNode.node.kind !== 'explain') return;

    // aiHelpUsed 는 exposed 안 되므로 fallback-input 부재 + ai-typing 부재로 간접 검증
    await act(async () => {
      result.current.onRemedialExplainSecondary(firstNode.node.id);
    });

    expect(result.current.entries.some((e: any) => e.kind === 'ai-typing')).toBe(false);
    expect(result.current.entries.some((e: any) => e.kind === 'fallback-input')).toBe(false);
  });
});
