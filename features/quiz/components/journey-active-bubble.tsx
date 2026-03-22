import { Image } from 'expo-image';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { JourneyStepKey } from '@/features/learning/home-journey-state';

const leftTailBubbleImage = require('../../../speech_bubble_transparent_cropped_left.png');
const rightTailBubbleImage = require('../../../speech_bubble_right_transparent_cropped_right.png');
const LEFT_TAIL_BUBBLE_ASPECT_RATIO = 687 / 415;
const RIGHT_TAIL_BUBBLE_ASPECT_RATIO = 668 / 398;

type BubbleLayoutConfig = {
  bubbleStyle: ViewStyle;
  bubbleStyleCompact: ViewStyle;
  contentStyle?: ViewStyle;
  contentStyleCompact?: ViewStyle;
  side: 'left' | 'right';
};

const bubbleLayoutConfig: Record<JourneyStepKey, BubbleLayoutConfig> = {
  diagnostic: {
    side: 'left',
    bubbleStyle: { left: '38%', top: '-8%', width: '44%' },
    bubbleStyleCompact: { left: '39%', top: '-7%', width: '46%' },
    contentStyle: { paddingTop: 10, paddingBottom: 16, paddingLeft: 30, paddingRight: 18 },
    contentStyleCompact: { paddingTop: 10, paddingBottom: 14, paddingLeft: 28, paddingRight: 16 },
  },
  analysis: {
    side: 'right',
    bubbleStyle: { left: '28%', top: '11%', width: '38%' },
    bubbleStyleCompact: { left: '27%', top: '12%', width: '40%' },
    contentStyle: { paddingTop: 10, paddingBottom: 14, paddingLeft: 18, paddingRight: 24 },
    contentStyleCompact: { paddingTop: 10, paddingBottom: 12, paddingLeft: 16, paddingRight: 22 },
  },
  review: {
    side: 'left',
    bubbleStyle: { left: '42%', top: '35.5%', width: '37%' },
    bubbleStyleCompact: { left: '41%', top: '36.5%', width: '39%' },
    contentStyle: { paddingTop: 10, paddingBottom: 14, paddingLeft: 24, paddingRight: 18 },
    contentStyleCompact: { paddingTop: 10, paddingBottom: 12, paddingLeft: 22, paddingRight: 16 },
  },
  exam: {
    side: 'right',
    bubbleStyle: { left: '28%', top: '42.5%', width: '38%' },
    bubbleStyleCompact: { left: '27%', top: '43.5%', width: '40%' },
    contentStyle: { paddingTop: 10, paddingBottom: 14, paddingLeft: 18, paddingRight: 24 },
    contentStyleCompact: { paddingTop: 10, paddingBottom: 12, paddingLeft: 16, paddingRight: 22 },
  },
};

const bubbleLinesByStep: Record<JourneyStepKey, string[]> = {
  diagnostic: ['반가워요!', '첫 진단 평가를', '시작해볼까요?'],
  analysis: ['내 약점을 분석', '중이에요...'],
  review: ['이제 연습할', '시간!'],
  exam: ['이제 실전에', '써볼 차례예요!'],
};

function getBubbleLines(stepKey: JourneyStepKey, bubbleText: string) {
  const lines = bubbleLinesByStep[stepKey];

  if (lines.length > 0) {
    return lines;
  }

  return [bubbleText];
}

