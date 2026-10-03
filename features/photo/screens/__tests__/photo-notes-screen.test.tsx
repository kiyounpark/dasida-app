import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import {
  LearningHistoryApiError,
  readLearningHistoryApiJson,
} from '@/features/learning/firebase-learning-history-api';
import { buildPhotoNoteDoc, type PhotoNoteDoc } from '@/functions/src/photo-store-contract';

import { readPhotoNotes, savePhotoNote, setPhotoNoteCloudStoredAt } from '../../note-store';
import type { PhotoNote } from '../../types';
import { PhotoNotesScreen, uploadMissingLabel } from '../photo-notes-screen';

jest.mock('../../note-store', () => ({
  readPhotoNotes: jest.fn(async () => []),
  savePhotoNote: jest.fn(async () => []),
  setPhotoNoteCloudStoredAt: jest.fn(async () => true),
}));

// 서버는 망 한 칸만 목으로 — 합치기(remote-note-store)는 진짜로 돈다
jest.mock('@/features/learning/firebase-learning-history-api', () => {
  const actual = jest.requireActual('@/features/learning/firebase-learning-history-api');
  return { ...actual, readLearningHistoryApiJson: jest.fn() };
});

// photo-flow-screen.test.tsx와 같은 대체품 — ScrollView 내부가 NativeEventEmitter를 부른다
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
  return { __esModule: true, default: MockScrollView };
});

jest.mock('expo-image', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  return {
    Image: ({ source: _s, contentFit: _f, ...props }: any) => React.createElement(RN.View, props),
  };
});

const mockRead = readPhotoNotes as jest.Mock;
const mockSaveLocal = savePhotoNote as jest.Mock;
const mockServer = readLearningHistoryApiJson as jest.Mock;
const getRemoteAuthHeaders = jest.fn(async (key: string) => ({
  'x-dasida-account-key': key,
  Authorization: 'Bearer token-1',
}));

/** 다른 기기에서 올린 노트 — 서버 문서 모양. 사진 없이 올린 것으로 둬 내려받기는 안 탄다 */
function serverDoc(overrides: Partial<PhotoNoteDoc> = {}): PhotoNoteDoc {
  return {
    ...buildPhotoNoteDoc(
      {
        id: 'photo-2',
        createdAt: '2026-09-20T01:00:00.000Z',
        schemaVersion: 1,
        dateLabel: '9/20',
        quote: 'x² − 4 = 0',
        why: '양변을 나누다 해 하나를 잃었어.',
        fix: '인수분해로 두 해를 다 적자.',
        methodLabel: '인수분해',
        typeLabel: '계산 실수',
        methodId: 'factoring',
        mistakeType: 'calc_slip',
        weaknessIds: [],
        primaryWeaknessId: null,
        checkPassed: true,
        retryResult: 'pass',
      },
      {
        accountKey: 'user:abc',
        photoPath: null,
        submissionId: null,
        appVersion: '1.0.11',
        storedAt: '2026-10-02T06:00:00.000Z',
      },
    ),
    ...overrides,
  };
}

function note(overrides: Partial<PhotoNote> = {}): PhotoNote {
  return {
    id: 'photo-1',
    createdAt: '2026-09-15T01:00:00.000Z',
    schemaVersion: 1,
    dateLabel: '9/15',
    photoUri: null,
    quote: '2x² − 5x + 3',
    why: '부호를 옮기면서 −가 하나 사라졌어.',
    fix: '괄호 풀 때 앞의 −를 먼저 적고 시작하자.',
    methodLabel: '근의 공식',
    typeLabel: '계산 실수',
    methodId: 'quadratic',
    mistakeType: 'calc_slip',
    weaknessIds: ['formula_understanding'],
    primaryWeaknessId: 'formula_understanding',
    checkPassed: true,
    retryResult: 'pass',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRead.mockResolvedValue([]);
});

