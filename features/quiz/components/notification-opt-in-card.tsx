import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { FontFamilies } from '@/constants/typography';

export type NotificationOptInCardState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'dismissed';

type Props = {
  weaknessLabels: string[]; // 호환을 위해 유지. A1 카피에서는 사용 안 함.
  state: NotificationOptInCardState;
  onEnable: () => void;
  onDismiss: () => void;
};

const COLORS = {
  forestStart: '#4A6F4A',
  forestEnd: '#293B27',
  honey: '#F4B942',
  forest400: '#87B084',
  forest300: '#AECBAA',
  paper: '#FFFCF4',
  inkOnPaper: '#293B27',
  whiteFaint10: 'rgba(255,255,255,0.10)',
  whiteFaint12: 'rgba(255,255,255,0.12)',
  whiteFaint18: 'rgba(255,255,255,0.18)',
  whiteFaint25: 'rgba(255,255,255,0.25)',
  whiteFaint35: 'rgba(255,255,255,0.35)',
} as const;

export function NotificationOptInCard({ state, onEnable, onDismiss }: Props) {
  if (state === 'granted' || state === 'dismissed' || state === 'denied') {
    return null;
  }

  const isBusy = state === 'requesting';

  return (
    <View style={styles.cardOuter} accessibilityRole="alert">
      <LinearGradient
        colors={[COLORS.forestStart, COLORS.forestEnd]}
        locations={[0, 0.55]}
        start={{ x: 0.8, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}>
        <View style={styles.topRow}>
          <View style={styles.textBlock}>
            <Text style={styles.eyebrow}>망각 곡선 경고</Text>
            <Text style={styles.headline}>
              내일이면 오늘 배운 것{'\n'}
              <Text style={styles.headlineEm}>58%가 사라져요.</Text>
            </Text>
          </View>
          <ForgettingGauge />
        </View>
        <ForgettingTimeline />
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
            onPress={onEnable}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="알림 켜기">
            <Text style={styles.primaryButtonText}>알림 켜기</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={onDismiss}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="나중에 결정">
            <Text style={styles.secondaryButtonText}>나중에</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

function ForgettingGauge() {
  const size = 64;
  const strokeWidth = 5.5;
  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * 0.58;

  return (
    <View style={gaugeStyles.wrap}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.whiteFaint10}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.honey}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            fill="none"
          />
        </G>
      </Svg>
      <View style={gaugeStyles.center} pointerEvents="none">
        <Text style={gaugeStyles.percent}>58%</Text>
        <Text style={gaugeStyles.label}>망각</Text>
      </View>
    </View>
  );
}

function ForgettingTimeline() {
  return (
    <View style={timelineStyles.wrap}>
      <View style={timelineStyles.track}>
        <LinearGradient
          colors={[COLORS.forest400, COLORS.honey]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={timelineStyles.fill}
        />
      </View>
      <View style={timelineStyles.markerRow}>
        <TimelineMarker time="지금" pct="100%" pctColor={COLORS.forest400} />
        <TimelineMarker time="내일" pct="42%" pctColor={COLORS.honey} />
        <TimelineMarker time="3일 후" pct="20%" pctColor={COLORS.whiteFaint25} />
        <TimelineMarker time="1주 후" pct="10%" pctColor={COLORS.whiteFaint18} />
      </View>
      <Text style={timelineStyles.source}>에빙하우스 망각 곡선</Text>
    </View>
  );
}

function TimelineMarker({
  time,
  pct,
  pctColor,
}: {
  time: string;
  pct: string;
  pctColor: string;
}) {
  return (
    <View style={timelineStyles.marker}>
      <Text style={[timelineStyles.markerPct, { color: pctColor }]}>{pct}</Text>
      <Text style={timelineStyles.markerTime}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 14,
  },
  gradient: {
    paddingTop: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    gap: 14,
  },
  textBlock: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    fontFamily: FontFamilies.bold,
    fontSize: 10.5,
    color: COLORS.forest300,
    letterSpacing: 0.1 * 10.5,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: FontFamilies.bold,
    fontSize: 19,
    lineHeight: 25.65,
    color: '#FFFCF4',
    letterSpacing: -0.015 * 19,
  },
  headlineEm: {
    color: COLORS.honey,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    color: COLORS.inkOnPaper,
    letterSpacing: -0.01 * 15,
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.whiteFaint12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: COLORS.whiteFaint35,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

const gaugeStyles = StyleSheet.create({
  wrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: COLORS.honey,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontFamily: FontFamilies.medium,
    fontSize: 8.5,
    color: COLORS.forest300,
  },
});

const timelineStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 8,
  },
  track: {
    height: 3,
    backgroundColor: COLORS.whiteFaint10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    width: '28%',
    height: '100%',
    borderRadius: 999,
  },
  markerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  marker: {
    alignItems: 'flex-start',
    gap: 2,
  },
  markerPct: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  markerTime: {
    fontFamily: FontFamilies.medium,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.45)',
  },
  source: {
    fontFamily: FontFamilies.regular,
    fontSize: 10,
    color: COLORS.whiteFaint25,
    textAlign: 'right',
  },
});
