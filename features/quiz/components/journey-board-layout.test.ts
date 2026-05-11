import {
  BOARD_MARGIN_TOP,
  BUBBLE_OVERFLOW_RESERVE,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
  calcJourneyBoardWidth,
} from './journey-board-layout';

const VIEWBOX_RATIO = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;

describe('calcJourneyBoardWidth', () => {
  describe('phone (isTablet=false)', () => {
    it('non-compact 폰은 maxWidth 470과 (screenWidth - 28) 중 작은 값', () => {
      const result = calcJourneyBoardWidth({
        screenWidth: 393,
        availableHeight: 500,
        isTablet: false,
        isCompactLayout: false,
      });
      expect(result).toBe(Math.min(393 - 28, 470)); // 365
    });

    it('compact 폰은 maxWidth 430을 적용', () => {
      const result = calcJourneyBoardWidth({
        screenWidth: 375,
        availableHeight: 500,
        isTablet: false,
        isCompactLayout: true,
      });
      expect(result).toBe(Math.min(375 - 28, 430)); // 347
    });

    it('폰은 availableHeight를 무시한다 (높이 제약 없음)', () => {
      const tiny = calcJourneyBoardWidth({
        screenWidth: 393,
        availableHeight: 100,
        isTablet: false,
        isCompactLayout: false,
      });
      const huge = calcJourneyBoardWidth({
        screenWidth: 393,
        availableHeight: 9999,
        isTablet: false,
        isCompactLayout: false,
      });
      expect(tiny).toBe(huge);
    });
  });

  describe('tablet (isTablet=true)', () => {
    it('availableHeight가 충분하면 width 기반 상한 사용 (iPad Pro 12.9 portrait)', () => {
      const result = calcJourneyBoardWidth({
        screenWidth: 1024,
        availableHeight: 9999,
        isTablet: true,
        isCompactLayout: false,
      });
      // widthBasedMax = min(1024 * 0.7, 680) = 680
      expect(result).toBe(Math.min(1024 - 28, 680)); // 680
    });

    it('availableHeight가 작으면 height 기반 상한으로 줄어든다 (iPad mini 6 portrait)', () => {
      const screenWidth = 744;
      const availableHeight = 600;
      const result = calcJourneyBoardWidth({
        screenWidth,
        availableHeight,
        isTablet: true,
        isCompactLayout: false,
      });
      const heightBasedMax =
        (availableHeight - BOARD_MARGIN_TOP - BUBBLE_OVERFLOW_RESERVE) * VIEWBOX_RATIO;
      const widthBasedMax = Math.min(screenWidth * 0.7, 680);
      const expected = Math.min(screenWidth - 28, widthBasedMax, heightBasedMax);
      expect(result).toBeCloseTo(expected, 4);
    });

    it('availableHeight === 0 (첫 렌더, 측정 전)이면 width 기반 상한만 사용', () => {
      const screenWidth = 744;
      const result = calcJourneyBoardWidth({
        screenWidth,
        availableHeight: 0,
        isTablet: true,
        isCompactLayout: false,
      });
      const widthBasedMax = Math.min(screenWidth * 0.7, 680);
      expect(result).toBe(Math.min(screenWidth - 28, widthBasedMax));
    });

    it('availableHeight가 오버헤드(76)보다 작으면 0으로 클램프', () => {
      const result = calcJourneyBoardWidth({
        screenWidth: 744,
        availableHeight: 50,
        isTablet: true,
        isCompactLayout: false,
      });
      expect(result).toBe(0);
    });

    it('containerWidth가 주어지면 screenWidth 대신 containerWidth로 폭 계산', () => {
      // iPad 11" 가로 (1194 width) 에서 좌측 컬럼이 640pt 일 때
      const result = calcJourneyBoardWidth({
        screenWidth: 1194,
        availableHeight: 9999,
        isTablet: true,
        isCompactLayout: false,
        containerWidth: 640,
      });
      // widthBasedMax = min(640 * 0.85, 680) = 544
      // padding 적용: min(640 - 28, 544) = 544
      expect(result).toBe(Math.min(640 - 28, Math.min(640 * 0.85, 680))); // 544
    });

    it('containerWidth가 주어지면 height 제약도 containerWidth 기준', () => {
      const containerWidth = 640;
      const availableHeight = 600;
      const result = calcJourneyBoardWidth({
        screenWidth: 1194,
        availableHeight,
        isTablet: true,
        isCompactLayout: false,
        containerWidth,
      });
      const widthBasedMax = Math.min(containerWidth * 0.85, 680);
      const heightBasedMax =
        (availableHeight - BOARD_MARGIN_TOP - BUBBLE_OVERFLOW_RESERVE) * VIEWBOX_RATIO;
      const expected = Math.min(containerWidth - 28, widthBasedMax, heightBasedMax);
      expect(result).toBeCloseTo(expected, 4);
    });

    it('containerWidth 미지정 + isTablet=true 는 기존 screenWidth 동작 유지', () => {
      const screenWidth = 1024;
      const result = calcJourneyBoardWidth({
        screenWidth,
        availableHeight: 9999,
        isTablet: true,
        isCompactLayout: false,
      });
      expect(result).toBe(Math.min(screenWidth - 28, 680));
    });
  });
});
