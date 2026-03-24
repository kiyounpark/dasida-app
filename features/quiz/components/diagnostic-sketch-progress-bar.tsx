import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import {
  DIAGNOSTIC_PROGRESS_BAR_HEIGHT,
  DIAGNOSTIC_PROGRESS_BAR_STROKE,
  DIAGNOSTIC_PROGRESS_FILL_COLOR,
  DIAGNOSTIC_PROGRESS_FILL_HIGHLIGHT,
  DIAGNOSTIC_PROGRESS_HIGHLIGHT_OPACITY,
  DIAGNOSTIC_PROGRESS_OUTLINE_COLOR,
  DIAGNOSTIC_PROGRESS_SURFACE_HIGHLIGHT,
  DIAGNOSTIC_PROGRESS_TRACK_COLOR,
} from '@/features/quiz/components/diagnostic-progress-theme';

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
  const barHeight = isCompactLayout ? DIAGNOSTIC_PROGRESS_BAR_HEIGHT.compact : DIAGNOSTIC_PROGRESS_BAR_HEIGHT.regular;
  const trackStroke = isCompactLayout ? DIAGNOSTIC_PROGRESS_BAR_STROKE.compact : DIAGNOSTIC_PROGRESS_BAR_STROKE.regular;
  const innerX = 2;
  const innerWidth = 96;
  const innerY = (12 - trackStroke) / 2;
  const outlineY = innerY - 1.2;
  const outlineHeight = trackStroke + 2.4;
  const progressWidth = innerWidth * progress;
  const highlightHeight = Math.max(1.7, trackStroke * 0.42);
  const highlightY = innerY + 0.6;
  const highlightWidth = progress > 0
    ? (isComplete ? Math.max(0, progressWidth - 0.7) : Math.max(0, progressWidth - 1.1))
    : 0;

  return (
    <View style={[styles.wrap, { height: barHeight }]}>
      <Svg
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        viewBox="0 0 100 12">
        <Rect
          x="0.8"
          y={outlineY}
          width="98.4"
          height={outlineHeight}
          rx={outlineHeight / 2}
          fill="none"
          stroke={DIAGNOSTIC_PROGRESS_OUTLINE_COLOR}
          strokeWidth="1.1"
        />
        <Rect
          x={innerX}
          y={innerY}
          width={innerWidth}
          height={trackStroke}
          rx={trackStroke / 2}
          fill={DIAGNOSTIC_PROGRESS_TRACK_COLOR}
        />
        <Path
          d={`M ${innerX + 1.2} ${innerY + 1.05} C 18 1.9, 36 2.25, 55 2.05 S 77 1.95, ${innerX + innerWidth - 1.2} ${innerY + 1.05}`}
          stroke={DIAGNOSTIC_PROGRESS_SURFACE_HIGHLIGHT}
          strokeWidth="0.55"
          fill="none"
          strokeLinecap="round"
        />
        {progress > 0 ? (
          <Rect
            x={innerX}
            y={innerY}
            width={progressWidth}
            height={trackStroke}
            rx={trackStroke / 2}
            fill={DIAGNOSTIC_PROGRESS_FILL_COLOR}
          />
        ) : null}
        {highlightWidth > 0 ? (
          <Rect
            x={innerX + 0.55}
            y={highlightY}
            width={highlightWidth}
            height={highlightHeight}
            rx={highlightHeight / 2}
            fill={DIAGNOSTIC_PROGRESS_FILL_HIGHLIGHT}
            opacity={DIAGNOSTIC_PROGRESS_HIGHLIGHT_OPACITY}
          />
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
});
