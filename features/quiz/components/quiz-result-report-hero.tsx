import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';

const REPORT_TEACHER_CHARACTER_SOURCE = require('../../../assets/quiz/result-report/Gemini_Generated_Image_84kar584kar584ka.png');

type QuizResultReportHeroProps = {
  isCompactLayout: boolean;
  pointCount: number;
};

export function QuizResultReportHero({
  isCompactLayout,
  pointCount,
}: QuizResultReportHeroProps) {
  const reportMessage =
    pointCount <= 1
      ? '오늘 푼 10문제를 분석해 보니,\n이 1가지 포인트를 보완하면\n실력이 쑥쑥 늘 거예요!'
      : `오늘 푼 10문제를 분석해 보니,\n이 ${pointCount}가지 포인트를 보완하면\n실력이 쑥쑥 늘 거예요!`;

  return (
    <View style={[styles.row, isCompactLayout && styles.rowCompact]}>
      <View style={[styles.characterWrap, isCompactLayout && styles.characterWrapCompact]}>
        <Image
          contentFit="contain"
          source={REPORT_TEACHER_CHARACTER_SOURCE}
          style={styles.characterImage}
          transition={0}
        />
      </View>

      <View style={styles.bubbleOuter}>
        <View style={[styles.bubbleTailBorder, isCompactLayout && styles.bubbleTailBorderCompact]} />
        <View style={[styles.bubbleTailFill, isCompactLayout && styles.bubbleTailFillCompact]} />
        <View style={[styles.bubble, isCompactLayout && styles.bubbleCompact]}>
          <Text selectable style={[styles.bubbleText, isCompactLayout && styles.bubbleTextCompact]}>
            {reportMessage}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  rowCompact: {
    gap: 10,
  },
  characterWrap: {
    width: 100,
    height: 136,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  characterWrapCompact: {
    width: 84,
    height: 112,
  },
  characterImage: {
    width: '100%',
    height: '100%',
  },
  bubbleOuter: {
    flex: 1,
    position: 'relative',
    minWidth: 0,
  },
  bubbleTailBorder: {
    position: 'absolute',
    left: -7,
    top: '46%',
    width: 22,
    height: 22,
    backgroundColor: '#FDFBF6',
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#241F1B',
    transform: [{ rotate: '45deg' }],
    zIndex: 1,
  },
  bubbleTailBorderCompact: {
    left: -6,
    width: 20,
    height: 20,
  },
  bubbleTailFill: {
    position: 'absolute',
    left: -1,
    top: '46%',
    width: 18,
    height: 18,
    backgroundColor: '#FDFBF6',
    transform: [{ rotate: '45deg' }],
    zIndex: 2,
  },
  bubbleTailFillCompact: {
    width: 16,
    height: 16,
  },
  bubble: {
    borderWidth: 2,
    borderColor: '#241F1B',
    borderRadius: 40,
    borderCurve: 'continuous',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#FDFBF6',
    boxShadow: '0 10px 24px rgba(30, 26, 22, 0.06)',
  },
  bubbleCompact: {
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  bubbleText: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 24,
    color: '#181512',
    textAlign: 'center',
  },
  bubbleTextCompact: {
    fontSize: 16,
    lineHeight: 24,
  },
});
