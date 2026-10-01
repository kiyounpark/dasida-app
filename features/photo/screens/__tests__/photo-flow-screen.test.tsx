import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// jest.mock은 babel이 import 위로 끌어올리므로 아래 import들이 목을 먼저 받는다
import { makeCandidate, makeResult } from '../../flow/__fixtures__/analysis';
import {
  downscaleToDataUrl,
  newSubmissionId,
  pickPhoto,
  requestAnalyze,
} from '../../flow/analyze-photo-request';
import { askPhotoSource } from '../../flow/ask-photo-source';
import { requestDiagnoseMethod } from '../../flow/diagnose-method-request';
import { requestQuizVerify } from '../../flow/verify-quiz-request';
import { logEvent } from '@/features/analytics/log-event';
import { addDaysToToday } from '@/features/learning/review-scheduler';
import type { ReviewTaskStore } from '@/features/learning/review-task-store';
import type { ReviewTask } from '@/features/learning/types';
import { readPhotoNotes, savePhotoNote } from '../../note-store';
import { PhotoFlowScreen } from '../photo-flow-screen';

// ScrollView 내부 의존성(NativeAnimatedModule)으로 인한 NativeEventEmitter 오류를 피하기 위해 단순 View 로 대체.
// 화면이 ref로 scrollToEnd를 부르므로 ref에도 그 자리를 만들어 준다.
jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  const MockScrollView = React.forwardRef(
    ({ children, contentContainerStyle: _c, ...props }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ scrollToEnd: () => {} }));
      return React.createElement(RN.View, props, children);
    },
  );
  MockScrollView.displayName = 'ScrollView';
  // react-native 인덱스가 .default로 꺼내 쓴다 — 컴포넌트를 그대로 돌려주면 undefined가 된다
  return { __esModule: true, default: MockScrollView };
});

// 입력칸이 키보드에 안 가리게 감싼 KeyboardAvoidingView — 같은 이유(Keyboard의 NativeEventEmitter)로 단순 View
jest.mock('react-native/Libraries/Components/Keyboard/KeyboardAvoidingView', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  const MockKeyboardAvoidingView = ({ children, behavior: _b, enabled: _e, ...props }: any) =>
    React.createElement(RN.View, props, children);
  return { __esModule: true, default: MockKeyboardAvoidingView };
});

// 저장이 실제로 되는지는 note-store.test.ts가 본다. 여기서 보는 건 "흐름이 그걸 부르는가" 하나다.
jest.mock('../../note-store', () => ({
  ...jest.requireActual('../../note-store'),
  savePhotoNote: jest.fn(async () => []),
  readPhotoNotes: jest.fn(async () => []),
}));

// expo-image는 네이티브 뷰라 테스트에서 못 뜬다 — 사진 미리보기와 코치 아바타 둘 다 이걸 쓴다.
jest.mock('expo-image', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  return {
    Image: ({ source: _s, contentFit: _f, ...props }: any) =>
      React.createElement(RN.View, props),
  };
});

jest.mock('../../flow/analyze-photo-request', () => ({
  pickPhoto: jest.fn(),
  downscaleToDataUrl: jest.fn(),
  requestAnalyze: jest.fn(),
  newSubmissionId: jest.fn(),
}));

// 쪽지·재도전 검산(1.0.10). 기본은 match — 아래 흐름 테스트들은 문제가 나가는 길을 잰다.
// 건너뜀 길은 「1.0.10 — 웹과 같게」 묶음이 따로 잰다.
jest.mock('../../flow/verify-quiz-request', () => ({
  requestQuizVerify: jest.fn(),
}));

// 방법을 학생 말로 받으면 부르는 AI(diagnoseMethod). 기본은 실패(null) — 키워드로 좁히는 길
jest.mock('../../flow/diagnose-method-request', () => ({
  requestDiagnoseMethod: jest.fn(),
}));

// 찍을지 고를지 묻는 창. 실물은 ActionSheetIOS라 테스트 환경에 네이티브가 없다
// ("ActionSheetManager doesn't exist"). 아래 테스트들은 그 뒤의 흐름을 재는 것이라
// 기본값으로 앨범을 골라 통과시킨다 — 창 자체는 ask-photo-source.test.ts가 잰다.
jest.mock('../../flow/ask-photo-source', () => ({
  askPhotoSource: jest.fn(),
}));

jest.mock('@/features/analytics/log-event', () => ({
  logEvent: jest.fn(),
}));

const mockPick = pickPhoto as jest.Mock;
const mockAskSource = askPhotoSource as jest.Mock;
const mockDownscale = downscaleToDataUrl as jest.Mock;
const mockAnalyze = requestAnalyze as jest.Mock;
const mockLog = logEvent as jest.Mock;
const mockSaveNote = savePhotoNote as jest.Mock;
const mockReadNotes = readPhotoNotes as jest.Mock;
const mockNewSubmissionId = newSubmissionId as jest.Mock;
const mockVerify = requestQuizVerify as jest.Mock;
const mockDiagnose = requestDiagnoseMethod as jest.Mock;
const INPUT_PLACEHOLDER = '예: 근의 공식에 바로 대입했어';

/** 흐름을 오답노트 한 장까지 몬다. 쪽지시험·재도전은 첫 보기를 누른다. */
async function walkToNote() {
  fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
  await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
  fireEvent.press(screen.getByText('맞아, 시작하자'));
  await waitFor(() => expect(screen.getByText('아, 이거였구나')).toBeTruthy());
  fireEvent.press(screen.getByText('아, 이거였구나'));
  await waitFor(() => expect(screen.getByText('9를 더하고 뺀다')).toBeTruthy());
  fireEvent.press(screen.getByText('9를 더하고 뺀다'));
  await waitFor(() => expect(screen.getByText('25를 더하고 뺀다')).toBeTruthy());
  fireEvent.press(screen.getByText('25를 더하고 뺀다'));
  await waitFor(() => expect(screen.getByText('오늘의 오답노트 · 1장')).toBeTruthy());
}

/**
 * 후보가 여럿인 칸으로 몬다 — 말풍선이 뜨는 자리까지만.
 * `radical × calc_slip`은 후보 3개다 (weakness-mistake-type-map.test.ts:49).
 */
