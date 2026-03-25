import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

const HERO_FRAME_SOURCE = require('./frame_note_with_stamp_transparent_cropped.png');
const HERO_FRAME_ASPECT_RATIO = 1542 / 437;

type QuizResultReportHeaderProps = {
  isCompactLayout: boolean;
  onClose: () => void;
};

export function QuizResultReportHeader({
  isCompactLayout,
  onClose,
}: QuizResultReportHeaderProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityHint="퀴즈 홈으로 이동합니다"
          accessibilityLabel="퀴즈 홈으로"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.backButton,
            isCompactLayout && styles.backButtonCompact,
            pressed && styles.backButtonPressed,
          ]}>
          <IconSymbol color="#1E1A17" name="chevron.left" size={isCompactLayout ? 18 : 20} />
        </Pressable>
      </View>

      <View style={styles.heroBlock}>
        <View
          style={[
            styles.heroFrameWrap,
            styles.heroFrameWrapRaised,
            isCompactLayout && styles.heroFrameWrapCompact,
            isCompactLayout && styles.heroFrameWrapRaisedCompact,
          ]}>
          <Image
            contentFit="contain"
            source={HERO_FRAME_SOURCE}
            style={styles.heroFrameImage}
            transition={0}
          />
          <View style={styles.heroFrameContent}>
            <Text selectable style={[styles.title, isCompactLayout && styles.titleCompact]}>
              나의 약점 분석 리포트
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8F3E8',
  },
  topRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
    zIndex: 2,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(33, 28, 24, 0.12)',
    boxShadow: '0 8px 20px rgba(38, 34, 28, 0.08)',
  },
  backButtonCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  backButtonPressed: {
    opacity: 0.84,
  },
  heroBlock: {
    width: '100%',
    alignItems: 'center',
  },
  heroFrameWrap: {
    width: '100%',
    maxWidth: 430,
    aspectRatio: HERO_FRAME_ASPECT_RATIO,
    position: 'relative',
  },
  heroFrameWrapRaised: {
    transform: [{ translateY: -24 }],
  },
  heroFrameWrapCompact: {
    maxWidth: 388,
  },
  heroFrameWrapRaisedCompact: {
    transform: [{ translateY: -18 }],
  },
  heroFrameImage: {
    width: '100%',
    height: '100%',
  },
  heroFrameContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: '13%',
    paddingRight: '17%',
    paddingBottom: '3%',
  },
  title: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.9,
    color: BrandColors.primaryDark,
    textAlign: 'center',
    transform: [{ translateX: 4 }],
  },
  titleCompact: {
    fontSize: 26,
    lineHeight: 32,
  },
});