export function JourneyActiveBubble({
  bubbleText,
  isCompactLayout,
  stepKey,
}: {
  bubbleText: string;
  isCompactLayout: boolean;
  stepKey: JourneyStepKey;
}) {
  const layout = bubbleLayoutConfig[stepKey];
  const lines = getBubbleLines(stepKey, bubbleText);
  const bubbleSide = layout.side;
  const bubbleAspectRatio =
    bubbleSide === 'left' ? LEFT_TAIL_BUBBLE_ASPECT_RATIO : RIGHT_TAIL_BUBBLE_ASPECT_RATIO;
  const bubbleImageSource = bubbleSide === 'left' ? leftTailBubbleImage : rightTailBubbleImage;

  return (
    <View collapsable={false} pointerEvents="none" style={styles.layer}>
      <View
        style={[
          styles.bubbleFrame,
          { aspectRatio: bubbleAspectRatio },
          layout.bubbleStyle,
          isCompactLayout && layout.bubbleStyleCompact,
        ]}>
        <View
          style={[
            styles.bubbleBackdrop,
            bubbleSide === 'left' ? styles.bubbleBackdropLeftTail : styles.bubbleBackdropRightTail,
          ]}>
          <View
            style={[
              styles.bubbleBackdropCore,
              bubbleSide === 'left' ? styles.bubbleBackdropCoreLeftTail : styles.bubbleBackdropCoreRightTail,
            ]}
          />
          <View
            style={[
              styles.bubbleBackdropTail,
              bubbleSide === 'left' ? styles.bubbleBackdropTailLeft : styles.bubbleBackdropTailRight,
            ]}
          />
          <View
            style={[
              styles.bubbleBackdropTailJoin,
              bubbleSide === 'left' ? styles.bubbleBackdropTailJoinLeft : styles.bubbleBackdropTailJoinRight,
            ]}
          />
        </View>
        <Image contentFit="contain" source={bubbleImageSource} style={styles.bubbleImage} transition={0} />
        <View
          style={[
            styles.bubbleContent,
            bubbleSide === 'left' ? styles.bubbleContentLeftTail : styles.bubbleContentRightTail,
            isCompactLayout && styles.bubbleContentCompact,
            layout.contentStyle,
            isCompactLayout && layout.contentStyleCompact,
            isCompactLayout &&
              (bubbleSide === 'left'
                ? styles.bubbleContentLeftTailCompact
                : styles.bubbleContentRightTailCompact),
          ]}>
          {lines.map((line) => (
            <Text
              key={`${stepKey}-${line}`}
              selectable
              style={[styles.line, isCompactLayout && styles.lineCompact]}>
              {line}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  bubbleFrame: {
    position: 'absolute',
  },
  bubbleBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bubbleBackdropCore: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#F8F4EA',
  },
  bubbleBackdropCoreLeftTail: {
    top: '9%',
    bottom: '14%',
    left: '7%',
    right: '7%',
  },
  bubbleBackdropCoreRightTail: {
    top: '8%',
    bottom: '12%',
    left: '6%',
    right: '7%',
  },
  bubbleBackdropTail: {
    position: 'absolute',
    bottom: '7%',
    width: '15%',
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: '#F8F4EA',
  },
  bubbleBackdropTailJoin: {
    position: 'absolute',
    bottom: '10%',
    width: '14%',
    height: '14%',
    borderRadius: 999,
    backgroundColor: '#F8F4EA',
  },
  bubbleBackdropLeftTail: {
    left: '1%',
  },
  bubbleBackdropRightTail: {
    right: '1%',
  },
  bubbleBackdropTailLeft: {
    left: '14%',
    transform: [{ rotate: '20deg' }],
  },
  bubbleBackdropTailRight: {
    right: '14%',
    transform: [{ rotate: '-18deg' }],
  },
  bubbleBackdropTailJoinLeft: {
    left: '19%',
  },
  bubbleBackdropTailJoinRight: {
    right: '18%',
  },
  bubbleImage: {
    ...StyleSheet.absoluteFillObject,
  },
  bubbleContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  bubbleContentCompact: {
    paddingTop: 15,
    paddingBottom: 20,
  },
  bubbleContentLeftTail: {
    paddingTop: 14,
    paddingBottom: 18,
    paddingLeft: 24,
    paddingRight: 18,
  },
  bubbleContentRightTail: {
    paddingTop: 14,
    paddingBottom: 18,
    paddingLeft: 18,
    paddingRight: 24,
  },
  bubbleContentLeftTailCompact: {
    paddingLeft: 22,
    paddingRight: 16,
  },
  bubbleContentRightTailCompact: {
    paddingLeft: 16,
    paddingRight: 22,
  },
  line: {
    fontFamily: FontFamilies.medium,
    fontSize: 17,
    lineHeight: 22,
    color: '#16120E',
    textAlign: 'center',
  },
  lineCompact: {
    fontSize: 16,
    lineHeight: 21,
  },
});
