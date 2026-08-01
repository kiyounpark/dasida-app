import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// jest.mock은 babel이 import 위로 끌어올리므로 아래 import들이 목을 먼저 받는다
import { downscaleToDataUrl, pickPhoto, requestAnalyze } from '../../flow/analyze-photo-request';
import type { AnalyzePhotoResult } from '../../types';
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

function makeResult(overrides: Partial<AnalyzePhotoResult> = {}): AnalyzePhotoResult {
  return {
    hasSolvingWork: true,
    userAnswer: null,
    transcription: '완전제곱식으로 묶었다',
    predictedMethodId: 'cps',
    confidence: 0.9,
    candidateMethodIds: ['cps'],
    reason: '',
    needsManualSelection: false,
    errorCandidates: [],
    errorConfidence: 0,
    ...overrides,
  };
}

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

  it('방법을 확정하면 다음 조각이 어디로 이어지는지 알려준다', async () => {
    mockAnalyze.mockResolvedValue(
      makeResult({ errorCandidates: [{}], errorConfidence: 0.9 }),
    );
    render(<PhotoFlowScreen />);

    fireEvent.press(screen.getByText('사진 고르기'));
    await waitFor(() => expect(screen.getByText('맞아, 시작하자')).toBeTruthy());

    fireEvent.press(screen.getByText('맞아, 시작하자'));

    await waitFor(() => expect(screen.getByText(/짚어주는 대화/)).toBeTruthy());
  });
});
