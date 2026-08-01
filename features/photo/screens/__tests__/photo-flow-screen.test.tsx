import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// jest.mock은 babel이 import 위로 끌어올리므로 아래 import들이 목을 먼저 받는다
import { makeCandidate, makeResult } from '../../flow/__fixtures__/analysis';
import { downscaleToDataUrl, pickPhoto, requestAnalyze } from '../../flow/analyze-photo-request';
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

const mockPick = pickPhoto as jest.Mock;
const mockDownscale = downscaleToDataUrl as jest.Mock;
const mockAnalyze = requestAnalyze as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockPick.mockResolvedValue({ uri: 'file://photo.jpg', width: 3024, height: 4032 });
  mockDownscale.mockResolvedValue('data:image/jpeg;base64,AAAA');
});

describe('PhotoFlowScreen', () => {
  it('업로드 화면부터 뜬다', () => {
    render(<PhotoFlowScreen />);
    expect(screen.getByText('사진 고르기')).toBeTruthy();
  });

  it('단언 갈래면 읽어낸 방법이 대화에 뜬다', async () => {
    mockAnalyze.mockResolvedValue(makeResult());
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('사진 고르기'));

    await waitFor(() => expect(screen.getByText(/완전제곱식\(으\)로 접근했네/)).toBeTruthy());
    expect(screen.getByText('맞아, 시작하자')).toBeTruthy();
  });

  it('풀이 흔적이 없으면 다시 찍기를 안내한다', async () => {
    mockAnalyze.mockResolvedValue(makeResult({ hasSolvingWork: false }));
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('사진 고르기'));

    await waitFor(() => expect(screen.getByText('📷 풀이까지 나오게 다시 찍기')).toBeTruthy());
  });

  it('분석이 실패하면 업로드 화면으로 돌아가고 이유를 보여준다', async () => {
    mockAnalyze.mockRejectedValue(new Error('분석 서버가 500으로 답했어'));
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('사진 고르기'));

    await waitFor(() => expect(screen.getByText('분석 서버가 500으로 답했어')).toBeTruthy());
    expect(screen.getByText('사진 고르기')).toBeTruthy();
  });

  it('사진부터 오답노트까지 한 바퀴 돈다', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 }),
    );
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('사진 고르기'));
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

    fireEvent.press(screen.getByText('사진 고르기'));
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

    fireEvent.press(screen.getByText('사진 고르기'));
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

  it('짚은 자리가 아니라고 하면 두 번째를 짚고, 그것도 아니면 느낌 설문으로 넘긴다', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({
        errorCandidates: [makeCandidate(), makeCandidate({ quote: '4x + 4' })],
        errorConfidence: 0.9,
      }),
    );
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('사진 고르기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());
    fireEvent.press(screen.getByText('맞아, 시작하자'));

    await waitFor(() => expect(screen.getByText('아니야, 거기 아니야')).toBeTruthy());
    fireEvent.press(screen.getByText('아니야, 거기 아니야'));

    // 사다리 2번 — '아니야'는 앞서 내가 말한 말풍선에도 있어서 버튼으로 집는다
    await waitFor(() => expect(screen.getByText('맞아, 거기야')).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: '아니야' }));

    // 세 번째 시도는 없다
    await waitFor(() => expect(screen.getByText(/느낌 설문/)).toBeTruthy());
  });
});
