import { Pressable, StyleSheet, View } from 'react-native';

import { MathText } from '@/components/math/MathText';
import { FontFamilies } from '@/constants/typography';

import { PhotoTheme } from '../theme';
import type { PhotoAction } from '../types';

type PhotoActionButtonsProps = {
  actions: PhotoAction[];
  onPress: (action: PhotoAction) => void;
};

/** web-proto/index.html의 `.actions`와 같은 값. 글자는 가운데가 아니라 **왼쪽** 정렬이다. */
export function PhotoActionButtons({ actions, onPress }: PhotoActionButtonsProps) {
  if (actions.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {actions.map((action, index) => (
        <Pressable
          accessibilityRole="button"
          key={`${action.label}_${index}`}
          onPress={() => onPress(action)}
          style={({ pressed }) => [
            styles.button,
            action.kind === 'primary' && styles.primary,
            action.kind === 'ghost' && styles.ghost,
            pressed && styles.pressed,
          ]}>
          <MathText
            style={[
              styles.label,
              action.kind === 'primary' && styles.primaryLabel,
              action.kind === 'ghost' && styles.ghostLabel,
            ]}
            text={action.label}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    paddingTop: 6,
  },
  button: {
    borderWidth: 1.5,
    borderColor: PhotoTheme.greenSoft,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  primary: {
    backgroundColor: PhotoTheme.green,
    borderColor: PhotoTheme.green,
  },
  ghost: {
    borderColor: PhotoTheme.line,
  },
  pressed: {
    opacity: 0.72,
  },
  label: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    lineHeight: 21,
    color: PhotoTheme.green,
    textAlign: 'left',
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  ghostLabel: {
    fontFamily: FontFamilies.medium,
    color: PhotoTheme.muted,
  },
});
