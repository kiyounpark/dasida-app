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
  side: 'left' | 'right';
};

const bubbleLayoutConfig: Record<JourneyStepKey, BubbleLayoutConfig> = {
  diagnostic: {
    side: 'left',
    bubbleStyle: { left: '38%', top: '-8%', width: '50%' },
    bubbleStyleCompact: { left: '39%', top: '-7%', width: '50%' },
  },
  analysis: {
    side: 'right',
    bubbleStyle: { left: '28%', top: '11%', width: '38%' },
    bubbleStyleCompact: { left: '27%', top: '12%', width: '40%' },
  },
  review: {
    side: 'left',
    bubbleStyle: { left: '42%', top: '35.5%', width: '37%' },
    bubbleStyleCompact: { left: '41%', top: '36.5%', width: '39%' },
  },
  exam: {
    side: 'right',
    bubbleStyle: { left: '28%', top: '42.5%', width: '38%' },
    bubbleStyleCompact: { left: '27%', top: '43.5%', width: '40%' },
  },
};

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
          ]}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            numberOfLines={2}
            style={[styles.line, isCompactLayout && styles.lineCompact]}>
            {bubbleText}
          </Text>
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
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleContentLeftTail: {
    // mirrors bubbleBackdropCoreLeftTail percentages
    top: '9%',
    bottom: '14%',
    left: '7%',
    right: '7%',
  },
  bubbleContentRightTail: {
    // mirrors bubbleBackdropCoreRightTail percentages
    top: '8%',
    bottom: '12%',
    left: '6%',
    right: '7%',
  },
  line: {
    fontFamily: FontFamilies.medium,
    fontSize: 18,
    lineHeight: 24,
    color: '#16120E',
    textAlign: 'center',
  },
  lineCompact: {
    fontSize: 17,
    lineHeight: 22,
  },
});
