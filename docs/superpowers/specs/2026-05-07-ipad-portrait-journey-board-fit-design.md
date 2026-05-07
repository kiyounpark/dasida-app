# iPad 세로 모드 학습 여정 보드 한 화면 표시

## 배경

iPad 세로 모드에서 `학습 여정` 화면(`features/quiz/components/quiz-hub-screen-view.tsx`)이 한 화면에 들어오지 않고 STEP 4가 잘려 스크롤해야 보입니다. 또한 일부 STEP의 말풍선(`JourneyActiveBubble`, 특히 diagnostic의 `top: -14%`)이 ScrollView 상단에서 클리핑됩니다.

이전 커밋(`5269324`, `cae629c`, `4bd22af`)으로 iPad용 보드/배너/CTA 크기 스케일링이 추가되었지만, 보드 크기를 **screen width 기반**(`min(screenWidth × 0.7, 640)`)으로만 결정하고 있어서, 화면 **세로 공간**이 부족할 때 그대로 넘쳐 흐릅니다.

## 목표

1. iPad 세로 모드 모든 모델(mini 6, Air, Pro 11", Pro 12.9")에서 학습 여정 보드 4개 STEP이 **한 화면에 모두 보인다**.
2. 말풍선(특히 diagnostic의 `top: -14%`)이 ScrollView 상단/하단에서 잘리지 않는다.
3. 폰(non-tablet) 레이아웃에는 영향이 없다.
4. iPad 가로 모드, split view 등 가용 폭이 좁아지는 케이스에도 자연스럽게 대응한다.

## 비목표

- 보드 SVG 노드 좌표/곡선 재설계
- iPad 전용 2단 레이아웃 도입
- 4개 STEP 외 다른 콘텐츠(`ReviewHomeCard`, `HomeWeaknessSection` 등)의 레이아웃 변경

## 현재 구조

### `quiz-hub-screen-view.tsx`

```
View (flex: 1, screen)
├── BrandHeader (졸업 후 상태에서만)
├── heroHeader  (paddingTop: insets.top + base + bannerRaise)
│   └── PosterTitleBanner ("학습 여정" 배너, tablet에서 maxWidth 560)
├── outerNotice (선택)
├── ScrollView (flex: 1)
│   └── JourneyBoard (marginTop: 52)
└── ctaFooter (paddingBottom: insets.bottom + 24~28)
```

`heroHeader`의 실제 높이는 `onLayout`을 통해 `heroLayoutBottom`(state)으로 이미 측정되고 있습니다. 현재는 `outerNoticeOverlay` 위치 계산에만 사용되고 있습니다.

### `journey-board.tsx`

보드 너비 결정 로직:

```ts
const boardMaxWidth = isTablet
  ? Math.min(screenWidth * 0.7, 640)
  : isCompactLayout ? 430 : 470;
const boardWidth = Math.min(screenWidth - BOARD_CONTAINER_PADDING, boardMaxWidth);
```

높이는 `aspectRatio: VIEWBOX_WIDTH / VIEWBOX_HEIGHT = 768 / 960`으로 너비에 종속(높이 = 너비 × 1.25). 즉 **너비를 키우면 높이가 비례해서 커집니다**.

### 문제 시나리오 (iPad mini 6 portrait, 744 × 1133pt 기준)

- `heroLayoutBottom` ≈ 240pt (배너 + paddingTop)
- CTA footer ≈ 110pt
- ScrollView padding ≈ 14 + (insets.bottom + 12) ≈ 46pt
- 보드 marginTop = 52pt
- 가용 보드 높이 ≈ 1133 − 240 − 110 − 46 − 52 = **685pt**
- 현재 boardWidth = min(744×0.7, 640) = 521pt → boardHeight = 521 × 1.25 = **651pt** (가까스로 들어가지만 말풍선 -14% × 651 = 91pt 오버플로우 → 클리핑)

iPad Air/Pro 11"는 더 빠듯하거나 초과하고, 큰 iPad Pro 12.9"만 여유 있게 들어옵니다.

