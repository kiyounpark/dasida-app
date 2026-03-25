import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { DiagnosisTheme } from '@/constants/diagnosis-theme';

export function DiagnosisPromptBubble({
  isCompactLayout,
  text,
}: {
  isCompactLayout: boolean;
  text: string;
}) {
  return (
    <View style={[styles.row, isCompactLayout && styles.rowCompact]}>
      <View style={[styles.frame, isCompactLayout && styles.frameCompact]}>
        <Svg height="100%" viewBox="0 0 1600 517" width="100%">
          <Path
            d="M 250 50 H 1325 C 1450 50 1510 125 1510 258 V 270 C 1510 405 1450 480 1325 480 H 210 C 135 480 95 435 95 370 L 36 322 L 96 282 C 98 150 145 50 250 50"
            fill={DiagnosisTheme.panel}
            stroke="#171410"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={10}
          />
        </Svg>

        <View style={[styles.content, isCompactLayout && styles.contentCompact]}>
          <Text selectable style={[styles.text, isCompactLayout && styles.textCompact]}>
            {text}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    alignItems: 'flex-start',
  },
  rowCompact: {
    marginTop: 2,
  },
  frame: {
    width: '100%',
    maxWidth: '92%',
    height: 112,
    position: 'relative',
  },
  frameCompact: {
    height: 102,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingTop: 18,
    paddingBottom: 18,
    paddingLeft: 28,
    paddingRight: 28,
  },
  contentCompact: {
    paddingTop: 16,
    paddingBottom: 17,
    paddingLeft: 24,
    paddingRight: 24,
  },
  text: {
    maxWidth: '88%',
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '800',
    color: DiagnosisTheme.ink,
  },
  textCompact: {
    fontSize: 16,
    lineHeight: 23,
  },
});
