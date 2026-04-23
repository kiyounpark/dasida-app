import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

const FRAME_SOURCE = require('./frame_note_with_stamp_transparent_cropped.png');
const FRAME_ASPECT_RATIO = 1542 / 437;

type QuizResultReportHeaderProps = {
  isCompactLayout: boolean;
};

export function QuizResultReportHeader({ isCompactLayout }: QuizResultReportHeaderProps) {
  const bannerPaddingTop = isCompactLayout ? 28 : 36;
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={[styles.bannerWrap, { paddingTop: bannerPaddingTop }]}>
        <View style={styles.frameBlock}>
          <View
            style={[
              styles.frameWrap,
              isCompactLayout && styles.frameWrapCompact,
              styles.frameWrapRaised,
              isCompactLayout && styles.frameWrapRaisedCompact,
            ]}>
            <Image contentFit="contain" source={FRAME_SOURCE} style={styles.frameImage} transition={0} />
            <View style={styles.frameContent}>
              <Text
                selectable
                numberOfLines={1}
                style={[styles.title, isCompactLayout && styles.titleCompact]}>
                나의 약점 분석 리포트
              </Text>
            </View>
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
  bannerWrap: {
    paddingHorizontal: 14,
  },
  frameBlock: {
    width: '100%',
    alignItems: 'center',
  },
  frameWrap: {
    width: '100%',
    maxWidth: 430,
    aspectRatio: FRAME_ASPECT_RATIO,
    position: 'relative',
  },
  frameWrapCompact: {
    maxWidth: 390,
  },
  frameWrapRaised: {
    transform: [{ translateY: -32 }],
  },
  frameWrapRaisedCompact: {
    transform: [{ translateY: -24 }],
  },
  frameImage: {
    width: '100%',
    height: '100%',
  },
  frameContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: '13%',
    paddingRight: '17%',
    paddingBottom: '3%',
  },
  title: {
    width: '100%',
    fontFamily: FontFamilies.extrabold,
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: -0.9,
    color: BrandColors.primaryDark,
    textAlign: 'center',
    transform: [{ translateX: 4 }],
  },
  titleCompact: {
    fontSize: 22,
    lineHeight: 28,
  },
});
