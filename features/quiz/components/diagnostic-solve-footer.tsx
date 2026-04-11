import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

type DiagnosticSolveFooterProps = {
  canGoPrevious: boolean;
  isCompactLayout: boolean;
  isNextDisabled: boolean;
  onNextPress: () => void;
  onPreviousPress: () => void;
};

export function DiagnosticSolveFooter({
  canGoPrevious,
  isCompactLayout,
  isNextDisabled,
  onNextPress,
  onPreviousPress,
}: DiagnosticSolveFooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Pressable
        accessibilityRole="button"
        disabled={!canGoPrevious}
        onPress={onPreviousPress}
        style={[
          styles.button,
          styles.secondaryButton,
          isCompactLayout && styles.buttonCompact,
          !canGoPrevious && styles.secondaryButtonDisabled,
        ]}>
        <Text
          selectable
          style={[
            styles.secondaryLabel,
            isCompactLayout && styles.labelCompact,
            !canGoPrevious && styles.secondaryLabelDisabled,
          ]}>
          이전
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={isNextDisabled}
        onPress={onNextPress}
        style={[
          styles.button,
          styles.primaryButton,
          isCompactLayout && styles.buttonCompact,
          isNextDisabled && styles.primaryButtonDisabled,
        ]}>
        <Text
          selectable
          style={[
            styles.primaryLabel,
            isCompactLayout && styles.labelCompact,
            isNextDisabled && styles.primaryLabelDisabled,
          ]}>
          다음
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: {
    minHeight: 40,
    borderRadius: 16,
  },
  primaryButton: {
    backgroundColor: BrandColors.primaryDark,
  },
  primaryButtonDisabled: {
    backgroundColor: '#B9C2B4',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: '#CAC7BF',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonDisabled: {
    borderColor: '#DDD9D1',
    backgroundColor: '#FBFAF7',
  },
  primaryLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 17,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  primaryLabelDisabled: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  secondaryLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 17,
    lineHeight: 22,
    color: '#8E8A81',
  },
  secondaryLabelDisabled: {
    color: '#B9B4AA',
  },
  labelCompact: {
    fontSize: 15,
    lineHeight: 20,
  },
});