describe('지난 오답노트 화면', () => {
  it('저장된 노트를 그 계정으로 읽어 온다', async () => {
    mockRead.mockResolvedValue([note()]);

    render(<PhotoNotesScreen accountKey="user:abc" />);

    await waitFor(() => expect(screen.getByText('노트 1장')).toBeTruthy());
    expect(mockRead).toHaveBeenCalledWith('user:abc');
  });

  it('노트 내용이 카드로 뜬다 — 흐름 끝에서 보던 그 모양', async () => {
    mockRead.mockResolvedValue([note()]);

    render(<PhotoNotesScreen accountKey="user:abc" />);

    await waitFor(() => expect(screen.getByText('오답노트')).toBeTruthy());
    expect(screen.getByText('#근의 공식 #계산 실수')).toBeTruthy();
  });

  it('목록에서는 "여기 남겨뒀어" 줄을 안 낸다 — 이미 다시 보고 있는 자리다', async () => {
    mockRead.mockResolvedValue([note()]);

    render(<PhotoNotesScreen accountKey="user:abc" />);

    await waitFor(() => expect(screen.getByText('오답노트')).toBeTruthy());
    expect(screen.queryByText(/여기 남겨뒀어/)).toBeNull();
  });

  it('한 장도 없으면 비어 있다고 말하고 뭘 하면 되는지 알려준다', async () => {
    render(<PhotoNotesScreen accountKey="user:abc" />);

    await waitFor(() => expect(screen.getByText('아직 노트가 없어')).toBeTruthy());
  });

  it('계정 키가 없으면 읽지 않는다', async () => {
    render(<PhotoNotesScreen getRemoteAuthHeaders={getRemoteAuthHeaders} />);

    await waitFor(() => expect(screen.getByText('아직 노트가 없어')).toBeTruthy());
    expect(mockRead).not.toHaveBeenCalled();
    expect(mockServer).not.toHaveBeenCalled();
  });

  it('헤더 함수가 없으면 서버를 안 부른다 — 기기 노트만', async () => {
    mockRead.mockResolvedValue([note()]);

    render(<PhotoNotesScreen accountKey="user:abc" />);

    await waitFor(() => expect(screen.getByText('노트 1장')).toBeTruthy());
    expect(mockServer).not.toHaveBeenCalled();
  });
});

