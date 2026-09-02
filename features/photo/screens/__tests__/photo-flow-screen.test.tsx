import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// jest.mock은 babel이 import 위로 끌어올리므로 아래 import들이 목을 먼저 받는다
import { makeCandidate, makeResult } from '../../flow/__fixtures__/analysis';
import { downscaleToDataUrl, pickPhoto, requestAnalyze } from '../../flow/analyze-photo-request';
import { askPhotoSource } from '../../flow/ask-photo-source';
import { logEvent } from '@/features/analytics/log-event';
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

/** 흐름을 오답노트 한 장까지 몬다. 쪽지시험·재도전은 첫 보기를 누른다. */
async function walkToNote() {
  fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
  await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
  fireEvent.press(screen.getByText('맞아, 시작하자'));
  await waitFor(() => expect(screen.getByText('맞아, 거기서 틀렸어')).toBeTruthy());
  fireEvent.press(screen.getByText('맞아, 거기서 틀렸어'));
  await waitFor(() => expect(screen.getByText('그렇구나, 확인해볼래')).toBeTruthy());
  fireEvent.press(screen.getByText('그렇구나, 확인해볼래'));
  await waitFor(() => expect(screen.getByText('9를 더하고 뺀다')).toBeTruthy());
  fireEvent.press(screen.getByText('9를 더하고 뺀다'));
  await waitFor(() => expect(screen.getByText('25를 더하고 뺀다')).toBeTruthy());
  fireEvent.press(screen.getByText('25를 더하고 뺀다'));
  await waitFor(() => expect(screen.getByText('오늘의 오답노트 · 1장')).toBeTruthy());
}

function eventNamed(name: string) {
  return mockLog.mock.calls.find(([n]) => n === name);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAskSource.mockResolvedValue('library');
  mockPick.mockResolvedValue({ uri: 'file://photo.jpg', width: 3024, height: 4032 });
  mockDownscale.mockResolvedValue('data:image/jpeg;base64,AAAA');
});

