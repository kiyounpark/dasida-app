import { render, screen } from '@testing-library/react-native';

import { resolveWeaknessLabel } from '@/data/diagnosisMap';

import { NoReviewDayCard } from '../no-review-day-card';

jest.mock('@/hooks/use-is-tablet', () => ({ useIsTablet: () => false }));

// 기출 문 스위치(exam-doors.ts). 기본은 지금 값(내림) — 마지막 테스트만 다시 꺼낸 날을 흉내 낸다
let mockExamDoorsVisible = false;
jest.mock('@/features/quiz/exam/exam-doors', () => ({
  get EXAM_DOORS_VISIBLE() {
    return mockExamDoorsVisible;
  },
}));

const task = (over: Record<string, unknown>) =>
  ({
    id: 't1',
    weaknessId: 'discriminant_calculation',
    stage: 'day1',
    scheduledFor: '2026-10-04T00:00:00.000Z',
    source: 'photo',
    sourceId: 'n1',
    ...over,
  }) as any;

describe('NoReviewDayCard', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 3, 8, 0)); // 기기 10/3 08:00
  });
  afterEach(() => {
    jest.useRealTimers();
    mockExamDoorsVisible = false;
  });

  it('사진 과제가 내일이면 「내일」 카드를 그리고 모의고사는 안 권한다', () => {
    render(<NoReviewDayCard nextTask={task({})} onPressExam={jest.fn()} />);
    const label = resolveWeaknessLabel('discriminant_calculation');

    expect(screen.getByText('오늘은 복습 없는 날이에요 · 다음 복습 D-1')).toBeTruthy();
    expect(screen.getByText('내일 · 10/4(일)')).toBeTruthy();
    expect(screen.getByText(`${label} · DAY 1`)).toBeTruthy();
    expect(screen.getByText('내일 홈에 떠요. 짧게 다시 보면 돼요.')).toBeTruthy();
    expect(screen.queryByText('모의고사 시작하기')).toBeNull();
    // 복습 중 또 틀려 day1로 다시 만들어진 학생도 같은 카드를 본다 — 「첫」은 거짓이 될 수 있어 안 쓴다
    expect(screen.queryByText(/첫 복습/)).toBeNull();
  });

  it('홈을 켜 둔 채 자정이 지나 과제가 오늘·어제가 돼도 「내일」이라고 안 한다', () => {
    render(
      <NoReviewDayCard nextTask={task({ scheduledFor: '2026-10-03T00:00:00.000Z' })} onPressExam={jest.fn()} />,
    );
    expect(screen.queryByText(/내일/)).toBeNull();
    expect(screen.getByText('10/3(토)')).toBeTruthy();
    // pill은 D-0을 안 쓴다
    expect(screen.getByText('오늘은 복습 없는 날이에요 · 다음 복습 D-1')).toBeTruthy();
  });

  it('사진 과제가 사흘 뒤 DAY 3이면 날짜와 단계를 그대로 적는다 — 「내일」이라고 안 한다', () => {
    render(
      <NoReviewDayCard
        nextTask={task({ stage: 'day3', scheduledFor: '2026-10-06T00:00:00.000Z' })}
        onPressExam={jest.fn()}
      />,
    );
    const label = resolveWeaknessLabel('discriminant_calculation');

    expect(screen.getByText('10/6(화) · D-3')).toBeTruthy();
    expect(screen.getByText(`${label} · DAY 3`)).toBeTruthy();
    expect(screen.getByText('10/6 홈에 떠요. 짧게 다시 보면 돼요.')).toBeTruthy();
    expect(screen.queryByText(/내일/)).toBeNull();
  });

  it('기출을 내린 동안엔 기출·옛 진단 과제도 「다음 복습」 카드 — 모의고사를 안 권한다 (q-5)', () => {
    for (const source of ['featured-exam', 'diagnostic', 'weakness-practice']) {
      const { unmount } = render(<NoReviewDayCard nextTask={task({ source })} onPressExam={jest.fn()} />);
      const label = resolveWeaknessLabel('discriminant_calculation');

      expect(screen.getByText(`${label} · DAY 1`)).toBeTruthy();
      expect(screen.getByText('내일 홈에 떠요. 짧게 다시 보면 돼요.')).toBeTruthy();
      expect(screen.queryByText('모의고사 시작하기')).toBeNull();
      expect(screen.queryByText('잠깐 실력 확인해볼까요?')).toBeNull();
      unmount();
    }
  });

  it('기출을 다시 꺼내면 사진이 아닌 과제는 예전처럼 모의고사 카드를 낸다', () => {
    mockExamDoorsVisible = true;
    render(<NoReviewDayCard nextTask={task({ source: 'weakness-practice' })} onPressExam={jest.fn()} />);

    expect(screen.getByText('모의고사 시작하기')).toBeTruthy();
  });
});
