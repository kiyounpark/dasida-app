import { Animated, StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';

import { Paper } from './paper-tokens';

interface LoadingViewProps {
  spin: Animated.AnimatedInterpolation<string>;
}

export function LoadingView({ spin }: LoadingViewProps) {
  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
        <Text style={styles.spinnerEmoji}>🌿</Text>
      </Animated.View>
      <Text style={styles.text}>복습을 펼치는 중…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  spinner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Paper.forest500,
    backgroundColor: Paper.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerEmoji: { fontSize: 22 },
  text: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: Paper.inkMute,
    textAlign: 'center',
  },
});
