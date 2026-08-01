import { Pressable, StyleSheet, View } from 'react-native';

import { MathText } from '@/components/math/MathText';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';

import type { PhotoAction } from '../types';

type PhotoActionButtonsProps = {
  actions: PhotoAction[];
  onPress: (action: PhotoAction) => void;
};

export function PhotoActionButtons({ actions, onPress }: PhotoActionButtonsProps) {
  if (actions.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {actions.map((action, index) => {
        const isPrimary = action.kind === 'primary';
        return (
          <Pressable
            accessibilityRole="button"
            key={`${action.label}_${index}`}
            onPress={() => onPress(action)}
            style={({ pressed }) => [
              styles.button,
              isPrimary ? styles.primary : styles.ghost,
              pressed && styles.pressed,
            ]}>
            <MathText
              text={action.label}
              style={[styles.label, isPrimary ? styles.primaryLabel : styles.ghostLabel]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: BrandSpacing.xs,
  },
  button: {
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    paddingVertical: 15,
    paddingHorizontal: BrandSpacing.md,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: BrandColors.primary,
  },
  ghost: {
    backgroundColor: DiagnosisTheme.panel,
    borderWidth: 1,
    borderColor: DiagnosisTheme.choiceBorder,
  },
  pressed: {
    opacity: 0.72,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  primaryLabel: {
    color: '#F8F3E8',
    fontWeight: '700',
  },
  ghostLabel: {
    color: '#2A5C38',
    fontWeight: '600',
  },
});
