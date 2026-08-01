import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { FontFamilies } from '@/constants/typography';

import { PhotoChatThread } from '../photo-chat-thread';

// 칠판 줄이 가로 ScrollView를 쓴다 — NativeAnimatedModule 의존을 피하려고 단순 View로 대체.
jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  const MockScrollView = React.forwardRef(
    ({ children, contentContainerStyle: _c, ...props }: any, ref: any) =>
      React.createElement(RN.View, { ref, ...props }, children),
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

function styleOf(node: { props: { style?: unknown } }) {
  return StyleSheet.flatten(node.props.style as never) ?? {};
}

describe('PhotoChatThread — 수식이 문장에서 떨어져 나오는가', () => {
  it('문장 속 수식만 세리프로 뜬다', () => {
    render(
      <PhotoChatThread
        bubbles={[{ id: 1, kind: 'coach', paras: ['여기 — x^2 + 4x + 4 쓴 부분.'], ask: false }]}
      />,
    );

    // 위첨자로 바뀌고(x²), 문장과 다른 노드로 갈라져야 한다
    expect(styleOf(screen.getByText('x² + 4x + 4'))).toMatchObject({
      fontFamily: FontFamilies.serifBold,
      color: '#1F3B30',
    });
  });

  it('인용부호 안의 수식 = "네가 쓴 그 줄"만 바탕을 깐다', () => {
    render(
      <PhotoChatThread
        bubbles={[{ id: 1, kind: 'coach', paras: ['여기 — "x^2 + 4x" 쓴 줄.'], ask: false }]}
      />,
    );

    expect(styleOf(screen.getByText('x² + 4x'))).toMatchObject({
      backgroundColor: '#F3ECDD',
    });
  });

  it('문단 전체가 수식이면 칠판 줄로 크게 떨어진다', () => {
    render(<PhotoChatThread bubbles={[{ id: 1, kind: 'coach', paras: ['x^2 + 6x'], ask: false }]} />);

    expect(styleOf(screen.getByText('x² + 6x'))).toMatchObject({
      fontFamily: FontFamilies.serifBold,
      fontSize: 19,
    });
  });

  it('답할 차례인 말풍선은 마지막 문단이 굵은 초록으로 도드라진다', () => {
    render(
      <PhotoChatThread
        bubbles={[
          {
            id: 1,
            kind: 'coach',
            paras: ['그럼 풀이를 좀 더 보자.', '여기서 틀린 것 같아. 맞아?'],
            ask: true,
          },
        ]}
      />,
    );

    expect(styleOf(screen.getByText('여기서 틀린 것 같아. 맞아?'))).toMatchObject({
      fontFamily: FontFamilies.bold,
      color: '#1F3B30',
    });
    // 앞 문단은 그대로 본문
    expect(styleOf(screen.getByText('그럼 풀이를 좀 더 보자.'))).toMatchObject({
      fontFamily: FontFamilies.regular,
    });
  });

  it('수식이 없는 말풍선은 그대로 한 덩어리로 뜬다', () => {
    render(
      <PhotoChatThread
        bubbles={[{ id: 1, kind: 'coach', paras: ['그럼 여기서부터 같이 보자.'], ask: false }]}
      />,
    );

    expect(screen.getByText('그럼 여기서부터 같이 보자.')).toBeTruthy();
  });
});
