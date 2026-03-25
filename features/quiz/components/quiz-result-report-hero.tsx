import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';

const REPORT_TEACHER_CHARACTER_SOURCE = require('../../../assets/quiz/result-report/report-teacher-character.png');

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
        <View style={[styles.capBoard, isCompactLayout && styles.capBoardCompact]} />
        <View style={[styles.capBase, isCompactLayout && styles.capBaseCompact]} />
        <View style={[styles.capTassel, isCompactLayout && styles.capTasselCompact]} />
        <View style={[styles.capTasselTip, isCompactLayout && styles.capTasselTipCompact]} />

        <Image
          contentFit="contain"
          source={REPORT_TEACHER_CHARACTER_SOURCE}
          style={[styles.characterImage, isCompactLayout && styles.characterImageCompact]}
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
    width: 118,
    height: 150,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  characterWrapCompact: {
    width: 96,
    height: 126,
  },
  characterImage: {
    width: '100%',
    height: 112,
  },
  characterImageCompact: {
    height: 92,
  },
  capBoard: {
    position: 'absolute',
    top: 12,
    width: 64,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#2A2521',
    transform: [{ rotate: '-10deg' }],
    boxShadow: '0 5px 12px rgba(20, 18, 16, 0.12)',
  },
  capBoardCompact: {
    top: 10,
    width: 54,
    height: 16,
  },
  capBase: {
    position: 'absolute',
    top: 22,
    width: 28,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#34302B',
  },
  capBaseCompact: {
    top: 19,
    width: 24,
    height: 12,
  },
  capTassel: {
    position: 'absolute',
    top: 24,
    right: 17,
    width: 2,
    height: 22,
    backgroundColor: '#1E1A17',
    transform: [{ rotate: '12deg' }],
  },
  capTasselCompact: {
    right: 14,
    height: 18,
  },
  capTasselTip: {
    position: 'absolute',
    top: 42,
    right: 11,
    width: 10,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#1E1A17',
  },
  capTasselTipCompact: {
    top: 37,
    right: 9,
    width: 8,
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
    paddingHorizontal: 26,
    paddingVertical: 22,
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
    fontSize: 19,
    lineHeight: 30,
    color: '#181512',
    textAlign: 'center',
  },
  bubbleTextCompact: {
    fontSize: 16,
    lineHeight: 24,
  },
});
