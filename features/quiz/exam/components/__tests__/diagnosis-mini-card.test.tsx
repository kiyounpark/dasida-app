import { render, screen } from '@testing-library/react-native';

import { DiagnosisMiniCard } from '../diagnosis-mini-card';

const defaultProps = {
  problemNumber: 5,
  patternName: '계산 실수',
  patternDescription: '부호를 잘못 옮겼다',
  noteCount: 5,
  totalNotes: 5,
  onPause: jest.fn(),
  onNext: jest.fn(),
};

describe('DiagnosisMiniCard', () => {
  it('isLastProblem=false (기본값) 이면 "잠시 쉬기" 버튼이 렌더링된다', () => {
    render(<DiagnosisMiniCard {...defaultProps} />);
    expect(screen.queryByText('잠시 쉬기')).not.toBeNull();
    expect(screen.queryByText('다음 문제 →')).not.toBeNull();
  });

  it('isLastProblem=true 이면 "잠시 쉬기" 버튼이 렌더링되지 않는다', () => {
    render(<DiagnosisMiniCard {...defaultProps} isLastProblem />);
    expect(screen.queryByText('잠시 쉬기')).toBeNull();
  });

  it('isLastProblem=true 이면 primary 버튼이 "리포트 보기 →"로 표시된다', () => {
    render(<DiagnosisMiniCard {...defaultProps} isLastProblem />);
    expect(screen.queryByText('리포트 보기 →')).not.toBeNull();
    expect(screen.queryByText('다음 문제 →')).toBeNull();
  });
});
