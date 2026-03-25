import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { FontFamilies } from '@/constants/typography';

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
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>

      <View pointerEvents="none" style={styles.content}>
        <View style={styles.labelRow}>
          <Text selectable style={styles.currentLabel}>
            {currentLabel}
          </Text>
          <Text selectable style={styles.totalLabel}>
            {` / ${totalLabel}`}
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
    color: '#293B27',
    fontVariant: ['tabular-nums'],
  },
  totalLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    color: '#778276',
    fontVariant: ['tabular-nums'],
  },
});
