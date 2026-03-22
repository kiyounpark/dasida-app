import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Text as SvgText, TSpan } from 'react-native-svg';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type {
  HomeJourneyState,
  HomeJourneyStep,
  JourneyStepKey,
} from '@/features/learning/home-journey-state';
import { JourneyStepNode } from '@/features/quiz/components/journey-step-node';

const VIEWBOX_Y = 280;
const VIEWBOX_WIDTH = 768;
const VIEWBOX_HEIGHT = 960;

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

type JourneyAnchor = {
  outerRx: number;
  outerRy: number;
  x: number;
  y: number;
};

type BubbleConfig = {
  path: string;
  textX: number;
  textY: number;
};

type StepCopyConfig = {
  statusX: number;
  statusY: number;
  titleX: number;
  titleY: number;
};

const nodeRectStyle: Record<JourneyStepKey, JourneyAbsoluteRect> = {
  diagnostic: { left: '9.1%', top: '11%', width: '25.5%', height: '11.1%' },
  analysis: { left: '61.7%', top: '29.2%', width: '17.7%', height: '14.5%' },
  review: { left: '21.6%', top: '50.6%', width: '22.4%', height: '13.1%' },
  exam: { left: '64.1%', top: '68.3%', width: '17.2%', height: '15.2%' },
};

const stepAnchors: Record<JourneyStepKey, JourneyAnchor> = {
  diagnostic: { x: 207, y: 501, outerRx: 128, outerRy: 111 },
  analysis: { x: 564, y: 672, outerRx: 118, outerRy: 104 },
  review: { x: 244, y: 916, outerRx: 114, outerRy: 100 },
  exam: { x: 548, y: 1081, outerRx: 116, outerRy: 101 },
};

const stepCopyConfig: Record<JourneyStepKey, StepCopyConfig> = {
  diagnostic: { titleX: 92, titleY: 470, statusX: 206, statusY: 518 },
  analysis: { titleX: 456, titleY: 733, statusX: 606, statusY: 778 },
  review: { titleX: 92, titleY: 913, statusX: 245, statusY: 959 },
  exam: { titleX: 487, titleY: 1139, statusX: 611, statusY: 1185 },
};

const bubbleConfig: Record<JourneyStepKey, BubbleConfig> = {
  diagnostic: {
    path: 'M398 362C398 337 428 322 488 322C548 322 578 337 578 362C578 387 548 402 488 402C468 402 458 407 448 412C453 402 428 402 398 362Z',
    textX: 489,
    textY: 356,
  },
  analysis: {
    path: 'M591 557C591 529 627 515 681 515C729 515 761 529 761 557C761 583 731 599 681 599C661 599 650 607 637 613C643 602 617 600 591 557Z',
    textX: 678,
    textY: 555,
  },
  review: {
    path: 'M34 783C34 755 64 741 110 741C154 741 186 755 186 783C186 809 156 825 110 825C94 825 84 833 74 839C78 829 55 826 34 783Z',
    textX: 110,
    textY: 783,
  },
  exam: {
    path: 'M612 930C612 902 642 888 688 888C732 888 764 902 764 930C764 956 734 972 688 972C672 972 662 980 652 986C656 976 633 973 612 930Z',
    textX: 688,
    textY: 928,
  },
};

const bubbleTextByStep: Record<JourneyStepKey, string[]> = {
  diagnostic: ['반가워요!', '첫 진단 평가를', '시작해볼까요?'],
  analysis: ['내 약점을 분석', '중이에요...'],
  review: ['이제 연습할', '시간!'],
  exam: ['와, 정말', '최고예요!'],
};

function getCompletedSegmentCount(currentStepKey: JourneyStepKey) {
  switch (currentStepKey) {
    case 'analysis':
      return 1;
    case 'review':
      return 2;
    case 'exam':
      return 3;
    default:
      return 0;
  }
}

