import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { PhotoBackBar } from '../photo-back-bar';

/**
 * 1.0.12 ⓪ — iOS 26에서 기본 헤더 뒤로 버튼이 사진첩·시트 뒤에 죽어 학생이 사진 화면에 갇혔다.
 * 그 버튼을 JS 줄로 바꿨다. 이 줄이 router.back()을 부르는지, 돌아갈 화면이 없으면 홈으로 가는지만 잰다.
 * (죽던 건 네이티브 탭 경로라 jest로는 못 잰다 — 시뮬레이터 검증 목록은 STATUS 1.0.12 ⓪ 줄)
 */
describe('사진 화면 맨 위 뒤로 줄', () => {
  beforeEach(() => jest.clearAllMocks());

  it('돌아갈 화면이 있으면 router.back()', () => {
    (router.canGoBack as jest.Mock).mockReturnValue(true);
    render(<PhotoBackBar label="홈" title="사진 오답노트" />);

    fireEvent.press(screen.getByLabelText('홈'));

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('돌아갈 화면이 없으면(알림 등으로 바로 열림) 홈으로 바꿔 간다', () => {
    (router.canGoBack as jest.Mock).mockReturnValue(false);
    render(<PhotoBackBar label="뒤로" title="지난 오답노트" />);

    fireEvent.press(screen.getByLabelText('뒤로'));

    expect(router.replace).toHaveBeenCalledWith('/(tabs)/quiz');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('제목과 버튼 글자를 그린다', () => {
    render(<PhotoBackBar label="홈" title="사진 오답노트" />);

    expect(screen.getByText('사진 오답노트')).toBeTruthy();
    expect(screen.getByText('홈')).toBeTruthy();
  });
});
