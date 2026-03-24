import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { DiagnosticSketchColors } from '@/features/quiz/components/diagnostic-sketch-assets';

export type DiagnosticSketchProgressBarProps = {
  current: number;
  isCompactLayout: boolean;
  progressPercent: `${number}%`;
  total: number;
};

export function DiagnosticSketchProgressBar({
  current,
  isCompactLayout,
  progressPercent,
  total,
}: DiagnosticSketchProgressBarProps) {
  const numericPercent = Number.parseFloat(progressPercent.replace('%', ''));
  const progress = Number.isFinite(numericPercent) ? Math.min(Math.max(numericPercent, 0), 100) / 100 : 0;
  const isComplete = total > 0 && current >= total;
  const accentWidth = progress > 0 ? (isComplete ? 0.045 : Math.max(0.04, Math.min(0.08, 1 / Math.max(total, 1)))) : 0;
  const accentStart = Math.max(0.015, progress - accentWidth);
  const sketchInset = isCompactLayout ? 0.8 : 0.6;

  return (
    <View style={[styles.wrap, isCompactLayout && styles.wrapCompact]}>
      <Svg
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        viewBox="0 0 100 10">
        <Rect
          x="0.8"
          y="1.7"
          width="98.6"
          height="5.6"
          rx="2.8"
          fill={DiagnosticSketchColors.track}
          stroke={DiagnosticSketchColors.inkSoft}
          strokeWidth="0.7"
        />
        <Rect
          x="1.4"
          y="2.2"
          width={97.2 * progress}
          height="4.6"
          rx="2.3"
          fill={DiagnosticSketchColors.green}
        />
        {progress > 0 ? (
          <Rect
            x={1.4 + 97.2 * accentStart}
            y="2.15"
            width={Math.min(97.2 * accentWidth, 97.2 * progress)}
            height="4.7"
            rx="2.35"
            fill={DiagnosticSketchColors.inkSoft}
          />
        ) : null}
        <Path
          d={`M 1.8 ${8.2 - sketchInset} C 13 7.6, 28 8.7, 43 8.1 S 77 7.2, 98.1 ${7.9 - sketchInset}`}
          stroke="rgba(55, 44, 35, 0.28)"
          strokeWidth="0.45"
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={`M 2.4 ${2.35 + sketchInset} C 18 1.6, 35 2.8, 56 2.2 S 79 1.4, 97.5 ${2.5 + sketchInset}`}
          stroke="rgba(255, 255, 255, 0.55)"
          strokeWidth="0.34"
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: 18,
  },
  wrapCompact: {
    height: 16,
  },
});