describe('다른 기기 보기 (1.0.11)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  it('서버에만 있는 노트를 더해 보여 주고, 이 기기에 남긴다', async () => {
    mockRead.mockResolvedValue([note()]);
    mockServer.mockResolvedValueOnce({ notes: [serverDoc()], nextBefore: null });

    render(<PhotoNotesScreen accountKey="user:abc" getRemoteAuthHeaders={getRemoteAuthHeaders} />);

    await waitFor(() => expect(screen.getByText('노트 2장')).toBeTruthy());
    expect(screen.getByText('#인수분해 #계산 실수')).toBeTruthy();
    expect(screen.getByText('#근의 공식 #계산 실수')).toBeTruthy();
    expect(getRemoteAuthHeaders).toHaveBeenCalledWith('user:abc');
    await waitFor(() =>
      expect(mockSaveLocal).toHaveBeenCalledWith(
        'user:abc',
        expect.objectContaining({ id: 'photo-2', cloudStoredAt: '2026-10-02T06:00:00.000Z' }),
      ),
    );
  });

  it('같은 id면 기기 것이 이긴다 — 서버 것으로 덮지 않는다', async () => {
    mockRead.mockResolvedValue([note()]);
    mockServer.mockResolvedValueOnce({ notes: [serverDoc({ id: 'photo-1' })], nextBefore: null });

    render(<PhotoNotesScreen accountKey="user:abc" getRemoteAuthHeaders={getRemoteAuthHeaders} />);

    await waitFor(() => expect(mockServer).toHaveBeenCalled());
    expect(screen.getByText('노트 1장')).toBeTruthy();
    expect(screen.getByText('#근의 공식 #계산 실수')).toBeTruthy();
    expect(screen.queryByText('#인수분해 #계산 실수')).toBeNull();
    expect(mockSaveLocal).not.toHaveBeenCalled();
  });

  it('서버 실패·오프라인이면 기기 노트만 — 오류 띠는 없다', async () => {
    mockRead.mockResolvedValue([note()]);
    mockServer.mockRejectedValueOnce(
      new LearningHistoryApiError('네트워크 연결을 확인한 뒤 다시 시도해 주세요.', 0, 'NETWORK_ERROR'),
    );

    render(<PhotoNotesScreen accountKey="user:abc" getRemoteAuthHeaders={getRemoteAuthHeaders} />);

    await waitFor(() => expect(mockServer).toHaveBeenCalled());
    expect(screen.getByText('노트 1장')).toBeTruthy();
    expect(screen.queryByText(/네트워크|오류|실패|못 불러/)).toBeNull();
  });

  it('게스트(anon:)는 서버를 안 부른다 — 서버가 403으로 막아서 「인터넷을 확인」이 거짓이 된다', async () => {
    mockRead.mockResolvedValue([]);

    render(<PhotoNotesScreen accountKey="anon:abc" getRemoteAuthHeaders={getRemoteAuthHeaders} />);

    await waitFor(() => expect(screen.getByText('아직 노트가 없어')).toBeTruthy());
    expect(mockServer).not.toHaveBeenCalled();
    expect(screen.queryByText('노트를 못 불러왔어')).toBeNull();
  });

  it('기기 0장 + 서버 실패면 「없어」 대신 다시 시도 — 새 기기에서 노트가 있는데 없다고 하지 않는다', async () => {
    mockRead.mockResolvedValue([]);
    mockServer
      .mockRejectedValueOnce(
        new LearningHistoryApiError('네트워크 연결을 확인한 뒤 다시 시도해 주세요.', 0, 'NETWORK_ERROR'),
      )
      .mockResolvedValueOnce({ notes: [serverDoc()], nextBefore: null });

    render(<PhotoNotesScreen accountKey="user:abc" getRemoteAuthHeaders={getRemoteAuthHeaders} />);

    await waitFor(() => expect(screen.getByText('노트를 못 불러왔어')).toBeTruthy());
    expect(screen.queryByText('아직 노트가 없어')).toBeNull();

    fireEvent.press(screen.getByText('다시 시도'));
    await waitFor(() => expect(screen.getByText('노트 1장')).toBeTruthy());
  });

  it('「다시 시도」 누른 순간 「아직 노트가 없어」가 한 번도 안 비친다 — 기기 읽기 동안엔 스피너 (Fable 리뷰 10.03)', async () => {
    let release: (value: unknown) => void = () => {};
    mockRead
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
    mockServer
      .mockRejectedValueOnce(
        new LearningHistoryApiError('네트워크 연결을 확인한 뒤 다시 시도해 주세요.', 0, 'NETWORK_ERROR'),
      )
      .mockResolvedValueOnce({ notes: [], nextBefore: null });

    render(<PhotoNotesScreen accountKey="user:abc" getRemoteAuthHeaders={getRemoteAuthHeaders} />);
    await waitFor(() => expect(screen.getByText('노트를 못 불러왔어')).toBeTruthy());

    fireEvent.press(screen.getByText('다시 시도'));
    expect(screen.queryByText('아직 노트가 없어')).toBeNull();
    expect(screen.getByLabelText('노트 불러오는 중')).toBeTruthy();

    release([]);
    await waitFor(() => expect(screen.getByText('아직 노트가 없어')).toBeTruthy());
  });

  it('지운 노트(deletedAt)는 그리지 않는다', async () => {
    mockServer.mockResolvedValueOnce({
      notes: [
        serverDoc({ id: 'photo-3', createdAt: '2026-09-25T01:00:00.000Z', methodLabel: '판별식', deletedAt: '2026-10-01T00:00:00.000Z' }),
        serverDoc(),
      ],
      nextBefore: null,
    });

    render(<PhotoNotesScreen accountKey="user:abc" getRemoteAuthHeaders={getRemoteAuthHeaders} />);

    await waitFor(() => expect(screen.getByText('노트 1장')).toBeTruthy());
    expect(screen.queryByText('#판별식 #계산 실수')).toBeNull();
  });

  it('새 기기(기기 노트 0장)에선 서버 답을 기다리는 동안 "아직 노트가 없어"를 안 띄운다', async () => {
    let reply: (value: unknown) => void = () => {};
    mockServer.mockReturnValueOnce(new Promise((resolve) => (reply = resolve)));

    render(<PhotoNotesScreen accountKey="user:abc" getRemoteAuthHeaders={getRemoteAuthHeaders} />);

    await waitFor(() => expect(screen.getByLabelText('노트 불러오는 중')).toBeTruthy());
    expect(screen.queryByText('아직 노트가 없어')).toBeNull();

    reply({ notes: [serverDoc()], nextBefore: null });

    await waitFor(() => expect(screen.getByText('노트 1장')).toBeTruthy());
  });

  it('서버에도 없으면 그때 비어 있다고 말한다', async () => {
    mockServer.mockResolvedValueOnce({ notes: [], nextBefore: null });

    render(<PhotoNotesScreen accountKey="user:abc" getRemoteAuthHeaders={getRemoteAuthHeaders} />);

    await waitFor(() => expect(screen.getByText('아직 노트가 없어')).toBeTruthy());
    expect(screen.queryByLabelText('노트 불러오는 중')).toBeNull();
  });
});