async function walkToPick() {
  fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
  await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
  fireEvent.press(screen.getByText('맞아, 시작하자'));
  await waitFor(() => expect(screen.getByText('아, 이거였구나')).toBeTruthy());
  fireEvent.press(screen.getByText('아, 이거였구나'));
  await waitFor(() => expect(screen.getByText('9를 더하고 뺀다')).toBeTruthy());
  fireEvent.press(screen.getByText('9를 더하고 뺀다'));
  await waitFor(() => expect(screen.getByText('25를 더하고 뺀다')).toBeTruthy());
  fireEvent.press(screen.getByText('25를 더하고 뺀다'));
  await waitFor(() => expect(screen.getByText('잘 모르겠어')).toBeTruthy());
}

/** 후보 3개가 나오는 분석 결과 — 무리수 풀이 + 계산 손실수 */
function radicalResult() {
  return makeResult({
    predictedMethodId: 'radical',
    candidateMethodIds: ['radical'],
    errorCandidates: [makeCandidate({ mistakeType: 'calc_slip' })],
    errorConfidence: 0.9,
  });
}

function eventNamed(name: string) {
  return mockLog.mock.calls.find(([n]) => n === name);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAskSource.mockResolvedValue('library');
  mockPick.mockResolvedValue({ uri: 'file://photo.jpg', width: 3024, height: 4032 });
  mockDownscale.mockResolvedValue('data:image/jpeg;base64,AAAA');
  mockReadNotes.mockResolvedValue([]);
  let submissionCount = 0;
  mockNewSubmissionId.mockImplementation(() => `sub-${(submissionCount += 1)}`);
  mockVerify.mockResolvedValue({ verdict: 'match', reason: 'match', ms: 10 });
  mockDiagnose.mockResolvedValue(null);
});

