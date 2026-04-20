import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandColors, BrandSpacing } from '@/constants/brand';

export type GraduateFloatingBarProps = {
  disabled: boolean;
  isGraduating: boolean;
  onPress: () => void;
};

export function GraduateFloatingBar({ disabled, isGraduating, onPress }: GraduateFloatingBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) + BrandSpacing.xs }]}>
      <BrandButton
        disabled={disabled}
        onPress={onPress}
        title={isGraduating ? '저장 중...' : '약점 연습 완료하기'}
        variant="neutral"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: BrandSpacing.xs,
    backgroundColor: BrandColors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(41, 59, 39, 0.08)',
  },
});
