import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type {
  HomeJourneyState,
  HomeJourneyStep,
  JourneyStepKey,
} from '@/features/learning/home-journey-state';
import { JourneyActiveBubble } from '@/features/quiz/components/journey-active-bubble';
import { JourneyCtaButton } from '@/features/quiz/components/journey-cta-button';
import { JourneyStepNode } from '@/features/quiz/components/journey-step-node';

const VIEWBOX_Y = 280;
const VIEWBOX_WIDTH = 768;
const VIEWBOX_HEIGHT = 960;
const JOURNEY_DASH_PATTERN = '20 18';

const journeyImageSources: Record<JourneyStepKey, number> = {
  diagnostic: require('../../../assets/journey/step-1-diagnostic.png'),
  analysis: require('../../../assets/journey/step-2-analysis.png'),
  review: require('../../../assets/journey/step-3-review.png'),
  exam: require('../../../assets/journey/step-4-exam.png'),
};

type JourneyAbsoluteRect = {
  height: `${number}%`;
  left: `${number}%`;
  top: `${number}%`;
  width: `${number}%`;
};

type Point = {
  x: number;
  y: number;
};

type StepCopyConfig = {
  statusX: number;
  statusY: number;
  titleX: number;
  titleY: number;
  titleAnchor?: 'start' | 'end';
};

const nodeRectStyle: Record<JourneyStepKey, JourneyAbsoluteRect> = {
  diagnostic: { left: '9%', top: '9%', width: '34%', height: '16%' },
  analysis: { left: '60%', top: '29.5%', width: '20%', height: '16.5%' },
  review: { left: '19%', top: '49%', width: '25%', height: '16%' },
  exam: { left: '59%', top: '60.5%', width: '21%', height: '17%' },
};

const stepCopyConfig: Record<JourneyStepKey, StepCopyConfig> = {
  diagnostic: { titleX: 75, titleY: 586, statusX: 207, statusY: 630 },
  analysis: { titleX: 752, titleY: 742, statusX: 606, statusY: 787, titleAnchor: 'end' },
  review: { titleX: 75, titleY: 918, statusX: 235, statusY: 962 },
  exam: { titleX: 752, titleY: 1068, statusX: 602, statusY: 1113, titleAnchor: 'end' },
};

const nodeVisualBias: Record<JourneyStepKey, Point> = {
  diagnostic: { x: 0.02, y: 0 },
  analysis: { x: 0.01, y: 0.02 },
  review: { x: 0.04, y: 0 },
  exam: { x: 0.01, y: 0.02 },
};

function percentToNumber(percent: `${number}%`) {
  return Number.parseFloat(percent) / 100;
}

function getNodeAnchor(stepKey: JourneyStepKey, offset: Point = { x: 0, y: 0 }): Point {
  const rect = nodeRectStyle[stepKey];
  const bias = nodeVisualBias[stepKey];
  const width = VIEWBOX_WIDTH * percentToNumber(rect.width);
  const height = VIEWBOX_HEIGHT * percentToNumber(rect.height);
  const left = VIEWBOX_WIDTH * percentToNumber(rect.left);
  const top = VIEWBOX_Y + VIEWBOX_HEIGHT * percentToNumber(rect.top);

  return {
    x: left + width / 2 + width * (bias.x + offset.x),
    y: top + height / 2 + height * (bias.y + offset.y),
  };
}

function offsetPoint(point: Point, dx: number, dy: number): Point {
  return {
    x: point.x + dx,
    y: point.y + dy,
  };
}

function formatPoint(point: Point) {
  return `${Math.round(point.x * 10) / 10} ${Math.round(point.y * 10) / 10}`;
}

function createCurvePath(start: Point, controlA: Point, controlB: Point, end: Point) {
  return `M ${formatPoint(start)} C ${formatPoint(controlA)}, ${formatPoint(controlB)}, ${formatPoint(end)}`;
}