describe('PhotoFlowScreen', () => {
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
    await waitFor(() => expect(screen.getByText('맞아, 거기서 틀렸어')).toBeTruthy());

    // 짚은 자리 인정 → 왜
    fireEvent.press(screen.getByText('맞아, 거기서 틀렸어'));
    await waitFor(() => expect(screen.getByText('그렇구나, 확인해볼래')).toBeTruthy());

    // 쪽지시험 → 정답
    fireEvent.press(screen.getByText('그렇구나, 확인해볼래'));
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
    await waitFor(() => expect(screen.getByText('맞아, 거기서 틀렸어')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 거기서 틀렸어'));
    await waitFor(() => expect(screen.getByText('그렇구나, 확인해볼래')).toBeTruthy());
    fireEvent.press(screen.getByText('그렇구나, 확인해볼래'));

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
    await waitFor(() => expect(screen.getByText('맞아, 거기서 틀렸어')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 거기서 틀렸어'));
    await waitFor(() => expect(screen.getByText('그렇구나, 확인해볼래')).toBeTruthy());
    fireEvent.press(screen.getByText('그렇구나, 확인해볼래'));
    await waitFor(() => expect(screen.getByText('9를 더하고 뺀다')).toBeTruthy());
    fireEvent.press(screen.getByText('9를 더하고 뺀다'));

    // 재도전 없이 바로 노트
    await waitFor(() => expect(screen.getByText('오늘의 오답노트 · 1장')).toBeTruthy());
    expect(screen.getByText('오늘 확인: 쪽지시험 ✔')).toBeTruthy();
    expect(screen.queryByText('25를 더하고 뺀다')).toBeNull();
  });

  it('짚은 자리가 아니라고 하면 두 번째를 짚고, 그것도 아니면 내가 틀렸다고 인정하고 끝낸다', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({
        errorCandidates: [makeCandidate(), makeCandidate({ quote: '4x + 4' })],
        errorConfidence: 0.9,
      }),
    );
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 시작하자'));

    await waitFor(() => expect(screen.getByText('아니야, 거기 아니야')).toBeTruthy());
    fireEvent.press(screen.getByText('아니야, 거기 아니야'));

    // 사다리 2번 — '아니야'는 앞서 내가 말한 말풍선에도 있어서 버튼으로 집는다
    await waitFor(() => expect(screen.getByText('맞아, 거기야')).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: '아니야' }));

    // 세 번째 시도는 없다. 학생이 읽는 말에 개발 일지가 한 글자도 없어야 한다 (8·9번)
    await waitFor(() => expect(screen.getByText(/내가 틀린 거야/)).toBeTruthy());
    expect(screen.getByText('그게 오늘 네 오답노트야.')).toBeTruthy();
    expect(screen.queryByText(/느낌 설문|오늘 만든 조각|망각곡선/)).toBeNull();
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
   * 오답노트를 못 받고 끝난 자리. 웹 28일 실측이 photo_submit 21 → note_shown 1이었고,
   * 그 20명이 어디로 갔는지 한 건도 안 남아 병목이 AI 감지율인지 이탈인지 못 갈랐다.
   * 이 세 도장이 빠지면 1.0.8은 분자만 있고 분모가 없다.
   */
  it('방법은 맞는데 틀린 데를 못 찾으면 no_error_found를 남긴다', async () => {
    // 후보 0개 — canPointAtError가 막히고 예측 방법은 맞은 갈래
    mockAnalyze.mockResolvedValue(makeResult());
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 시작하자'));

    await waitFor(() => expect(eventNamed('photo_dead_end')).toBeTruthy());
    expect(eventNamed('photo_dead_end')![1]).toMatchObject({
      reason: 'no_error_found',
      method_id: 'cps',
    });
  });

  it('학생이 방법을 직접 고르면 method_mismatch를 남긴다 — 고른 방법을 실어서', async () => {
    mockAnalyze.mockResolvedValue(makeResult());
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('아니야, 다른 방법으로 풀었어')).toBeTruthy());
    fireEvent.press(screen.getByText('아니야, 다른 방법으로 풀었어'));

    // 좁힌 목록에도 없다며 전체에서 AI 예측과 다른 방법을 고른다
    await waitFor(() => expect(screen.getByText('여기에도 없어')).toBeTruthy());
    fireEvent.press(screen.getByText('여기에도 없어'));
    await waitFor(() => expect(screen.getByText('미분')).toBeTruthy());
    fireEvent.press(screen.getByText('미분'));

    await waitFor(() => expect(eventNamed('photo_dead_end')).toBeTruthy());
    expect(eventNamed('photo_dead_end')![1]).toMatchObject({
      reason: 'method_mismatch',
      method_id: 'diff',
    });
  });

  it('짚어준 자리를 다 아니라고 하면 pointing_rejected에 시도 횟수를 실어 남긴다', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({
        errorCandidates: [makeCandidate(), makeCandidate({ quote: '4x + 4' })],
        errorConfidence: 0.9,
      }),
    );
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 시작하자'));

    await waitFor(() => expect(screen.getByText('아니야, 거기 아니야')).toBeTruthy());
    fireEvent.press(screen.getByText('아니야, 거기 아니야'));

    await waitFor(() => expect(screen.getByText('맞아, 거기야')).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: '아니야' }));

    await waitFor(() => expect(eventNamed('photo_dead_end')).toBeTruthy());
    expect(eventNamed('photo_dead_end')![1]).toMatchObject({
      reason: 'pointing_rejected',
      method_id: 'cps',
      attempts: 2,
    });
  });

  /**
   * 09.02 시뮬레이터에서 실제로 나온 것 — 후보가 1개뿐이면 한 번만 짚고 갈래 ③으로 오는데
   * 화면은 "두 군데 다 아니라고 했지"라고 말했다. 앱이 거짓말을 한 자리다.
   * 기존 테스트가 후보 2개짜리만 써서 안 잡혔다.
   */
  it('후보가 하나뿐이면 "두 군데"라고 말하지 않는다', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 }),
    );
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('틀린 문제 사진 올리기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 시작하자'));

    await waitFor(() => expect(screen.getByText('아니야, 거기 아니야')).toBeTruthy());
    fireEvent.press(screen.getByText('아니야, 거기 아니야'));

    await waitFor(() => expect(screen.getByText(/내가 틀린 거야/)).toBeTruthy());
    expect(screen.queryByText(/두 군데/)).toBeNull();
    expect(eventNamed('photo_dead_end')![1]).toMatchObject({
      reason: 'pointing_rejected',
      attempts: 1,
    });
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
});