function getStatusTextColor(status: HomeJourneyStep['status']) {
  if (status === 'active') {
    return BrandColors.primaryDark;
  }

  if (status === 'completed') {
    return '#4F6957';
  }

  if (status === 'pending') {
    return '#685E51';
  }

  return '#766F64';
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
  const completedSegmentCount = getCompletedSegmentCount(state.currentStepKey);
  const activeAnchor = stepAnchors[state.currentStepKey];
  const bubbleFontSize = isCompactLayout ? 34 : 36;
  const stepTitleFontSize = isCompactLayout ? 30 : 32;
  const statusFontSize = isCompactLayout ? 26 : 28;

  return (
    <View style={styles.wrap}>
      <View style={[styles.board, isCompactLayout && styles.boardCompact]}>
        <View pointerEvents="none" style={styles.textureOverlay} />
        <Svg
          pointerEvents="none"
          viewBox={`0 ${VIEWBOX_Y} ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          style={StyleSheet.absoluteFill}>
          <Ellipse
            cx={activeAnchor.x}
            cy={activeAnchor.y}
            rx={activeAnchor.outerRx}
            ry={activeAnchor.outerRy}
            fill="rgba(83, 160, 95, 0.22)"
          />
          <Ellipse
            cx={activeAnchor.x}
            cy={activeAnchor.y}
            rx={activeAnchor.outerRx * 0.98}
            ry={activeAnchor.outerRy * 0.96}
            fill="none"
            stroke="rgba(45, 123, 72, 0.86)"
            strokeWidth={10}
          />
          <Ellipse
            cx={activeAnchor.x + 4}
            cy={activeAnchor.y + 2}
            rx={activeAnchor.outerRx * 0.84}
            ry={activeAnchor.outerRy * 0.82}
            fill="none"
            stroke="rgba(61, 137, 79, 0.76)"
            strokeWidth={8}
          />
          <Circle
            cx={activeAnchor.x + 135}
            cy={activeAnchor.y - 34}
            r={24}
            fill="rgba(83, 160, 95, 0.24)"
            stroke="rgba(31, 25, 19, 0.7)"
            strokeWidth={4}
          />
          <Circle
            cx={activeAnchor.x + 135}
            cy={activeAnchor.y - 34}
            r={16}
            fill="rgba(89, 141, 89, 0.7)"
            stroke="rgba(31, 25, 19, 0.72)"
            strokeWidth={2.8}
          />

          <Path
            d="M 432 357 C 527 346, 618 376, 634 452 C 644 508, 614 556, 578 606"
            fill="none"
            stroke="rgba(31, 25, 19, 0.76)"
            strokeWidth={5}
            strokeDasharray="18 16"
            strokeLinecap="round"
          />
          <Path
            d="M 428 378 C 510 366, 606 392, 608 458 C 610 520, 572 565, 512 606 C 473 633, 458 654, 456 685"
            fill="none"
            stroke="rgba(31, 25, 19, 0.88)"
            strokeWidth={8}
            strokeLinecap="round"
          />
          <Path
            d="M 422 372 C 506 360, 602 388, 604 454 C 606 516, 569 559, 510 600 C 470 627, 452 649, 448 682"
            fill="none"
            stroke="rgba(31, 25, 19, 0.72)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Path
            d="M 248 607 C 182 628, 146 675, 155 730 C 166 788, 226 800, 286 779"
            fill="none"
            stroke="rgba(31, 25, 19, 0.76)"
            strokeWidth={5}
            strokeDasharray="18 16"
            strokeLinecap="round"
          />
          <Path
            d="M 313 901 C 428 884, 508 823, 539 766 C 566 716, 592 690, 643 699"
            fill="none"
            stroke="rgba(31, 25, 19, 0.76)"
            strokeWidth={5}
            strokeDasharray="18 16"
            strokeLinecap="round"
          />
          <Path
            d="M 280 996 C 398 1032, 446 1045, 478 1098"
            fill="none"
            stroke="rgba(31, 25, 19, 0.88)"
            strokeWidth={8}
            strokeLinecap="round"
          />
          <Path
            d="M 274 991 C 390 1028, 438 1041, 472 1091"
            fill="none"
            stroke="rgba(31, 25, 19, 0.72)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Path
            d="M 95 875 C 72 987, 103 1090, 184 1170"
            fill="none"
            stroke="#2D7B48"
            strokeWidth={10}
            strokeLinecap="round"
          />
          <Path
            d="M 342 468 C 436 424, 518 470, 564 672"
            fill="none"
            stroke="rgba(45, 123, 72, 0.92)"
            strokeWidth={completedSegmentCount >= 1 ? 8 : 0}
            strokeLinecap="round"
          />
          <Path
            d="M 535 724 C 465 817, 347 885, 244 916"
            fill="none"
            stroke="rgba(45, 123, 72, 0.92)"
            strokeWidth={completedSegmentCount >= 2 ? 8 : 0}
            strokeLinecap="round"
          />
          <Path
            d="M 286 956 C 392 988, 470 1035, 548 1081"
            fill="none"
            stroke="rgba(45, 123, 72, 0.92)"
            strokeWidth={completedSegmentCount >= 3 ? 8 : 0}
            strokeLinecap="round"
          />

          {state.currentStepKey === 'diagnostic' ? (
            <>
              <SvgText
                x={90}
                y={530}
                fill="#1F1913"
                fontFamily={FontFamilies.medium}
                fontSize={28}
                textAnchor="start">
                여기를
              </SvgText>
              <SvgText
                x={78}
                y={565}
                fill="#1F1913"
                fontFamily={FontFamilies.medium}
                fontSize={28}
                textAnchor="start">
                눌러보세요
              </SvgText>
              <Path
                d="M60 485 C 24 485, 24 430, 56 414"
                fill="none"
                stroke="rgba(31, 25, 19, 0.92)"
                strokeWidth={5}
                strokeLinecap="round"
              />
              <Path
                d="M86 515 C 50 517, 49 469, 81 456"
                fill="none"
                stroke="rgba(31, 25, 19, 0.92)"
                strokeWidth={5}
                strokeLinecap="round"
              />
            </>
          ) : null}

          {(Object.entries(bubbleConfig) as Array<[JourneyStepKey, BubbleConfig]>).map(
            ([stepKey, bubble]) => (
              <Path
                key={`${stepKey}-bubble`}
                d={bubble.path}
                fill="rgba(255, 250, 242, 0.98)"
                stroke={stepKey === state.currentStepKey ? 'rgba(31, 25, 19, 0.95)' : 'rgba(31, 25, 19, 0.72)'}
                strokeWidth={stepKey === state.currentStepKey ? 4.5 : 3.5}
              />
            ),
          )}

          {(Object.entries(bubbleConfig) as Array<[JourneyStepKey, BubbleConfig]>).map(
            ([stepKey, bubble]) => (
              <SvgText
                key={`${stepKey}-bubble-text`}
                x={bubble.textX}
                y={bubble.textY}
                fill="#16120E"
                fontFamily={FontFamilies.medium}
                fontSize={bubbleFontSize}
                textAnchor="middle">
                {bubbleTextByStep[stepKey].map((line, index) => (
                  <TSpan key={`${stepKey}-${line}`} x={bubble.textX} dy={index === 0 ? 0 : 40}>
                    {line}
                  </TSpan>
                ))}
              </SvgText>
            ),
          )}

          {state.steps.map((step) => {
            const copy = stepCopyConfig[step.key];
            return (
              <SvgText
                key={`${step.key}-title`}
                x={copy.titleX}
                y={copy.titleY}
                fill="#111111"
                fontFamily={FontFamilies.bold}
                fontSize={stepTitleFontSize}
                textAnchor="start">
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

        <Pressable
          onPress={onPressCta}
          style={({ pressed }) => [
            styles.ctaButton,
            isCompactLayout && styles.ctaButtonCompact,
            pressed && styles.ctaButtonPressed,
          ]}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.84}
            numberOfLines={1}
            selectable
            style={[styles.ctaLabel, isCompactLayout && styles.ctaLabelCompact]}>
            {state.ctaLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    width: '100%',
    maxWidth: 470,
    aspectRatio: VIEWBOX_WIDTH / VIEWBOX_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
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
    left: '14%',
    right: '14%',
    bottom: '4.2%',
    minHeight: 62,
    borderRadius: 999,
    borderCurve: 'continuous',
    borderWidth: 2.6,
    borderColor: 'rgba(31, 25, 19, 0.94)',
    backgroundColor: '#2D7B48',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    boxShadow: '0 18px 30px rgba(45, 123, 72, 0.22)',
  },
  ctaButtonCompact: {
    minHeight: 56,
  },
  ctaButtonPressed: {
    opacity: 0.88,
  },
  ctaLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 22,
    lineHeight: 28,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  ctaLabelCompact: {
    fontSize: 19,
    lineHeight: 24,
  },
});
