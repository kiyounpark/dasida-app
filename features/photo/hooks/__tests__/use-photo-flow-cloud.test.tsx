import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// jest.mock은 babel이 import 위로 끌어올리므로 아래 import들이 목을 먼저 받는다
import { photoStoreUrl } from '@/functions/src/photo-store-contract';

import { makeCandidate, makeResult } from '../../flow/__fixtures__/analysis';
import { downscaleToDataUrl, newSubmissionId, pickPhoto, requestAnalyze } from '../../flow/analyze-photo-request';
import { askPhotoSource } from '../../flow/ask-photo-source';
import { requestDiagnoseMethod } from '../../flow/diagnose-method-request';
import { requestQuizVerify } from '../../flow/verify-quiz-request';
import { savePhotoNote, setPhotoNoteCloudStoredAt } from '../../note-store';
import { PhotoFlowScreen } from '../../screens/photo-flow-screen';

/**
 * 1.0.11 2줄 — 노트가 뜨면 분석에 보낸 축소본과 노트를 savePhotoNote로 올리고, ☁ 줄은 서버 응답으로만 바뀐다.
 * 흐름 전체는 screens/__tests__/photo-flow-screen.test.tsx가 본다. 여기선 서버 저장 한 가지만.
 */

jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  const MockScrollView = React.forwardRef(({ children, contentContainerStyle: _c, ...props }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ scrollToEnd: () => {} }));
    return React.createElement(RN.View, props, children);
  });
  MockScrollView.displayName = 'ScrollView';
  return { __esModule: true, default: MockScrollView };
});

jest.mock('react-native/Libraries/Components/Keyboard/KeyboardAvoidingView', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  const MockKeyboardAvoidingView = ({ children, behavior: _b, enabled: _e, ...props }: any) =>
    React.createElement(RN.View, props, children);
  return { __esModule: true, default: MockKeyboardAvoidingView };
});

jest.mock('../../note-store', () => ({
  ...jest.requireActual('../../note-store'),
  savePhotoNote: jest.fn(async () => []),
  readPhotoNotes: jest.fn(async () => []),
  setPhotoNoteCloudStoredAt: jest.fn(async () => true),
}));

jest.mock('expo-image', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  return { Image: ({ source: _s, contentFit: _f, ...props }: any) => React.createElement(RN.View, props) };
});

jest.mock('../../flow/analyze-photo-request', () => ({
  pickPhoto: jest.fn(),
  downscaleToDataUrl: jest.fn(),
  requestAnalyze: jest.fn(),
  newSubmissionId: jest.fn(),
}));
jest.mock('../../flow/verify-quiz-request', () => ({ requestQuizVerify: jest.fn() }));
jest.mock('../../flow/diagnose-method-request', () => ({ requestDiagnoseMethod: jest.fn() }));
jest.mock('../../flow/ask-photo-source', () => ({ askPhotoSource: jest.fn() }));
jest.mock('@/features/analytics/log-event', () => ({ logEvent: jest.fn() }));

const SUBMISSION = '8f14e45f-ceea-467a-9575-1b2c3d4e5f60';
const IMAGE = 'data:image/jpeg;base64,DOWNSCALED';
const AUTH = { 'x-dasida-account-key': 'user:abc', Authorization: 'Bearer token' };

const fetchMock = jest.fn();
const mockSaveNote = savePhotoNote as jest.Mock;
const mockMarkStored = setPhotoNoteCloudStoredAt as jest.Mock;

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

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

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
  (askPhotoSource as jest.Mock).mockResolvedValue('library');
  (pickPhoto as jest.Mock).mockResolvedValue({ uri: 'file://photo.jpg', width: 3024, height: 4032 });
  (downscaleToDataUrl as jest.Mock).mockResolvedValue(IMAGE);
  (newSubmissionId as jest.Mock).mockReturnValue(SUBMISSION);
  (requestAnalyze as jest.Mock).mockResolvedValue(
    makeResult({ errorCandidates: [makeCandidate()], errorConfidence: 0.9 }),
  );
  (requestQuizVerify as jest.Mock).mockResolvedValue({ verdict: 'match', reason: 'match', ms: 10 });
  (requestDiagnoseMethod as jest.Mock).mockResolvedValue(null);
});

