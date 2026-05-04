import { fireEvent, render, screen } from '@testing-library/react-native';

import { ExamAnalysisResumeCard } from '../exam-analysis-resume-card';

const defaultProps = {
  examTitle: '2025년 9월 고3 확률과통계 모의고사',
  noteCount: 1,
  totalNotes: 4,
  onPress: jest.fn(),
};

describe('ExamAnalysisResumeCard', () => {
  beforeEach(() => {
    defaultProps.onPress.mockClear();
  });

  it('examTitle 텍스트가 렌더링된다', () => {
    render(<ExamAnalysisResumeCard {...defaultProps} />);
    expect(screen.queryByText('2025년 9월 고3 확률과통계 모의고사')).not.toBeNull();
  });

  it('"분석 진행 중" pill 뱃지와 "이어서 분석하기 →" CTA가 표시된다', () => {
    render(<ExamAnalysisResumeCard {...defaultProps} />);
    expect(screen.queryByText('분석 진행 중')).not.toBeNull();
    expect(screen.queryByText('이어서 분석하기 →')).not.toBeNull();
  });

  it('noteCount=1, totalNotes=4 이면 "1 / 4" 카운트 텍스트가 표시된다', () => {
    render(<ExamAnalysisResumeCard {...defaultProps} />);
    expect(screen.queryByText('1 / 4')).not.toBeNull();
  });

  it('진행률 바 fill width 가 noteCount/totalNotes 비율(25%)로 설정된다', () => {
    render(<ExamAnalysisResumeCard {...defaultProps} />);
    const fill = screen.getByTestId('exam-resume-progress-fill');
    const flatStyle = Array.isArray(fill.props.style)
      ? Object.assign({}, ...fill.props.style.flat())
      : fill.props.style;
    expect(flatStyle.width).toBe('25%');
  });

  it('totalNotes=0 이면 fill width 가 "0%" 로 안전하게 표시된다', () => {
    render(<ExamAnalysisResumeCard {...defaultProps} noteCount={0} totalNotes={0} />);
    const fill = screen.getByTestId('exam-resume-progress-fill');
    const flatStyle = Array.isArray(fill.props.style)
      ? Object.assign({}, ...fill.props.style.flat())
      : fill.props.style;
    expect(flatStyle.width).toBe('0%');
  });

  it('카드 Pressable 클릭 시 onPress 콜백이 호출된다', () => {
    render(<ExamAnalysisResumeCard {...defaultProps} />);
    fireEvent.press(screen.getByTestId('exam-resume-card'));
    expect(defaultProps.onPress).toHaveBeenCalledTimes(1);
  });
});
