import { render, screen } from '@testing-library/react-native';

import type { WeaknessProgressItem } from '@/features/learning/types';

import { WeaknessDetailScreenView } from '../weakness-detail-screen-view';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => ({
  __esModule: true,
  default: require('react-native').View,
}));

const item: WeaknessProgressItem = {
  weaknessId: 'solving_order_confusion',
  topicLabel: '미분',
  weaknessLabel: '풀이 순서 혼동',
  stage: 'day3',
  completed: false,
  diagnosticAccuracy: 0.4,
  reviewAccuracyByStage: { day1: 0.55, day3: 0.72 },
  recentAppearanceCount: 4,
  severity: 'frequent',
  appearances: [],
};

describe('약점 상세 화면', () => {
  it('미완료·완료 약점 모두 연습 버튼을 표시하지 않는다', () => {
    const props = {
      loading: false,
      notFound: false,
      item,
      appearances: [],
      onBack: jest.fn(),
    };
    const { rerender } = render(<WeaknessDetailScreenView {...props} />);

    for (const completed of [false, true]) {
      rerender(<WeaknessDetailScreenView {...props} item={{ ...item, completed }} />);

      expect(screen.getByText('등장 기록')).toBeTruthy();
      expect(screen.getByRole('button', { name: '뒤로' })).toBeTruthy();
      expect(screen.queryByText('지금 바로 연습하기')).toBeNull();
      expect(screen.queryByText('다시 연습하기')).toBeNull();
      expect(screen.getAllByRole('button')).toHaveLength(1);
    }
  });
});
