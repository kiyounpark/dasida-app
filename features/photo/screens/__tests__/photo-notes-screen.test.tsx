import { render, screen, waitFor } from '@testing-library/react-native';

import { readPhotoNotes } from '../../note-store';
import type { PhotoNote } from '../../types';
import { PhotoNotesScreen } from '../photo-notes-screen';

jest.mock('../../note-store', () => ({ readPhotoNotes: jest.fn(async () => []) }));

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
    render(<PhotoNotesScreen />);

    await waitFor(() => expect(screen.getByText('아직 노트가 없어')).toBeTruthy());
    expect(mockRead).not.toHaveBeenCalled();
  });
});