## 설계

### 핵심 아이디어

**세로 가용 높이를 측정해서 보드 크기에 상한을 추가한다.** 기존 width-기반 상한(`min(screenWidth × 0.7, 640)`)은 그대로 두고, 거기에 **height-기반 상한**을 `Math.min`으로 결합합니다.

### 변경 1: `quiz-hub-screen-view.tsx`

`screenHeight`와 `heroLayoutBottom`(이미 있음)으로 가용 높이 계산:

```ts
const { height: screenHeight } = useWindowDimensions();

// CTA footer가 차지하는 높이(고정값 + insets)
const ctaFooterHeight =
  CTA_BUTTON_ESTIMATED_HEIGHT  // 56
  + CTA_FOOTER_PADDING_TOP     // 4
  + insets.bottom
  + (isCompactLayout ? 24 : 28);

// ScrollView 안에서 보드가 쓸 수 있는 세로 공간
const boardAvailableHeight = Math.max(
  0,
  screenHeight - heroLayoutBottom - ctaFooterHeight - scrollTopPadding - bottomPadding,
);
```

`heroLayoutBottom`이 0(첫 렌더 직후)일 때는 보드가 width-only 모드로 그려지고, onLayout 콜백 후 즉시 한 번 더 렌더되며 height 제약이 적용됩니다. 이 짧은 깜빡임을 막기 위해 **첫 렌더 시 보드를 width-only로 표시하되 width-only 결과가 height 제약보다 큰 경우만 줄인다**(아래 변경 2 참고).

`<JourneyBoard>`에 `availableHeight` prop을 전달:

```tsx
<JourneyBoard
  availableHeight={boardAvailableHeight}
  isCompactLayout={isCompactLayout}
  onPressCurrentStep={onPressJourneyCta}
  state={journey}
/>
```

### 변경 2: `journey-board.tsx`

새 prop `availableHeight`를 받아 height-기반 상한을 추가:

```ts
const BOARD_MARGIN_TOP = 52;
const BUBBLE_OVERFLOW_RESERVE = 24; // 말풍선 top: -14%가 잘리지 않도록 살짝 더 줄여줌

export function JourneyBoard({
  availableHeight,
  isCompactLayout,
  onPressCurrentStep,
  state,
}: {
  availableHeight: number;
  isCompactLayout: boolean;
  onPressCurrentStep: () => void;
  state: HomeJourneyState;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = useIsTablet();

  const widthBasedMax = isTablet
    ? Math.min(screenWidth * 0.7, 640)
    : isCompactLayout ? 430 : 470;

  // 폰에서는 height 제약을 적용하지 않음(현재도 한 화면에 들어옴).
  // iPad에서만 가용 높이 기반 상한을 추가한다.
  // availableHeight === 0 (heroLayoutBottom 측정 전 첫 렌더)이면 width-only로 동작.
  const heightBasedMax =
    isTablet && availableHeight > 0
      ? Math.max(
          0,
          (availableHeight - BOARD_MARGIN_TOP - BUBBLE_OVERFLOW_RESERVE) *
            (VIEWBOX_WIDTH / VIEWBOX_HEIGHT),
        )
      : Number.POSITIVE_INFINITY;

  const boardMaxWidth = Math.min(widthBasedMax, heightBasedMax);
  const boardWidth = Math.min(screenWidth - BOARD_CONTAINER_PADDING, boardMaxWidth);
  // ... 이하 기존 SVG 폰트 사이즈 계산은 그대로
}
```

`BUBBLE_OVERFLOW_RESERVE = 24`는 diagnostic 말풍선이 보드 위쪽으로 `top: -14%`만큼 튀어나오는 부분을 ScrollView 상단 클리핑으로부터 보호하기 위한 안전 마진입니다. ScrollView 상단까지의 실제 여유는 `scrollTopPadding(14) + marginTop(52) = 66pt`이며, 보드 크기를 줄일 때 24pt를 더 깎아 두면 거의 모든 iPad 사이즈에서 말풍선이 잘리지 않습니다. 시뮬레이터 검증 후 미세조정 여지 있음.