describe('PhotoFlowScreen', () => {
  it('계정 키가 있으면 오답노트를 그 계정으로 남긴다', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 }),
    );
    render(<PhotoFlowScreen accountKey="user:abc" />);

    await walkToNote();

    await waitFor(() => expect(mockSaveNote).toHaveBeenCalledTimes(1));
    const [accountKey, note] = mockSaveNote.mock.calls[0];
    expect(accountKey).toBe('user:abc');
    expect(note.id).toMatch(/^photo-/);
    expect(note.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(note.schemaVersion).toBe(1);
    // 화면에 뜬 이름표가 아니라 원본 id가 실려야 나중에 셀 수 있다
    expect(typeof note.methodId).toBe('string');
    expect(typeof note.mistakeType).toBe('string');
  });

  it('계정 헤더 함수를 받으면 그 계정의 헤더를 사진 분석 요청에 싣는다 (사용량 원장)', async () => {
    mockAnalyze.mockResolvedValue(makeResult());
    const getRemoteAuthHeaders = jest.fn(async (key: string) => ({ 'x-dasida-account-key': key }));
    render(<PhotoFlowScreen accountKey="user:abc" getRemoteAuthHeaders={getRemoteAuthHeaders} />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(1));
    expect(getRemoteAuthHeaders).toHaveBeenCalledWith('user:abc');
    const [imageDataUrl, options] = mockAnalyze.mock.calls[0];
    expect(imageDataUrl).toBe('data:image/jpeg;base64,AAAA');
    expect(options.headers).toEqual({ 'x-dasida-account-key': 'user:abc' });
  });

  it('계정 키가 없으면 헤더 함수를 안 부르고 헤더 없이 보낸다', async () => {
    mockAnalyze.mockResolvedValue(makeResult());
    const getRemoteAuthHeaders = jest.fn(async () => ({}));
    render(<PhotoFlowScreen getRemoteAuthHeaders={getRemoteAuthHeaders} />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(1));
    expect(getRemoteAuthHeaders).not.toHaveBeenCalled();
    expect(mockAnalyze.mock.calls[0][1].headers).toEqual({});
  });

  it('계정 키가 없으면 저장하지 않는다 — 흐름은 그대로 돈다', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 }),
    );
    render(<PhotoFlowScreen />);

    await walkToNote();

    expect(mockSaveNote).not.toHaveBeenCalled();
  });

  it('지난 노트가 없으면 첫 화면에 그 줄을 안 낸다 — 처음 온 학생 화면을 안 건드린다', async () => {
    render(<PhotoFlowScreen accountKey="user:abc" />);

    await waitFor(() => expect(mockReadNotes).toHaveBeenCalledWith('user:abc'));
    expect(screen.queryByText(/지난 오답노트/)).toBeNull();
  });

  it('지난 노트가 있으면 첫 화면에 몇 장인지 뜬다', async () => {
    mockReadNotes.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);

    render(<PhotoFlowScreen accountKey="user:abc" />);

    await waitFor(() => expect(screen.getByText('지난 오답노트 3장 보기')).toBeTruthy());
  });

  it('업로드 화면부터 뜬다', () => {
    render(<PhotoFlowScreen />);
    expect(screen.getByText('틀린 문제 사진 올리기')).toBeTruthy();
  });

  it('단언 갈래면 읽어낸 방법이 대화에 뜬다', async () => {
    mockAnalyze.mockResolvedValue(makeResult());
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(screen.getByText(/완전제곱식으로 접근했네/)).toBeTruthy());
    expect(screen.getByText('맞아, 시작하자')).toBeTruthy();
  });

  it('풀이 흔적이 없으면 다시 찍기를 안내한다', async () => {
    mockAnalyze.mockResolvedValue(makeResult({ hasSolvingWork: false }));
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(screen.getByText('📷 풀이까지 나오게 다시 찍기')).toBeTruthy());
  });

  it('분석이 실패하면 업로드 화면으로 돌아가고 이유를 보여준다', async () => {
    mockAnalyze.mockRejectedValue(new Error('분석 서버가 500으로 답했어'));
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(screen.getByText('분석 서버가 500으로 답했어')).toBeTruthy());
    expect(screen.getByText('틀린 문제 사진 올리기')).toBeTruthy();
  });

  it('사진부터 오답노트까지 한 바퀴 돈다', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 }),
    );
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());

    // 방법 확정 → 짚기
    fireEvent.press(screen.getByText('맞아, 시작하자'));
    await waitFor(() => expect(screen.getByText('아, 이거였구나')).toBeTruthy());
    fireEvent.press(screen.getByText('아, 이거였구나'));
    await waitFor(() => expect(screen.getByText('9를 더하고 뺀다')).toBeTruthy());
    fireEvent.press(screen.getByText('9를 더하고 뺀다'));

    // 재도전 → 정답
    await waitFor(() => expect(screen.getByText('25를 더하고 뺀다')).toBeTruthy());
    fireEvent.press(screen.getByText('25를 더하고 뺀다'));

    // 오답노트 한 장
    await waitFor(() => expect(screen.getByText('오늘의 오답노트 · 1장')).toBeTruthy());
    expect(screen.getByText('오늘 확인: 쪽지시험 ✔ · 재도전 ✔')).toBeTruthy();
    expect(screen.getByText('#완전제곱식 #절차 누락')).toBeTruthy();
  });

  it('쪽지를 틀리고 재도전도 틀리면 노트에 ✗로 남는다', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 }),
    );
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 시작하자'));
    await waitFor(() => expect(screen.getByText('아, 이거였구나')).toBeTruthy());
    fireEvent.press(screen.getByText('아, 이거였구나'));

    await waitFor(() => expect(screen.getByText('3을 더하고 뺀다')).toBeTruthy());
    fireEvent.press(screen.getByText('3을 더하고 뺀다')); // 오답
    await waitFor(() => expect(screen.getByText('10을 더하고 뺀다')).toBeTruthy());
    fireEvent.press(screen.getByText('10을 더하고 뺀다')); // 오답

    await waitFor(() => expect(screen.getByText('오늘 확인: 쪽지시험 ✗ · 재도전 ✗')).toBeTruthy());
  });

  it('재도전 문제가 깨져 오면 조용히 건너뛰고 노트는 그대로 낸다', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({
        // 정답 번호가 보기 밖 — 그대로 두면 학생에게 정답이 "undefined"로 노출된다
        errorCandidates: [makeCandidate({ retryAnswerIndex: 9 })],
        errorConfidence: 0.9,
      }),
    );
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 시작하자'));
    await waitFor(() => expect(screen.getByText('아, 이거였구나')).toBeTruthy());
    fireEvent.press(screen.getByText('아, 이거였구나'));
    await waitFor(() => expect(screen.getByText('9를 더하고 뺀다')).toBeTruthy());
    fireEvent.press(screen.getByText('9를 더하고 뺀다'));

    // 재도전 없이 바로 노트
    await waitFor(() => expect(screen.getByText('오늘의 오답노트 · 1장')).toBeTruthy());
    expect(screen.getByText('오늘 확인: 쪽지시험 ✔')).toBeTruthy();
    expect(screen.queryByText('25를 더하고 뺀다')).toBeNull();
  });

  it('[나 여기 이렇게 안 썼는데]면 멈춘다 — 노트·저장·복습 과제 없이 다시 찍기로', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({ errorCandidates: [makeCandidate({ mistakeType: 'concept_gap' })], errorConfidence: 0.9 }),
    );
    render(<PhotoFlowScreen accountKey="user:abc" />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 시작하자'));
    // 묻지 않고 말해준다 — 틀린 자리를 모르는 학생에게 "맞아?"는 거짓말을 시킨다(09.23 ⑤)
    await waitFor(() => expect(screen.getByText(/여기가 틀린 자리야/)).toBeTruthy());
    fireEvent.press(screen.getByText('나 여기 이렇게 안 썼는데'));

    await waitFor(() => expect(screen.getByText('📷 풀이가 선명하게 다시 찍기')).toBeTruthy());
    expect(screen.getByText(/내가 네 글씨를 잘못 읽었나 봐/)).toBeTruthy();
    expect(screen.queryByText('오늘의 오답노트 · 1장')).toBeNull();
    expect(mockSaveNote).not.toHaveBeenCalled();
    expect(eventNamed('photo_error_point_react')![1]).toEqual({ react: 'not_mine' });
  });

  it('[왜 틀린 건지 아직 모르겠어]면 개념 설명을 꺼내고 쪽지로 간다', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({
        errorCandidates: [
          makeCandidate({ concept: { rule: '완전제곱식은 반의 제곱을 더하고 뺀다.', violation: '더하기만 하고 안 뺐어.' } }),
        ],
        errorConfidence: 0.9,
      }),
    );
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 시작하자'));
    await waitFor(() => expect(screen.getByText('왜 틀린 건지 아직 모르겠어')).toBeTruthy());
    fireEvent.press(screen.getByText('왜 틀린 건지 아직 모르겠어'));

    await waitFor(() => expect(screen.getByText('9를 더하고 뺀다')).toBeTruthy());
    expect(screen.getByText('완전제곱식은 반의 제곱을 더하고 뺀다.')).toBeTruthy();
    expect(screen.getByText('더하기만 하고 안 뺐어.')).toBeTruthy();
  });

  it('오늘은 여기까지·노트·약점 카드 뒤엔 [처음부터 다시]', async () => {
    // 방법은 맞는데 오류 후보가 없다 → 설문 → 약점 카드 (1.0.9는 여기서 노트 없이 끝났다)
    mockAnalyze.mockResolvedValue(makeResult());
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 시작하자'));
    await waitFor(() => expect(screen.getByText('마지막에 답 쓸 때 실수한 것 같아')).toBeTruthy());
    fireEvent.press(screen.getByText('마지막에 답 쓸 때 실수한 것 같아'));

    await waitFor(() => expect(screen.getByText('오늘 찾은 약점 — 완전제곱식 × 마무리 해석')).toBeTruthy());
    expect(screen.getByText('처음부터 다시')).toBeTruthy();
    fireEvent.press(screen.getByText('처음부터 다시'));
    await waitFor(() => expect(screen.getByText('틀린 문제 사진 올리기')).toBeTruthy());
  });

  it('오답노트 카드에 📌 접는 기준이 뜬다 — 웹 카드와 같은 문장 (🔒 10.01)', async () => {
    mockAnalyze.mockResolvedValue(makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 }));
    render(<PhotoFlowScreen />);

    await walkToNote();

    expect(screen.getByText(/📌 "수능장에서 이 풀이를 생각해 낼 수 있는가"/)).toBeTruthy();
  });

  it('화면을 떠난 뒤 늦게 온 검산은 노트도 저장도 복습 과제도 안 만든다 (astra 4)', async () => {
    mockAnalyze.mockResolvedValue(makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 }));
    const resolvers: ((v: unknown) => void)[] = [];
    mockVerify.mockImplementation(() => new Promise((resolve) => resolvers.push(resolve)));
    const store = memStore();
    const load = jest.spyOn(store, 'load');
    const { unmount } = render(<PhotoFlowScreen accountKey="user:abc" reviewTaskStore={store} />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 시작하자'));
    await waitFor(() => expect(screen.getByText('아, 이거였구나')).toBeTruthy());
    fireEvent.press(screen.getByText('아, 이거였구나')); // 쪽지 검산을 기다린다

    unmount(); // 헤더 뒤로가기
    // 끊기지 않았다면 쪽지 건너뜀 → 재도전 건너뜀 → 노트 저장까지 간다
    await act(async () => {
      resolvers.forEach((resolve) => resolve({ verdict: 'skip', reason: 'none', ms: 10 }));
    });
    await act(async () => {});

    expect(mockSaveNote).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
    expect(eventNamed('photo_note_shown')).toBeUndefined();
  });
});

