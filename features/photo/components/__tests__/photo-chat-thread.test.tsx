import { render, screen } from '@testing-library/react-native';

import { FontFamilies } from '@/constants/typography';

import { PhotoChatThread } from '../photo-chat-thread';

jest.mock('expo-image', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  return {
    Image: ({ source: _s, contentFit: _f, ...props }: any) => React.createElement(RN.View, props),
  };
});

describe('PhotoChatThread — 수식이 문장에서 떨어져 나오는가', () => {
  it('코치 말풍선의 수식만 세리프로 뜬다', () => {
    render(
      <PhotoChatThread
        bubbles={[
          { id: 1, kind: 'coach', paras: ['여기 — x^2 + 4x + 4 쓴 부분.'], ask: false },
        ]}
      />,
    );

    // 위첨자로 바뀌고(x²), 문장과 다른 노드로 갈라져야 한다
    const math = screen.getByText('x² + 4x + 4');
    expect(math.props.style).toMatchObject({ fontFamily: FontFamilies.serifBold });
  });

  it('내 말풍선의 수식은 진한 바탕에서 안 묻히게 흰색으로', () => {
    render(<PhotoChatThread bubbles={[{ id: 1, kind: 'me', paras: ['x^2 + 6x'] }]} />);

    const math = screen.getByText('x² + 6x');
    expect(math.props.style).toMatchObject({
      fontFamily: FontFamilies.serifBold,
      color: '#FFFFFF',
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
