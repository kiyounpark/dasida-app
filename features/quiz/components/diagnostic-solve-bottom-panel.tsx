import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DiagnosticSolveFooter } from '@/features/quiz/components/diagnostic-solve-footer';
import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

export type DiagnosticSolveBottomPanelProps = {
  canGoPrevious: boolean;
  isCompactLayout: boolean;
  isNextDisabled: boolean;
  onNextPress: () => void;
  onPreviousPress: () => void;
  onSelectChoice: (index: number) => void;
  selectedIndex: number | null;
};

export function DiagnosticSolveBottomPanel({
  canGoPrevious,
  isCompactLayout,
  isNextDisabled,
  onNextPress,
  onPreviousPress,
  onSelectChoice,
  selectedIndex,
}: DiagnosticSolveBottomPanelProps) {
  return (
    <View style={styles.panel}>
      <View accessibilityRole="radiogroup" style={styles.circleRow}>
        {[0, 1, 2, 3, 4].map((i) => {
          const isSelected = selectedIndex === i;
          return (
            <Pressable
              key={i}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${i + 1}번`}
              onPress={() => onSelectChoice(i)}
              style={[
                styles.circle,
                isCompactLayout && styles.circleCompact,
                isSelected ? styles.circleSelected : styles.circleIdle,
              ]}>
              <Text
                style={[
                  styles.circleText,
                  isCompactLayout && styles.circleTextCompact,
                  isSelected ? styles.circleTextSelected : styles.circleTextIdle,
                ]}>
                {i + 1}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <DiagnosticSolveFooter
        canGoPrevious={canGoPrevious}
        isCompactLayout={isCompactLayout}
        isNextDisabled={isNextDisabled}
        onNextPress={onNextPress}
        onPreviousPress={onPreviousPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  circleRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  circle: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompact: {
    // sizing inherited from circle via flex:1 + aspectRatio:1
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
    fontSize: 20,
    lineHeight: 26,
  },
  circleTextCompact: {
    fontSize: 18,
    lineHeight: 24,
  },
  circleTextIdle: {
    color: '#6B6560',
  },
  circleTextSelected: {
    color: '#FFFFFF',
  },
});