### 가독성/타이포그래피 영향

- 보드가 작아지면 SVG 텍스트 크기는 자동 보정(`calcSvgFontSize`가 `targetPx × VIEWBOX_WIDTH / boardWidth`로 환산)되므로 STEP 라벨/상태 텍스트는 시각적으로 16px/14px을 유지합니다.
- 말풍선 텍스트(`JourneyActiveBubble`의 `line` 18px / `lineCompact` 17px)는 보드 크기와 무관하게 고정. iPad 세로에서 보드가 약간 작아져도 가독성에 문제 없는 수준입니다.

## 영향 분석

### 폰 (iPhone, isTablet=false)

본 설계는 **`isTablet`일 때만 height-기반 상한을 적용**하므로 폰에서는 동작이 완전히 무변경입니다. (`heightBasedMax = Number.POSITIVE_INFINITY` → `Math.min`이 항상 `widthBasedMax`를 선택)

### iPad 가로 / split view

- `useIsTablet`은 width 기준이라 좁은 split view에서 false가 될 수 있음 → 자동으로 폰 분기로 동작 (변화 없음)
- 가로 모드 iPad는 height가 작아지므로 height-기반 상한이 강하게 작동, 보드가 가로로 더 좁아지는 대신 한 화면에 들어옴

### 첫 렌더 시 깜빡임

- `heroLayoutBottom = 0` → `availableHeight = 0` → height 제약 무시 → width-only로 그려짐
- onLayout 후 `availableHeight`이 정상화되며 width가 줄어드는 경우 한 번 리레이아웃
- 실제로는 같은 프레임 내에서 처리되므로 인지하기 어려움. 만약 거슬리면 `availableHeight === 0`일 때 보드를 `opacity: 0`으로 한 프레임 숨겼다 보여줌.

## 테스트 시나리오

### 수동 (Expo Go / 시뮬레이터)

1. **iPad mini 6 portrait (744 × 1133)** — 4개 STEP, CTA 버튼, 배너가 모두 한 화면에 보이고 스크롤 불필요
2. **iPad Air portrait (820 × 1180)** — 위와 동일
3. **iPad Pro 11" portrait (834 × 1194)** — 위와 동일
4. **iPad Pro 12.9" portrait (1024 × 1366)** — 보드가 width-기반 상한(640pt)으로 결정되어 변경 전과 동일하게 보임
5. **iPad 가로 모드** — 보드가 세로 공간에 맞춰 자연스럽게 줄어듦, 한 화면에 들어옴
6. **iPhone 15 Pro / SE** — 변경 없음(기존 동작과 동일)
7. **diagnostic 단계의 말풍선** "반가워요! 첫 진단 시작할게요"가 잘리지 않고 완전히 보임
8. **review 단계 말풍선** (top: 35.5%)도 보드 안에 정상 표시

### 자동

`features/quiz/components/__tests__/journey-board.test.tsx`(없으면 신규):
- 작은 `availableHeight`가 들어오면 `boardWidth`가 height-기반 상한으로 줄어드는지 검증
- `availableHeight === 0`이면 width-only로 동작하는지 검증
- `isTablet=false`이면 height 제약이 무시되는지 검증

## 마이그레이션 / 롤백

- 단일 PR, 기능 플래그 불필요 (UI만 영향, 데이터/네트워크/저장소 무관)
- 롤백 시 두 파일을 직전 상태로 되돌리면 끝

## 오픈 이슈

- `BUBBLE_OVERFLOW_RESERVE` 값: 24로 시작, 실제 시뮬레이터 확인 후 조정 가능
- iPad에서 보드가 작아지면 캐릭터 이미지 픽셀 밀도 이슈 (현재 PNG 에셋이 충분히 커서 다운스케일만 발생, 문제 없을 것으로 예상)