describe('서버에 없는 노트 올리기 (1.0.11 4번)', () => {
  const fetchMock = jest.fn();
  const realFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
    global.fetch = realFetch;
  });

  it('서버 목록에 없는 기기 노트가 있으면 「계정에 저장하기」를 낸다', async () => {
    mockRead.mockResolvedValue([note()]);
    mockServer.mockResolvedValueOnce({ notes: [serverDoc()], nextBefore: null });

    render(<PhotoNotesScreen accountKey="user:abc" getRemoteAuthHeaders={getRemoteAuthHeaders} />);

    await waitFor(() => expect(screen.getByText(uploadMissingLabel(1))).toBeTruthy());
  });

  it('서버를 못 읽었으면 안 낸다 — 무엇이 없는지 모르고, 올려도 실패한다', async () => {
    mockRead.mockResolvedValue([note()]);
    mockServer.mockRejectedValueOnce(
      new LearningHistoryApiError('네트워크 연결을 확인한 뒤 다시 시도해 주세요.', 0, 'NETWORK_ERROR'),
    );

    render(<PhotoNotesScreen accountKey="user:abc" getRemoteAuthHeaders={getRemoteAuthHeaders} />);

    await waitFor(() => expect(mockServer).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('노트 1장')).toBeTruthy());
    expect(screen.queryByText(/계정에 저장하기/)).toBeNull();
  });

  it('서버에 이미 있으면 안 낸다 — 카드는 서버가 말한 대로 ☁ 줄', async () => {
    mockRead.mockResolvedValue([note()]);
    mockServer.mockResolvedValueOnce({ notes: [serverDoc({ id: 'photo-1' })], nextBefore: null });

    render(<PhotoNotesScreen accountKey="user:abc" getRemoteAuthHeaders={getRemoteAuthHeaders} />);

    await waitFor(() => expect(screen.getByText('☁ 저장됨 · 사진은 계정에 못 올림')).toBeTruthy());
    expect(screen.queryByText(/계정에 저장하기/)).toBeNull();
  });

  it('누르면 savePhotoNote로 올리고, 서버가 저장됐다고 답하면 버튼이 사라지고 ☁ 줄이 뜬다', async () => {
    mockRead.mockResolvedValue([note()]);
    mockServer.mockResolvedValueOnce({ notes: [], nextBefore: null });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        noteId: 'photo-1',
        storedAt: '2026-10-02T07:00:00.000Z',
        photoPath: null,
        alreadyStored: false,
      }),
    });

    render(<PhotoNotesScreen accountKey="user:abc" getRemoteAuthHeaders={getRemoteAuthHeaders} />);
    await waitFor(() => expect(screen.getByText(uploadMissingLabel(1))).toBeTruthy());

    fireEvent.press(screen.getByText(uploadMissingLabel(1)));

    await waitFor(() => expect(screen.getByText('☁ 저장됨 · 사진은 계정에 못 올림')).toBeTruthy());
    expect(screen.queryByText(/계정에 저장하기/)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('savePhotoNote');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({ accountKey: 'user:abc', imageDataUrl: null, note: expect.objectContaining({ id: 'photo-1' }) }),
    );
    expect(setPhotoNoteCloudStoredAt).toHaveBeenCalledWith('user:abc', 'photo-1', '2026-10-02T07:00:00.000Z');
  });

  it('올리기가 실패하면 버튼이 남는다(다시 누를 수 있다) — 카드엔 「저장 못 함」', async () => {
    mockRead.mockResolvedValue([note()]);
    mockServer.mockResolvedValueOnce({ notes: [], nextBefore: null });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'consent', code: 'CONSENT_REQUIRED', retryable: false }),
    });

    render(<PhotoNotesScreen accountKey="user:abc" getRemoteAuthHeaders={getRemoteAuthHeaders} />);
    await waitFor(() => expect(screen.getByText(uploadMissingLabel(1))).toBeTruthy());

    fireEvent.press(screen.getByText(uploadMissingLabel(1)));

    await waitFor(() => expect(screen.getByText('☁ 저장 못 함 · 이 기기엔 남아 있어')).toBeTruthy());
    await waitFor(() => expect(screen.getByText(uploadMissingLabel(1))).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1); // 403 CONSENT_REQUIRED는 재전송 안 함
    expect(setPhotoNoteCloudStoredAt).not.toHaveBeenCalled();
  });
});
