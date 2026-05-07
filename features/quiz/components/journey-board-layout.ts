export const VIEWBOX_WIDTH = 768;
export const VIEWBOX_HEIGHT = 960;
export const BOARD_CONTAINER_PADDING = 28;
export const BOARD_MARGIN_TOP = 52;
/** JourneyActiveBubble이 보드 위쪽으로 `top: -14%`만큼 튀어나오는 영역을 보호하기 위한 안전 마진. 줄이면 iPad 세로에서 말풍선 클리핑 위험. */
export const BUBBLE_OVERFLOW_RESERVE = 24;

const VIEWBOX_RATIO = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;

type CalcJourneyBoardWidthInput = {
  screenWidth: number;
  availableHeight: number;
  isTablet: boolean;
  isCompactLayout: boolean;
};

/**
 * 학습 여정 보드의 실제 렌더 너비를 계산한다.
 * - 폰: width 기반 상한만 사용
 * - 태블릿: width + height 기반 상한 모두 적용 (Math.min)
 * - availableHeight === 0 (첫 렌더, heroLayoutBottom 측정 전)이면 width-only로 동작
 */
export function calcJourneyBoardWidth({
  screenWidth,
  availableHeight,
  isTablet,
  isCompactLayout,
}: CalcJourneyBoardWidthInput): number {
  const widthBasedMax = isTablet
    ? Math.min(screenWidth * 0.7, 640)
    : isCompactLayout
      ? 430
      : 470;

  const heightBasedMax =
    isTablet && availableHeight > 0
      ? Math.max(
          0,
          (availableHeight - BOARD_MARGIN_TOP - BUBBLE_OVERFLOW_RESERVE) * VIEWBOX_RATIO,
        )
      : Number.POSITIVE_INFINITY;

  const boardMaxWidth = Math.min(widthBasedMax, heightBasedMax);
  return Math.min(screenWidth - BOARD_CONTAINER_PADDING, boardMaxWidth);
}