/**
 * 1.0.10 — 웹에서 먼저 바뀐 것들을 앱에 똑같이 (10.01 기윤 🔒).
 * 사진 거르기 문구 · 다시 찍기 번호 · 쪽지·재도전 검산.
 */
describe('1.0.10 — 웹과 같게', () => {
  // functions/src/photo-gate.ts buildGateBlockedResult와 같은 모양
  function gated(decision: string) {
    return makeResult({
      hasSolvingWork: false,
      predictedMethodId: 'unknown',
      confidence: 0,
      candidateMethodIds: ['unknown'],
      reason: 'gate',
      needsManualSelection: true,
      gate: { decision, rotation: null, width: 524, height: 813 },
    });
  }

  it('사진마다 번호를 붙여 보내고, 처음엔 retakeOf가 없다', async () => {
    mockAnalyze.mockResolvedValue(makeResult());
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(1));
    expect(mockAnalyze.mock.calls[0][1]).toMatchObject({ submissionId: 'sub-1', retakeOf: null });
  });

  it('작아서 걸리면 "풀이 과정을 못 찾았어"가 아니라 웹과 같은 말을 한다', async () => {
    mockAnalyze.mockResolvedValue(gated('blocked_small'));
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(screen.getByText('다른 사진 올리기')).toBeTruthy());
    expect(
      screen.getByText(
        '화면에선 괜찮아 보여도, 이 사진은 내가 글씨를 또렷하게 못 읽어. 캡처나 잘라낸 사진 말고, 찍은 원본을 올려줘.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/풀이 과정을 못 찾았어/)).toBeNull();
    expect(eventNamed('photo_analyzed')![1]).toMatchObject({ gate_decision: 'blocked_small' });
  });

  it('누워서 걸리면 세로로 다시 찍어달라고 한다', async () => {
    mockAnalyze.mockResolvedValue(gated('blocked_rotation'));
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(screen.getByText('📷 세로로 다시 찍기')).toBeTruthy());
    expect(screen.getByText(/사진이 옆으로 누워 있어/)).toBeTruthy();
  });

  it('걸린 뒤 다시 올리면 직전 번호를 retakeOf로 싣는다 — 원장이 "다시 찍어 왔나"를 센다', async () => {
    mockAnalyze.mockResolvedValueOnce(gated('blocked_small')).mockResolvedValueOnce(makeResult());
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('다른 사진 올리기')).toBeTruthy());
    fireEvent.press(screen.getByText('다른 사진 올리기'));

    await waitFor(() => expect(screen.getByText('틀린 문제 사진 올리기')).toBeTruthy());
    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(2));
    expect(mockAnalyze.mock.calls[1][1]).toMatchObject({ submissionId: 'sub-2', retakeOf: 'sub-1' });
  });

  it('처음부터 다시는 retakeOf를 잇지 않는다', async () => {
    mockAnalyze.mockResolvedValueOnce(gated('blocked_small')).mockResolvedValue(makeResult({ hasSolvingWork: false }));
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('오늘은 여기까지')).toBeTruthy());
    fireEvent.press(screen.getByText('오늘은 여기까지'));
    await waitFor(() => expect(screen.getByText('알겠어. 다른 문제 생기면 또 올려줘.')).toBeTruthy());
    fireEvent.press(screen.getByText('처음부터 다시'));

    await waitFor(() => expect(screen.getByText('틀린 문제 사진 올리기')).toBeTruthy());
    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(2));
    expect(mockAnalyze.mock.calls[1][1]).toMatchObject({ retakeOf: null });
  });

  it('분석 결과가 닿자마자 0번 후보의 쪽지·재도전을 정답 번호와 함께 검산에 보낸다', async () => {
    mockAnalyze.mockResolvedValue(makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 }));
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(mockVerify).toHaveBeenCalledTimes(2));
    expect(mockVerify.mock.calls.map(([body]) => [body.kind, body.marked, body.submissionId])).toEqual([
      ['check', 1, 'sub-1'],
      ['retry', 0, 'sub-1'],
    ]);
  });

  it('오류를 짚을 수 없는 결과면 검산을 안 보낸다 — 쪽지 차례가 안 온다', async () => {
    mockAnalyze.mockResolvedValue(makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.2 }));
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('쪽지가 검산을 통과 못 하면 안 내고, 노트에 ✗ 대신 쪽지 칸을 비운다', async () => {
    mockAnalyze.mockResolvedValue(makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 }));
    mockVerify.mockImplementation(async (body: { kind: string }) =>
      body.kind === 'check'
        ? { verdict: 'skip', reason: 'none', ms: 10 }
        : { verdict: 'match', reason: 'match', ms: 10 },
    );
    render(<PhotoFlowScreen accountKey="user:abc" />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 시작하자'));
    await waitFor(() => expect(screen.getByText('아, 이거였구나')).toBeTruthy());
    fireEvent.press(screen.getByText('아, 이거였구나'));

    // 쪽지 없이 재도전으로 — 틀린 적이 없으니 "괜찮아" 톤이 아니다
    await waitFor(() => expect(screen.getByText('25를 더하고 뺀다')).toBeTruthy());
    expect(screen.queryByText('9를 더하고 뺀다')).toBeNull();
    expect(screen.getByText(/그럼 진짜 마지막/)).toBeTruthy();
    expect(screen.queryByText(/괜찮아, 헷갈리라고/)).toBeNull();
    fireEvent.press(screen.getByText('25를 더하고 뺀다'));

    await waitFor(() => expect(screen.getByText('오늘 확인: 재도전 ✔')).toBeTruthy());
    await waitFor(() => expect(mockSaveNote).toHaveBeenCalledTimes(1));
    expect(mockSaveNote.mock.calls[0][1]).toMatchObject({ checkSkipped: true });
    expect(eventNamed('photo_quiz_verify')![1]).toMatchObject({ kind: 'check', result: 'skip', reason: 'none' });
  });

  it('재도전이 검산을 통과 못 하면 안 내고 노트로 간다', async () => {
    mockAnalyze.mockResolvedValue(makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 }));
    mockVerify.mockImplementation(async (body: { kind: string }) =>
      body.kind === 'retry'
        ? { verdict: 'skip', reason: 'ambiguous', ms: 10 }
        : { verdict: 'match', reason: 'match', ms: 10 },
    );
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 시작하자'));
    await waitFor(() => expect(screen.getByText('아, 이거였구나')).toBeTruthy());
    fireEvent.press(screen.getByText('아, 이거였구나'));
    await waitFor(() => expect(screen.getByText('9를 더하고 뺀다')).toBeTruthy());
    fireEvent.press(screen.getByText('9를 더하고 뺀다'));

    await waitFor(() => expect(screen.getByText('오늘의 오답노트 · 1장')).toBeTruthy());
    expect(screen.getByText('오늘 확인: 쪽지시험 ✔')).toBeTruthy();
    expect(screen.queryByText('25를 더하고 뺀다')).toBeNull();
  });

  it('검산이 5초 안에 안 오면 쪽지를 건너뛰고, 재도전은 더 안 기다린다 — 빈 화면 10초 방지', async () => {
    mockAnalyze.mockResolvedValue(makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 }));
    mockVerify.mockImplementation(() => new Promise(() => {})); // 끝내 안 온다
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 시작하자'));
    await waitFor(() => expect(screen.getByText('아, 이거였구나')).toBeTruthy());

    jest.useFakeTimers();
    try {
      fireEvent.press(screen.getByText('아, 이거였구나'));
      await act(async () => {
        jest.advanceTimersByTime(4_999);
      });
      expect(screen.queryByText('오늘의 오답노트 · 1장')).toBeNull(); // 아직 기다리는 중
      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      // 재도전의 0초 대기도 타이머라 한 번 더 돌린다
      await act(async () => {
        jest.runOnlyPendingTimers();
      });
    } finally {
      jest.useRealTimers();
    }

    // 쪽지 5초를 태웠으니 재도전은 0초 — 둘 다 건너뛰고 바로 노트
    await waitFor(() => expect(screen.getByText('오늘의 오답노트 · 1장')).toBeTruthy());
    expect(screen.queryByText('9를 더하고 뺀다')).toBeNull();
    expect(screen.queryByText('25를 더하고 뺀다')).toBeNull();
    expect(screen.queryByText(/오늘 확인/)).toBeNull();
    const verifyEvents = mockLog.mock.calls.filter(([name]) => name === 'photo_quiz_verify').map(([, p]) => p);
    expect(verifyEvents).toEqual([
      expect.objectContaining({ kind: 'check', result: 'skip', reason: 'wait_timeout' }),
      expect.objectContaining({ kind: 'retry', result: 'skip', reason: 'wait_timeout' }),
    ]);
  });

  it('풀이가 없으면 학생 말로 받고, AI가 확신하면 그 방법으로 바로 잇는다 (④ 입력칸)', async () => {
    mockAnalyze.mockResolvedValue(makeResult({ hasSolvingWork: false }));
    mockDiagnose.mockResolvedValue({
      predictedMethodId: 'diff',
      confidence: 0.9,
      candidateMethodIds: ['diff'],
      needsManualSelection: false,
      reason: '',
    });
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('✏️ 직접 알려줄게')).toBeTruthy());
    fireEvent.press(screen.getByText('✏️ 직접 알려줄게'));

    const input = await screen.findByPlaceholderText(INPUT_PLACEHOLDER);
    // 빈 글자는 안 보낸다
    fireEvent.changeText(input, '   ');
    fireEvent.press(screen.getByText('보내기'));
    expect(mockDiagnose).not.toHaveBeenCalled();

    fireEvent.changeText(input, '도함수 구해서 0 되는 데 찾았어');
    fireEvent(input, 'submitEditing'); // 키보드의 보내기
    await waitFor(() => expect(screen.getByText(/미분으로 풀었구나/)).toBeTruthy());
    expect(screen.getByText('도함수 구해서 0 되는 데 찾았어')).toBeTruthy(); // 내 말풍선
    expect(screen.queryByPlaceholderText(INPUT_PLACEHOLDER)).toBeNull(); // 보내면 입력칸이 닫힌다
    expect(mockDiagnose).toHaveBeenCalledTimes(1);
    expect(screen.getByText('식은 세웠는데 계산에서 미끄러졌어')).toBeTruthy(); // 미분 설문
  });

  it('두 번 못 알아들으면 전체 목록 — [잘 모르겠어]면 방법 없이 약점 카드', async () => {
    mockAnalyze.mockResolvedValue(makeResult({ hasSolvingWork: false }));
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('✏️ 직접 알려줄게')).toBeTruthy());
    fireEvent.press(screen.getByText('✏️ 직접 알려줄게'));
    fireEvent.changeText(await screen.findByPlaceholderText(INPUT_PLACEHOLDER), 'ㅁㄴㅇㄹ');
    fireEvent.press(screen.getByText('보내기'));
    await waitFor(() => expect(screen.getByText(/잘 못 알아들었어/)).toBeTruthy());
    fireEvent.changeText(await screen.findByPlaceholderText(INPUT_PLACEHOLDER), '그냥 했어');
    fireEvent.press(screen.getByText('보내기'));

    await waitFor(() => expect(screen.getByText('그럼 전체 목록에서 직접 골라볼래?')).toBeTruthy());
    fireEvent.press(screen.getByText('잘 모르겠어'));
    await waitFor(() => expect(screen.getByText('이 방법의 원리 자체가 잘 안 잡혔어')).toBeTruthy());
    // 방금 내 말풍선에도 '잘 모르겠어'가 있어서 버튼으로 집는다
    fireEvent.press(screen.getByRole('button', { name: '잘 모르겠어' }));

    await waitFor(() => expect(screen.getByText('오늘 찾은 약점 — 방법 미상 × 개념 구멍')).toBeTruthy());
  });

  it('후보가 둘이어도 검산은 0번만 — 2번 후보로 넘어가는 사다리는 없다(웹과 같게)', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({
        errorCandidates: [makeCandidate(), makeCandidate({ quote: '4x + 4', checkAnswerIndex: 2 })],
        errorConfidence: 0.9,
      }),
    );
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 시작하자'));
    await waitFor(() => expect(screen.getByText('아, 이거였구나')).toBeTruthy());

    expect(mockVerify).toHaveBeenCalledTimes(2);
    expect(mockVerify.mock.calls.map(([body]) => body.marked)).toEqual([1, 0]);
    expect(screen.queryByText(/"4x \+ 4"/)).toBeNull(); // 2번 후보 인용은 안 나온다
  });
});

