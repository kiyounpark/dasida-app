import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';

type BrandButtonVariant = 'primary' | 'success' | 'danger' | 'neutral';

export type BrandButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: BrandButtonVariant;
  style?: StyleProp<ViewStyle>;
};

const variantStyles: Record<BrandButtonVariant, { backgroundColor: string; pressedColor: string }> = {
  primary: { backgroundColor: BrandColors.primarySoft, pressedColor: BrandColors.primary },
  success: { backgroundColor: BrandColors.success, pressedColor: '#257D37' },
  danger: { backgroundColor: BrandColors.danger, pressedColor: '#B22D2D' },
  neutral: { backgroundColor: '#6E7C70', pressedColor: '#5A675C' },
};

export function BrandButton({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  style,
}: BrandButtonProps) {
  const colors = variantStyles[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? colors.pressedColor : colors.backgroundColor },
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={styles.label}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    borderRadius: BrandRadius.sm,
    paddingVertical: BrandSpacing.md,
    paddingHorizontal: BrandSpacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    backgroundColor: BrandColors.disabled,
  },
});
