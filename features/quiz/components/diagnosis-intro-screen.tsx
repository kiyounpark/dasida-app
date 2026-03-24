import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { JourneyCtaButton } from '@/features/quiz/components/journey-cta-button';

const CHARACTER_SOURCE = require('../../../assets/quiz/diagnostic-intro-character-transparent.png');
const CHARACTER_ASPECT_RATIO = 1718 / 1053;
const PAPER_TEXTURE_SOURCE = require('../../../assets/quiz/diagnostic-sketch/paper_uniform_white_transparent.png');

function HandDrawnSpeechBubble({
  height,
  isCompactLayout,
  width,
}: {
  height: number;
  isCompactLayout: boolean;
  width: number;
}) {
  return (
    <View style={[styles.bubbleShell, { width, height }]}>
      <Svg height="100%" viewBox="0 0 400 240" width="100%">
        <Path
          d="M56 28C101 9 298 6 344 24C373 38 387 73 385 114C383 154 369 177 325 188L233 197L199 230L180 195L75 189C33 184 17 162 15 120C13 80 19 44 56 28Z"
          fill="#FFFDF4"
          stroke="#1F1D18"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={4.5}
        />
        <Path
          d="M62 24C106 12 295 11 338 27C365 39 378 72 376 111C374 149 360 170 320 181L232 190L202 220L185 188L82 182C42 177 27 155 24 118C21 83 28 49 62 24Z"
          fill="none"
          opacity={0.34}
          stroke="#1F1D18"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
        />
      </Svg>

      <View style={[styles.bubbleTextWrap, isCompactLayout && styles.bubbleTextWrapCompact]}>
        <Text selectable style={[styles.bubbleLead, isCompactLayout && styles.bubbleLeadCompact]}>
          고생했어요!
        </Text>
        <Text selectable style={[styles.bubbleLine, isCompactLayout && styles.bubbleLineCompact]}>
          단순히 맞고 틀리는 것보다,
        </Text>
        <View style={styles.highlightLineWrap}>
          <View style={[styles.highlightStroke, isCompactLayout && styles.highlightStrokeCompact]} />
          <Text selectable style={[styles.bubbleLine, isCompactLayout && styles.bubbleLineCompact]}>
            {'‘왜’ 그렇게 풀었는지 분석하는 게'}
          </Text>
        </View>
        <Text selectable style={[styles.bubbleLine, isCompactLayout && styles.bubbleLineCompact]}>
          진짜 실력이 된답니다.
        </Text>
      </View>
    </View>
  );
}

export function DiagnosisIntroScreen({
  onStartDiagnosis,
}: {
  onStartDiagnosis: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompactLayout = width < 390;
  const bubbleWidth = Math.min(width - 28, 520);
  const bubbleHeight = isCompactLayout ? 212 : 238;
  const characterWidth = Math.min(width - (isCompactLayout ? 36 : 56), isCompactLayout ? 332 : 440);

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={styles.backgroundBase} />
        <Image contentFit="cover" source={PAPER_TEXTURE_SOURCE} style={styles.backgroundTexture} transition={0} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + (isCompactLayout ? 10 : 18),
            paddingBottom: insets.bottom + 26,
          },
        ]}>
        <HandDrawnSpeechBubble
          height={bubbleHeight}
          isCompactLayout={isCompactLayout}
          width={bubbleWidth}
        />

        <View style={[styles.characterBlock, { width: characterWidth }]}>
          <Image contentFit="contain" source={CHARACTER_SOURCE} style={styles.characterImage} transition={0} />
        </View>

        <View style={styles.footer}>
          <JourneyCtaButton
            label="심층 약점 분석 시작하기"
            onPress={onStartDiagnosis}
            style={styles.ctaButton}
          />

          <View style={styles.footerCopyWrap}>
            <View style={styles.footerHighlight} />
            <Text selectable style={[styles.footerText, isCompactLayout && styles.footerTextCompact]}>
              방금 푼 10문제를 바탕으로 나만의 약점을 찾아볼게요.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBFAF2',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FBFAF2',
  },
  backgroundTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: BrandSpacing.md,
    gap: BrandSpacing.md,
  },
  bubbleShell: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleTextWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 32,
    gap: 2,
  },
  bubbleTextWrapCompact: {
    paddingTop: 28,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  bubbleLead: {
    fontFamily: FontFamilies.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.8,
    color: '#1D1A15',
    textAlign: 'center',
  },
  bubbleLeadCompact: {
    fontSize: 20,
    lineHeight: 26,
  },
  bubbleLine: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.6,
    color: '#1D1A15',
    textAlign: 'center',
  },
  bubbleLineCompact: {
    fontSize: 16,
    lineHeight: 25,
  },
  highlightLineWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightStroke: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    bottom: 3,
    height: 15,
    borderRadius: 999,
    backgroundColor: 'rgba(194, 214, 146, 0.55)',
  },
  highlightStrokeCompact: {
    bottom: 2,
    height: 13,
  },
  characterBlock: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  characterImage: {
    width: '100%',
    aspectRatio: CHARACTER_ASPECT_RATIO,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    gap: BrandSpacing.sm,
    marginTop: -4,
    paddingHorizontal: BrandSpacing.lg,
    paddingBottom: BrandSpacing.sm,
  },
  ctaButton: {
    width: '100%',
    maxWidth: 360,
  },
  footerCopyWrap: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: BrandSpacing.sm,
  },
  footerHighlight: {
    position: 'absolute',
    left: '18%',
    right: '5%',
    bottom: 2,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(194, 214, 146, 0.42)',
  },
  footerText: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.6,
    color: '#201D18',
    textAlign: 'center',
  },
  footerTextCompact: {
    fontSize: 16,
    lineHeight: 24,
  },
});
