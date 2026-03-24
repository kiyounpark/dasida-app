import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import {
  DIAGNOSTIC_SKETCH_BUTTON_ASPECT_RATIO,
  DIAGNOSTIC_SKETCH_BUTTON_SOURCE,
  DiagnosticSketchColors,
} from '@/features/quiz/components/diagnostic-sketch-assets';

export type DiagnosticSketchNavButtonsProps = {
  canGoPrevious: boolean;
  isCompactLayout: boolean;
  isNextDisabled: boolean;
  onNextPress: () => void;
  onPreviousPress: () => void;
};

function SketchNavButton({
  disabled,
  isCompactLayout,
  label,
  onPress,
}: {
  disabled: boolean;
  isCompactLayout: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isCompactLayout && styles.buttonCompact,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}>
      <View pointerEvents="none" style={styles.background}>
        <Image
          contentFit="contain"
          source={DIAGNOSTIC_SKETCH_BUTTON_SOURCE}
          style={styles.backgroundImage}
          transition={0}
        />
      </View>

      <Text style={[styles.label, isCompactLayout && styles.labelCompact]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function DiagnosticSketchNavButtons({
  canGoPrevious,
  isCompactLayout,
  isNextDisabled,
  onNextPress,
  onPreviousPress,
}: DiagnosticSketchNavButtonsProps) {
  return (
    <View style={[styles.row, isCompactLayout && styles.rowCompact]}>
      <SketchNavButton
        disabled={!canGoPrevious}
        isCompactLayout={isCompactLayout}
        label="이전"
        onPress={onPreviousPress}
      />
      <SketchNavButton
        disabled={isNextDisabled}
        isCompactLayout={isCompactLayout}
        label="다음"
        onPress={onNextPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
  },
  rowCompact: {
    gap: 14,
  },
  button: {
    flex: 1,
    maxWidth: 220,
    aspectRatio: DIAGNOSTIC_SKETCH_BUTTON_ASPECT_RATIO,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    position: 'relative',
  },
  buttonCompact: {
    paddingHorizontal: 22,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.42,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  label: {
    fontFamily: FontFamilies.bold,
    fontSize: 22,
    lineHeight: 28,
    color: DiagnosticSketchColors.ink,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  labelCompact: {
    fontSize: 19,
    lineHeight: 24,
  },
});