it('노트가 뜨면 분석에 보낸 축소본과 노트(submissionId 포함)를 savePhotoNote로 — 응답 뒤 ☁ 저장됨', async () => {
  let resolveFetch: (value: Response) => void = () => {};
  fetchMock.mockReturnValue(new Promise<Response>((resolve) => (resolveFetch = resolve)));
  render(<PhotoFlowScreen accountKey="user:abc" getRemoteAuthHeaders={async () => AUTH} />);

  await walkToNote();

  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(photoStoreUrl('savePhotoNote'));
  const body = JSON.parse(init.body);
  expect(body.accountKey).toBe('user:abc');
  expect(body.imageDataUrl).toBe(IMAGE);
  expect(body.submissionId).toBe(SUBMISSION);
  expect(body.note.id).toMatch(/^photo-/);
  expect('photoUri' in body.note).toBe(false);
  // 로컬 노트에도 submissionId가 들어간다
  expect(mockSaveNote.mock.calls[0][1].submissionId).toBe(SUBMISSION);
  // 1.0.12 ⑵ — 화면에 나간 쪽지·재도전이 기기와 서버 둘 다에 남는다(본문 불변이라 여기서 빠지면 영영 없다)
  const checkQuiz = {
    setup: 'x^2 + 6x 를 완전제곱식으로 바꾼다고 하자.',
    prompt: '뭘 더하고 빼야 할까?',
    options: ['3을 더하고 뺀다', '9를 더하고 뺀다', '6을 더하고 뺀다'],
    answerIndex: 1,
  };
  const retryQuiz = {
    setup: '이번엔 x^2 + 10x 야.',
    prompt: '뭘 더하고 빼야 할까?',
    options: ['25를 더하고 뺀다', '10을 더하고 뺀다', '5를 더하고 뺀다'],
    answerIndex: 0,
  };
  expect(body.note.checkQuiz).toEqual(checkQuiz);
  expect(body.note.retryQuiz).toEqual(retryQuiz);
  expect(mockSaveNote.mock.calls[0][1].checkQuiz).toEqual(checkQuiz);
  expect(mockSaveNote.mock.calls[0][1].retryQuiz).toEqual(retryQuiz);

  // 로컬 저장은 끝났어도 서버가 답하기 전엔 「저장됨」이 아니다
  expect(screen.getByText('☁ 저장 중')).toBeTruthy();
  expect(screen.queryByText('☁ 저장됨')).toBeNull();

  resolveFetch(
    reply(200, {
      noteId: body.note.id,
      photoPath: 'photo-notes/user:abc/x.jpg',
      storedAt: '2026-10-10T03:00:00.000Z',
      alreadyStored: false,
    }),
  );

  await waitFor(() => expect(screen.getByText('☁ 저장됨')).toBeTruthy());
  expect(mockMarkStored).toHaveBeenCalledWith('user:abc', body.note.id, '2026-10-10T03:00:00.000Z');
});

it('서버가 거절하면 로컬 저장이 됐어도 ☁ 저장 못 함 — cloudStoredAt을 안 적는다', async () => {
  fetchMock.mockResolvedValue(reply(403, { error: 'x', code: 'CONSENT_REQUIRED', retryable: false }));
  render(<PhotoFlowScreen accountKey="user:abc" getRemoteAuthHeaders={async () => AUTH} />);

  await walkToNote();

  await waitFor(() => expect(screen.getByText('☁ 저장 못 함 · 이 기기엔 남아 있어')).toBeTruthy());
  expect(mockSaveNote).toHaveBeenCalledTimes(1);
  expect(mockMarkStored).not.toHaveBeenCalled();
});

it('계정 헤더 함수가 없으면 서버 저장을 안 건다 — 1.0.10과 같은 카드(☁ 줄 없음)', async () => {
  render(<PhotoFlowScreen accountKey="user:abc" />);

  await walkToNote();

  await waitFor(() => expect(mockSaveNote).toHaveBeenCalledTimes(1));
  expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.queryByText(/☁/)).toBeNull();
});