/**
 * 1.0.8이 재려는 숫자: "실제 학생 사진에서 약점 이름이 몇 % 붙는가."
 *
 * 08.27 기준 features/photo 전체에 계측이 0건이었다 — 진단·연습·복습·기출·홈은
 * 전부 붙어 있는데 사진만 없었다. 그대로 내보내면 100장이 모여도 셀 게 없다.
 *
 * 특히 마지막 이벤트의 weakness_count=0(빈손)이 핵심이다.
 * 통역표 186칸 중 131칸(70%)이 빈손이고, 그게 진단 트리가 얕은 자리다.
 * 안 붙은 걸 세지 못하면 "몇 %"의 분모가 사라진다.
 */
describe('사진 flow 계측', () => {
  it('사진을 고르면 photo_submit을 남긴다', async () => {
    mockAnalyze.mockResolvedValue(makeResult());
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(eventNamed('photo_submit')).toBeTruthy());
  });

  it('사진첩에서 취소하면 photo_submit을 안 남긴다', async () => {
    mockPick.mockResolvedValue(null);
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(mockPick).toHaveBeenCalled());
    expect(eventNamed('photo_submit')).toBeFalsy();
  });

  it('묻는 창에서 취소하면 사진첩도 카메라도 안 열린다', async () => {
    mockAskSource.mockResolvedValue(null);
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(mockAskSource).toHaveBeenCalled());
    expect(mockPick).not.toHaveBeenCalled();
    expect(eventNamed('photo_submit')).toBeFalsy();
  });

  it.each(['camera', 'library'] as const)(
    '%s를 고르면 그대로 사진을 열고 photo_submit에 실어 보낸다',
    async (source) => {
      mockAskSource.mockResolvedValue(source);
      mockAnalyze.mockResolvedValue(makeResult());
      render(<PhotoFlowScreen />);

      fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

      await waitFor(() => expect(eventNamed('photo_submit')).toBeTruthy());
      expect(mockPick).toHaveBeenCalledWith(source);
      expect(eventNamed('photo_submit')?.[1]).toEqual({ source });
    },
  );

  it('분석이 되면 photo_analyzed에 success: true와 읽어낸 방법을 싣는다', async () => {
    mockAnalyze.mockResolvedValue(makeResult());
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(eventNamed('photo_analyzed')).toBeTruthy());
    expect(eventNamed('photo_analyzed')![1]).toMatchObject({
      success: true,
      method_id: 'cps',
      has_solving_work: true,
    });
  });

  it('분석이 실패하면 photo_analyzed에 success: false를 남긴다', async () => {
    mockAnalyze.mockRejectedValue(new Error('분석 서버가 500으로 답했어'));
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));

    await waitFor(() => expect(eventNamed('photo_analyzed')).toBeTruthy());
    expect(eventNamed('photo_analyzed')![1]).toMatchObject({ success: false });
  });

  it('약점 이름이 붙으면 photo_weakness_labeled에 labeled: true로 남는다', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({
        errorCandidates: [makeCandidate({ mistakeType: 'concept_gap' })],
        errorConfidence: 0.9,
      }),
    );
    render(<PhotoFlowScreen />);
    await walkToNote();

    const params = eventNamed('photo_weakness_labeled')![1];
    expect(params).toMatchObject({
      method_id: 'cps',
      mistake_type: 'concept_gap',
      labeled: true,
    });
    expect(params.weakness_count).toBeGreaterThan(0);
  });

  /**
   * 노트 없이 끝나던 세 갈래(1.0.9 photo_dead_end)는 1.0.10(B)부터 웹처럼 설문 → 약점 카드로 간다.
   * 짚기 사다리(pointing_rejected)는 없어졌고 그 자리는 [나 여기 이렇게 안 썼는데]다.
   * 카드로 끝난 수 : 노트로 끝난 수 — 카드 쪽이 많아지면 카드 저장을 붙인다(🔒 10.01).
   */
  it('방법은 맞는데 틀린 데를 못 찾으면 설문 → 약점 카드 — photo_weakness_card_shown', async () => {
    // 후보 0개 — 짚기로 못 가고 예측 방법은 맞은 갈래
    mockAnalyze.mockResolvedValue(makeResult());
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 시작하자'));

    await waitFor(() => expect(screen.getByText(/그런데 좀 신기해/)).toBeTruthy());
    fireEvent.press(screen.getByText('마지막에 답 쓸 때 실수한 것 같아'));

    await waitFor(() => expect(eventNamed('photo_weakness_card_shown')).toBeTruthy());
    expect(eventNamed('photo_method_confirm')![1]).toEqual({ answer: 'yes', mode: 'assert' });
    expect(eventNamed('photo_survey_pick')![1]).toEqual({ mistake: 'answer_read' });
    expect(eventNamed('photo_weakness_card_shown')![1]).toEqual({ method: 'cps', mistake: 'answer_read' });
    expect(eventNamed('photo_dead_end')).toBeUndefined();
  });

  it('학생이 방법을 직접 쓰면 그 방법으로 설문 → 약점 카드 (AI가 못 알아들어 키워드로 좁힘)', async () => {
    mockAnalyze.mockResolvedValue(makeResult());
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('아니야, 다른 방법으로 풀었어')).toBeTruthy());
    fireEvent.press(screen.getByText('아니야, 다른 방법으로 풀었어'));

    // 좁힌 목록에도 없다며 학생 말로 쓴다 → AI 실패(null) → 키워드로 후보
    await waitFor(() => expect(screen.getByText('여기에도 없어, 직접 쓸게')).toBeTruthy());
    fireEvent.press(screen.getByText('여기에도 없어, 직접 쓸게'));
    await waitFor(() => expect(screen.getByPlaceholderText(INPUT_PLACEHOLDER)).toBeTruthy());
    fireEvent.changeText(screen.getByPlaceholderText(INPUT_PLACEHOLDER), '미분해서 접선 기울기 구했어');
    fireEvent.press(screen.getByText('보내기'));
    await waitFor(() => expect(screen.getByText('미분')).toBeTruthy());
    expect(mockDiagnose).toHaveBeenCalledWith('미분해서 접선 기울기 구했어', { problemId: 'photo-flow-app' });
    fireEvent.press(screen.getByText('미분'));
    await waitFor(() => expect(screen.getByText('식은 세웠는데 계산에서 미끄러졌어')).toBeTruthy());
    fireEvent.press(screen.getByText('식은 세웠는데 계산에서 미끄러졌어'));

    await waitFor(() => expect(screen.getByText('오늘 찾은 약점 — 미분 × 계산 손실수')).toBeTruthy());
    expect(eventNamed('photo_weakness_card_shown')![1]).toEqual({ method: 'diff', mistake: 'calc_slip' });
    expect(eventNamed('photo_dead_end')).toBeUndefined();
  });

  it('오답노트까지 가면 photo_dead_end를 안 남긴다 — 분자와 분모가 겹치면 안 된다', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 }),
    );
    render(<PhotoFlowScreen />);
    await walkToNote();

    expect(eventNamed('photo_weakness_labeled')).toBeTruthy();
    expect(eventNamed('photo_dead_end')).toBeFalsy();
  });

  it('빈손 칸이면 labeled: false · weakness_count: 0으로 남는다 — 186칸 중 131칸이 이 경우다', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({
        errorCandidates: [makeCandidate({ mistakeType: 'setup_error' })],
        errorConfidence: 0.9,
      }),
    );
    render(<PhotoFlowScreen />);
    await walkToNote();

    expect(eventNamed('photo_weakness_labeled')![1]).toMatchObject({
      method_id: 'cps',
      mistake_type: 'setup_error',
      labeled: false,
      weakness_count: 0,
    });
  });

  // ── 말풍선 — 후보가 여럿일 때 학생에게 묻는다 (2026.08.11 🔒 · 09.20 구현) ──

  it('후보가 여럿이면 노트를 내기 전에 묻고, 답하기 전에는 저장하지 않는다', async () => {
    mockAnalyze.mockResolvedValue(radicalResult());
    render(<PhotoFlowScreen accountKey="user:abc" />);

    await walkToPick();

    // 질문이 떴고 노트는 아직 없다
    expect(screen.queryByText('오늘의 오답노트 · 1장')).toBeNull();
    expect(mockSaveNote).not.toHaveBeenCalled();

    // 후보 3개 + 「잘 모르겠어」 = 버튼 4개. 문구는 diagnosisTree의 선택지를 쓴다
    expect(screen.getByText('√를 간소화하거나 묶는 단계가 헷갈렸어요.')).toBeTruthy();
    expect(screen.getByText('분모 유리화 과정에서 실수했어요.')).toBeTruthy();
    expect(screen.getByText('켤레식으로 유리화하는 계산에서 실수했어요.')).toBeTruthy();
    expect(screen.getByText('잘 모르겠어')).toBeTruthy();
  });

  it('고른 약점이 primaryWeaknessId에 박히고 후보 목록은 그대로 남는다', async () => {
    mockAnalyze.mockResolvedValue(radicalResult());
    render(<PhotoFlowScreen accountKey="user:abc" />);

    await walkToPick();
    fireEvent.press(screen.getByText('분모 유리화 과정에서 실수했어요.'));

    await waitFor(() => expect(mockSaveNote).toHaveBeenCalledTimes(1));
    const [, note] = mockSaveNote.mock.calls[0];
    expect(note.primaryWeaknessId).toBe('rationalization_error');
    // 후보는 안 줄인다 — 고른 건 primary뿐이다
    expect(note.weaknessIds).toHaveLength(3);
  });

  it('「잘 모르겠어」를 누르면 primaryWeaknessId는 null이고 노트는 그대로 나온다', async () => {
    mockAnalyze.mockResolvedValue(radicalResult());
    render(<PhotoFlowScreen accountKey="user:abc" />);

    await walkToPick();
    fireEvent.press(screen.getByText('잘 모르겠어'));

    await waitFor(() => expect(screen.getByText('오늘의 오답노트 · 1장')).toBeTruthy());
    const [, note] = mockSaveNote.mock.calls[0];
    expect(note.primaryWeaknessId).toBeNull();
    expect(note.weaknessIds).toHaveLength(3);
  });

  it('고른 결과가 photo_weakness_picked에 남는다 — 이탈을 세려면 분모가 따로 있어야 한다', async () => {
    mockAnalyze.mockResolvedValue(radicalResult());
    render(<PhotoFlowScreen accountKey="user:abc" />);

    await walkToPick();

    // 질문이 뜬 시점에 labeled는 이미 찍혀 있다 (분모)
    expect(eventNamed('photo_weakness_labeled')![1]).toMatchObject({
      weakness_count: 3,
      labeled: true,
    });
    expect(eventNamed('photo_weakness_picked')).toBeUndefined();

    fireEvent.press(screen.getByText('켤레식으로 유리화하는 계산에서 실수했어요.'));

    await waitFor(() => expect(eventNamed('photo_weakness_picked')).toBeTruthy());
    expect(eventNamed('photo_weakness_picked')![1]).toMatchObject({
      method_id: 'radical',
      mistake_type: 'calc_slip',
      candidate_count: 3,
      picked: 'g2_radical_rationalize',
    });
  });

  it('후보가 하나면 묻지 않고 바로 박는다', async () => {
    // cps × concept_gap 은 후보 1개(max_min_judgement_confusion)
    mockAnalyze.mockResolvedValue(
      makeResult({
        errorCandidates: [makeCandidate({ mistakeType: 'concept_gap' })],
        errorConfidence: 0.9,
      }),
    );
    render(<PhotoFlowScreen accountKey="user:abc" />);

    await walkToNote();

    expect(screen.queryByText('잘 모르겠어')).toBeNull();
    const [, note] = mockSaveNote.mock.calls[0];
    expect(note.weaknessIds).toHaveLength(1);
    expect(note.primaryWeaknessId).toBe(note.weaknessIds[0]);
  });

  it('후보가 없으면 묻지도 박지도 않는다 — 빈 칸 130개가 여기로 온다', async () => {
    // cps × procedure_miss 는 빈 칸
    mockAnalyze.mockResolvedValue(
      makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 }),
    );
    render(<PhotoFlowScreen accountKey="user:abc" />);

    await walkToNote();

    expect(screen.queryByText('잘 모르겠어')).toBeNull();
    const [, note] = mockSaveNote.mock.calls[0];
    expect(note.weaknessIds).toHaveLength(0);
    expect(note.primaryWeaknessId).toBeNull();
  });
});

