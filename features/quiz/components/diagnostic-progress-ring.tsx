import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { FontFamilies } from '@/constants/typography';
import { DiagnosticSketchColors } from '@/features/quiz/components/diagnostic-sketch-assets';
import {
  DIAGNOSTIC_PROGRESS_FILL_HIGHLIGHT,
  DIAGNOSTIC_PROGRESS_OUTLINE_COLOR,
  DIAGNOSTIC_PROGRESS_RING_INNER_GLOW,
} from '@/features/quiz/components/diagnostic-progress-theme';

type DiagnosticProgressRingProps = {
  color: string;
  current: number;
  size: number;
  strokeWidth: number;
  total: number;
  trackColor: string;
};

export function DiagnosticProgressRing({
  color,
  current,
  size,
  strokeWidth,
  total,
  trackColor,
}: DiagnosticProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(current / total, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const currentLabel = String(current).padStart(2, '0');
  const totalLabel = String(total).padStart(2, '0');
  const sketchStrokeWidth = Math.max(strokeWidth - 1.2, 3);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        style={styles.svg}
        viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={DIAGNOSTIC_PROGRESS_OUTLINE_COLOR}
          strokeWidth={1.4}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={sketchStrokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius - 0.8}
          stroke={DIAGNOSTIC_PROGRESS_RING_INNER_GLOW}
          strokeWidth={0.8}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={sketchStrokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={DIAGNOSTIC_PROGRESS_FILL_HIGHLIGHT}
          strokeWidth={0.9}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset + circumference * 0.012}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>

      <View pointerEvents="none" style={styles.content}>
        <View style={styles.labelRow}>
          <Text style={styles.currentLabel}>
            {currentLabel}
          </Text>
          <Text style={styles.totalLabel}>
            {`/${totalLabel}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentLabel: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 18,
    lineHeight: 22,
    color: DiagnosticSketchColors.ink,
    fontVariant: ['tabular-nums'],
  },
  totalLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 16,
    color: DiagnosticSketchColors.mutedInk,
    fontVariant: ['tabular-nums'],
  },
});
