import { render, screen } from '@testing-library/react-native';

import { getJourneyStepDetailCopy } from '../journey-step-detail-copy';
import { StepDetailCard } from '../step-detail-card';

describe('StepDetailCard', () => {
  describe('rich 모드', () => {
    it('메타 정보 3종 라벨이 모두 렌더된다', () => {
      render(<StepDetailCard mode="rich" stepKey="diagnostic" />);
      expect(screen.queryByText('예상 시간')).not.toBeNull();
      expect(screen.queryByText('난이도')).not.toBeNull();
      expect(screen.queryByText('문항 수')).not.toBeNull();
    });

    it('afterStepHint 텍스트가 렌더된다', () => {
      const copy = getJourneyStepDetailCopy('diagnostic');
      render(<StepDetailCard mode="rich" stepKey="diagnostic" />);
      expect(screen.queryByText(copy.afterStepHint)).not.toBeNull();
    });

    it('bodyRich 텍스트가 표시된다 (diagnostic)', () => {
      const copy = getJourneyStepDetailCopy('diagnostic');
      render(<StepDetailCard mode="rich" stepKey="diagnostic" />);
      expect(screen.queryByText(copy.bodyRich)).not.toBeNull();
    });
  });

  describe('compact 모드', () => {
    it('메타 정보 라벨이 렌더되지 않는다', () => {
      render(<StepDetailCard mode="compact" stepKey="diagnostic" />);
      expect(screen.queryByText('예상 시간')).toBeNull();
      expect(screen.queryByText('난이도')).toBeNull();
      expect(screen.queryByText('문항 수')).toBeNull();
    });

    it('afterStepHint가 표시되지 않는다', () => {
      const copy = getJourneyStepDetailCopy('diagnostic');
      render(<StepDetailCard mode="compact" stepKey="diagnostic" />);
      expect(screen.queryByText(copy.afterStepHint)).toBeNull();
    });

    it('bodyCompact 텍스트가 표시된다 (diagnostic)', () => {
      const copy = getJourneyStepDetailCopy('diagnostic');
      render(<StepDetailCard mode="compact" stepKey="diagnostic" />);
      expect(screen.queryByText(copy.bodyCompact)).not.toBeNull();
    });
  });

  describe('stepKey별 카피 매핑 (rich)', () => {
    it('diagnostic 일 때 STEP 1 타이틀이 렌더된다', () => {
      const copy = getJourneyStepDetailCopy('diagnostic');
      render(<StepDetailCard mode="rich" stepKey="diagnostic" />);
      expect(screen.queryByText(copy.title)).not.toBeNull();
      expect(copy.title).toBe('STEP 1 — 10문제 빠른 진단');
    });

    it('exam 일 때 STEP 4 타이틀이 렌더된다', () => {
      const copy = getJourneyStepDetailCopy('exam');
      render(<StepDetailCard mode="rich" stepKey="exam" />);
      expect(screen.queryByText(copy.title)).not.toBeNull();
      expect(copy.title).toBe('STEP 4 — 완벽 마스터');
    });
  });
});