function DashedGuide({ d }: { d: string }) {
  return (
    <Path
      d={d}
      fill="none"
      stroke="rgba(94, 86, 73, 0.34)"
      strokeWidth={3.2}
      strokeDasharray={JOURNEY_DASH_PATTERN}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function getStatusTextColor(status: HomeJourneyStep['status']) {
  if (status === 'active') {
    return BrandColors.primaryDark;
  }

  if (status === 'completed') {
    return 'rgba(72, 67, 58, 0.48)';
  }

  if (status === 'pending') {
    return 'rgba(72, 67, 58, 0.4)';
  }

  return 'rgba(72, 67, 58, 0.34)';
}

function getStepTitleColor(status: HomeJourneyStep['status']) {
  return status === 'active' ? '#111111' : 'rgba(72, 67, 58, 0.5)';
}

// posterScreen paddingHorizontal(14) × 2
const BOARD_CONTAINER_PADDING = 28;
// 화면에서 실제로 보이기를 원하는 목표 px 크기
const TARGET_STEP_TITLE_PX = 16;
const TARGET_STATUS_PX = 14;

function calcSvgFontSize(targetPx: number, boardWidth: number): number {
  return Math.round(targetPx * (VIEWBOX_WIDTH / boardWidth));
}

export function JourneyBoard({
  isCompactLayout,
  onPressCurrentStep,
  onPressCta,
  state,
}: {
  isCompactLayout: boolean;
  onPressCurrentStep: () => void;
  onPressCta: () => void;
  state: HomeJourneyState;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const boardMaxWidth = isCompactLayout ? 430 : 470;
  const boardWidth = Math.min(screenWidth - BOARD_CONTAINER_PADDING, boardMaxWidth);
  const stepTitleFontSize = calcSvgFontSize(TARGET_STEP_TITLE_PX, boardWidth);
  const statusFontSize = calcSvgFontSize(TARGET_STATUS_PX, boardWidth);
  const topGuideStart = getNodeAnchor('diagnostic', { x: 0.56, y: -0.12 });
  const topGuideEnd = getNodeAnchor('analysis', { x: -0.62, y: -0.28 });
  const middleGuideStart = getNodeAnchor('analysis', { x: -0.52, y: 0.26 });
  const middleGuideEnd = getNodeAnchor('review', { x: 0.32, y: -0.34 });
  const bottomGuideStart = getNodeAnchor('review', { x: 0.48, y: 0.16 });
  const bottomGuideEnd = getNodeAnchor('exam', { x: -0.36, y: -0.36 });
  const topGuidePath = createCurvePath(
    topGuideStart,
    offsetPoint(topGuideStart, 148, -12),
    offsetPoint(topGuideEnd, -118, -82),
    topGuideEnd,
  );
  const middleGuidePath = createCurvePath(
    middleGuideStart,
    offsetPoint(middleGuideStart, -108, 26),
    offsetPoint(middleGuideEnd, 118, -74),
    middleGuideEnd,
  );
  const bottomGuidePath = createCurvePath(
    bottomGuideStart,
    offsetPoint(bottomGuideStart, 104, 6),
    offsetPoint(bottomGuideEnd, -42, -112),
    bottomGuideEnd,
  );

  return (
    <View style={styles.wrap}>
      <View style={[styles.board, isCompactLayout && styles.boardCompact]}>
        <View pointerEvents="none" style={styles.textureOverlay} />
        <JourneyActiveBubble
          bubbleText={state.currentBubbleText}
          isCompactLayout={isCompactLayout}
          stepKey={state.currentStepKey}
        />
        <Svg
          pointerEvents="none"
          viewBox={`0 ${VIEWBOX_Y} ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          style={StyleSheet.absoluteFill}>
          <DashedGuide d={topGuidePath} />
          <DashedGuide d={middleGuidePath} />
          <DashedGuide d={bottomGuidePath} />

          {state.steps.map((step) => {
            const copy = stepCopyConfig[step.key];
            return (
              <SvgText
                key={`${step.key}-title`}
                x={copy.titleX}
                y={copy.titleY}
                fill={getStepTitleColor(step.status)}
                fontFamily={FontFamilies.bold}
                fontSize={stepTitleFontSize}
                textAnchor={copy.titleAnchor ?? 'start'}>
                {`STEP ${step.number}: ${step.title}`}
              </SvgText>
            );
          })}

          {state.steps.map((step) => {
            const copy = stepCopyConfig[step.key];
            return (
              <SvgText
                key={`${step.key}-status`}
                x={copy.statusX}
                y={copy.statusY}
                fill={getStatusTextColor(step.status)}
                fontFamily={FontFamilies.bold}
                fontSize={statusFontSize}
                textAnchor="middle">
                {step.statusLabel}
              </SvgText>
            );
          })}
        </Svg>

        {state.steps.map((step) => (
          <JourneyStepNode
            key={step.key}
            imageSource={journeyImageSources[step.key]}
            onPress={step.status === 'active' ? onPressCurrentStep : undefined}
            step={step}
            style={nodeRectStyle[step.key]}
          />
        ))}

        <JourneyCtaButton
          accessibilityLabel={state.ctaLabel}
          compact={isCompactLayout}
          label={state.ctaLabel}
          onPress={onPressCta}
          style={[styles.ctaButton, isCompactLayout && styles.ctaButtonCompact]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    flexShrink: 1,
  },
  board: {
    width: '100%',
    maxWidth: 470,
    aspectRatio: VIEWBOX_WIDTH / VIEWBOX_HEIGHT,
    position: 'relative',
    overflow: 'visible',
    marginTop: 10,
  },
  boardCompact: {
    maxWidth: 430,
  },
  textureOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  ctaButton: {
    position: 'absolute',
    left: '17%',
    width: '66%',
    bottom: '-2%',
  },
  ctaButtonCompact: {
    left: '14%',
    width: '72%',
    bottom: '-4.5%',
  },
});
