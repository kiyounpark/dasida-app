import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

const HERO_FRAME_SOURCE = require('./frame_note_with_stamp_transparent_cropped.png');
const HERO_FRAME_ASPECT_RATIO = 1542 / 437;

type PosterTitleBannerProps = {
  isCompactLayout: boolean;
  isTablet?: boolean;
  title: string;
};

export function PosterTitleBanner({
  isCompactLayout,
  isTablet = false,
  title,
}: PosterTitleBannerProps) {
  return (
    <View style={styles.heroBlock}>
      <View
        style={[
          styles.heroFrameWrap,
          styles.heroFrameWrapRaised,
          isCompactLayout && styles.heroFrameWrapCompact,
          isCompactLayout && styles.heroFrameWrapRaisedCompact,
          isTablet && styles.heroFrameWrapTablet,
          isTablet && styles.heroFrameWrapRaisedTablet,
        ]}>
        <Image contentFit="contain" source={HERO_FRAME_SOURCE} style={styles.heroFrameImage} transition={0} />
        <View style={styles.heroFrameContent}>
          <Text
            selectable
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={[styles.heroTitle, isCompactLayout && styles.heroTitleCompact, isTablet && styles.heroTitleTablet]}>
            {title}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    transform: [{ translateY: -32 }],
  },
  heroFrameWrapCompact: {
    maxWidth: 390,
  },
  heroFrameWrapRaisedCompact: {
    transform: [{ translateY: -24 }],
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
  heroTitle: {
    width: '100%',
    fontFamily: FontFamilies.extrabold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.9,
    color: BrandColors.primaryDark,
    textAlign: 'center',
    transform: [{ translateX: 4 }],
  },
  heroTitleCompact: {
    fontSize: 28,
    lineHeight: 34,
  },
  heroFrameWrapTablet: {
    maxWidth: 700,
  },
  heroFrameWrapRaisedTablet: {
    transform: [{ translateY: -40 }],
  },
  heroTitleTablet: {
    fontSize: 38,
    lineHeight: 46,
  },
});
