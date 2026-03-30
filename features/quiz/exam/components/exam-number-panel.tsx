import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

type ExamNumberPanelProps = {
  selectedAnswer: number | null;
  onSelect: (n: number) => void;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  isLast: boolean;
  isCompactLayout: boolean;
};

export function ExamNumberPanel({
  selectedAnswer,
  onSelect,
  onPrev,
  onNext,
  canGoPrev,
  isLast,
  isCompactLayout,
}: ExamNumberPanelProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.choiceRow}>
        {[1, 2, 3, 4, 5].map((n) => {
          const isSelected = selectedAnswer === n;
          return (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${n}번`}
              onPress={() => onSelect(n)}
              style={[styles.circle, isSelected ? styles.circleSelected : styles.circleIdle]}>
              <Text
                selectable
                style={[styles.circleText, isSelected ? styles.circleTextSelected : styles.circleTextIdle]}>
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          disabled={!canGoPrev}
          onPress={onPrev}
          style={[
            styles.button,
            styles.secondaryButton,
            isCompactLayout && styles.buttonCompact,
            !canGoPrev && styles.secondaryButtonDisabled,
          ]}>
          <Text
            selectable
            style={[
              styles.secondaryLabel,
              isCompactLayout && styles.labelCompact,
              !canGoPrev && styles.secondaryLabelDisabled,
            ]}>
            이전
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onNext}
          style={[styles.button, styles.primaryButton, isCompactLayout && styles.buttonCompact]}>
          <Text selectable style={[styles.primaryLabel, isCompactLayout && styles.labelCompact]}>
            {isLast ? '채점하기' : '다음'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const CIRCLE_SIZE = 56;

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: 18,
    paddingTop: 16,
    gap: 16,
  },
  choiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  circleIdle: {
    borderWidth: 1.5,
    borderColor: '#D7D4CD',
    backgroundColor: '#FFFFFF',
  },
  circleSelected: {
    backgroundColor: BrandColors.primaryDark,
  },
  circleText: {
    fontFamily: FontFamilies.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  circleTextIdle: {
    color: '#6B6560',
  },
  circleTextSelected: {
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 4,
  },
  button: {
    flex: 1,
    minHeight: 60,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: {
    minHeight: 56,
    borderRadius: 16,
  },
  primaryButton: {
    backgroundColor: BrandColors.primaryDark,
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
    fontSize: 18,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  secondaryLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    lineHeight: 24,
    color: '#8E8A81',
  },
  secondaryLabelDisabled: {
    color: '#B9B4AA',
  },
  labelCompact: {
    fontSize: 17,
    lineHeight: 22,
  },
});