// ── E칸 — 노트가 복습 과제가 된다 (09.23 🔒 source 'photo', AI 짚기 갈래만) ──

// 부정 테스트는 load를 본다 — spawnMistakeReviewTasks는 load를 먼저 부르고 saveAll은 몇 틱 뒤라,
// saveAll만 보면 잘못 불렸어도 단정 시점엔 아직 안 불려 통과할 수 있다 (Fable 09.23).
function memStore(): ReviewTaskStore & { all: () => ReviewTask[] } {
  let tasks: ReviewTask[] = [];
  return {
    load: async () => [...tasks],
    saveAll: async (_k, next) => {
      tasks = [...next];
    },
    reset: async () => {
      tasks = [];
    },
    all: () => tasks,
  };
}

/** cps × concept_gap 은 후보 1개 칸이다 (위 「후보가 하나면 묻지 않고 바로 박는다」와 같은 칸) */
function oneCandidateResult() {
  return makeResult({
    errorCandidates: [makeCandidate({ mistakeType: 'concept_gap' })],
    errorConfidence: 0.9,
  });
}

describe('PhotoFlowScreen — 복습 과제 (E칸)', () => {
  it("약점이 하나로 정해진 노트는 내일 day1 과제가 된다 — source 'photo', 노트 id로 묶인다", async () => {
    mockAnalyze.mockResolvedValue(oneCandidateResult());
    const store = memStore();
    render(<PhotoFlowScreen accountKey="user:abc" reviewTaskStore={store} />);

    await walkToNote();

    await waitFor(() => expect(store.all()).toHaveLength(1));
    const [, note] = mockSaveNote.mock.calls[0];
    const [task] = store.all();
    expect(task).toMatchObject({
      accountKey: 'user:abc',
      source: 'photo',
      sourceId: note.id,
      weaknessId: note.primaryWeaknessId,
      stage: 'day1',
      completed: false,
      scheduledFor: addDaysToToday(1),
    });
    expect(task.id).toBe(`${note.id}__${note.primaryWeaknessId}__day1`);
  });

  it('후보 중 학생이 고른 약점 하나만 과제가 된다', async () => {
    mockAnalyze.mockResolvedValue(radicalResult());
    const store = memStore();
    render(<PhotoFlowScreen accountKey="user:abc" reviewTaskStore={store} />);

    await walkToPick();
    fireEvent.press(screen.getByText('분모 유리화 과정에서 실수했어요.'));

    await waitFor(() => expect(store.all()).toHaveLength(1));
    expect(store.all()[0].weaknessId).toBe('rationalization_error');
  });

  it('「잘 모르겠어」면 과제가 안 생긴다 — 노트는 그대로', async () => {
    mockAnalyze.mockResolvedValue(radicalResult());
    const store = memStore();
    const load = jest.spyOn(store, 'load');
    render(<PhotoFlowScreen accountKey="user:abc" reviewTaskStore={store} />);

    await walkToPick();
    fireEvent.press(screen.getByText('잘 모르겠어'));

    await waitFor(() => expect(mockSaveNote).toHaveBeenCalledTimes(1));
    expect(load).not.toHaveBeenCalled();
  });

  it('약점 이름표가 없는 칸(빈 칸)이면 과제가 안 생긴다', async () => {
    // cps × procedure_miss 는 빈 칸
    mockAnalyze.mockResolvedValue(
      makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 }),
    );
    const store = memStore();
    const load = jest.spyOn(store, 'load');
    render(<PhotoFlowScreen accountKey="user:abc" reviewTaskStore={store} />);

    await walkToNote();

    await waitFor(() => expect(mockSaveNote).toHaveBeenCalledTimes(1));
    expect(load).not.toHaveBeenCalled();
  });

  it('계정 키가 없으면 과제도 안 만든다', async () => {
    mockAnalyze.mockResolvedValue(oneCandidateResult());
    const store = memStore();
    const load = jest.spyOn(store, 'load');
    render(<PhotoFlowScreen reviewTaskStore={store} />);

    await walkToNote();

    expect(load).not.toHaveBeenCalled();
  });

  it('과제 저장이 실패해도(서버 400 등) 노트 장면은 그대로 나온다', async () => {
    mockAnalyze.mockResolvedValue(oneCandidateResult());
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const store = memStore();
    store.saveAll = jest.fn().mockRejectedValue(new Error('HTTP 400'));
    render(<PhotoFlowScreen accountKey="user:abc" reviewTaskStore={store} />);

    await walkToNote();

    expect(screen.getByText('오늘의 오답노트 · 1장')).toBeTruthy();
    await waitFor(() => expect(warn).toHaveBeenCalled());
    warn.mockRestore();
  });
});
