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
  /**
   * 태블릿 split layout 등에서 보드가 차지할 컨테이너 폭.
   * 지정 시 screenWidth 대신 이 값을 width 기준으로 사용.
   * 미지정 시 기존 동작 (screenWidth 기준).
   */
  containerWidth?: number;
};

/**
 * 학습 여정 보드의 실제 렌더 너비를 계산한다.
 * - 폰: width 기반 상한만 사용 (containerWidth 무시)
 * - 태블릿: containerWidth 우선, 없으면 screenWidth. height 기반 상한도 동일 컨테이너 기준
 * - availableHeight === 0 (첫 렌더, heroLayoutBottom 측정 전)이면 width-only로 동작
 */
export function calcJourneyBoardWidth({
  screenWidth,
  availableHeight,
  isTablet,
  isCompactLayout,
  containerWidth,
}: CalcJourneyBoardWidthInput): number {
  if (!isTablet) {
    const widthBasedMax = isCompactLayout ? 430 : 470;
    return Math.min(screenWidth - BOARD_CONTAINER_PADDING, widthBasedMax);
  }

  // 태블릿: containerWidth 가 있으면 그것을 우선 (split layout). 없으면 screenWidth.
  const referenceWidth = containerWidth ?? screenWidth;
  const widthRatio = containerWidth !== undefined ? 0.85 : 0.7;
  const widthBasedMax = Math.min(referenceWidth * widthRatio, 680);

  const heightBasedMax =
    availableHeight > 0
      ? Math.max(
          0,
          (availableHeight - BOARD_MARGIN_TOP - BUBBLE_OVERFLOW_RESERVE) * VIEWBOX_RATIO,
        )
      : Number.POSITIVE_INFINITY;

  const boardMaxWidth = Math.min(widthBasedMax, heightBasedMax);
  return Math.min(referenceWidth - BOARD_CONTAINER_PADDING, boardMaxWidth);
}
