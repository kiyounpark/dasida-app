import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

const EMPTY_DOT_SOURCE = require('../../../assets/quiz/diagnostic-sketch/diagnosis-progress-dot-empty.png');
const ACTIVE_DOT_SOURCE = require('../../../assets/quiz/diagnostic-sketch/diagnosis-progress-dot-active.png');

export type DiagnosisProgressDotItem = {
  accessibilityHint: string;
  accessibilityLabel: string;
  isActive: boolean;
  isCompleted: boolean;
  key: string;
  onPress: () => void;
};

export function DiagnosisProgressDots({
  isCompactLayout,
  items,
}: {
  isCompactLayout: boolean;
  items: DiagnosisProgressDotItem[];
}) {
  return (
    <View accessible accessibilityRole="tablist" style={styles.list}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          style={styles.hitArea}
          onPress={item.onPress}
          accessibilityRole="tab"
          accessibilityState={{ selected: item.isActive }}
          accessibilityLabel={item.accessibilityLabel}
          accessibilityHint={item.accessibilityHint}>
          <View
            style={[
              styles.dotShell,
              isCompactLayout ? styles.dotShellCompact : styles.dotShellRegular,
              item.isActive ? styles.dotShellActive : null,
            ]}>
            <Image
              contentFit="contain"
              source={item.isActive ? ACTIVE_DOT_SOURCE : EMPTY_DOT_SOURCE}
              style={styles.dotImage}
              transition={0}
            />
            {item.isCompleted && !item.isActive ? <View style={styles.completedCenterFill} /> : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  hitArea: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotShell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotShellRegular: {
    width: 18,
    height: 18,
  },
  dotShellCompact: {
    width: 16,
    height: 16,
  },
  dotShellActive: {
    transform: [{ scale: 1.08 }],
  },
  dotImage: {
    width: '100%',
    height: '100%',
  },
  completedCenterFill: {
    position: 'absolute',
    width: '42%',
    height: '42%',
    borderRadius: 999,
    backgroundColor: '#50684A',
  },
});
