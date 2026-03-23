import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MathText } from '@/components/math/MathText';
import { BrandColors, BrandRadius } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

type DiagnosticChoiceCardProps = {
  index: number;
  isCompactLayout: boolean;
  isSelected: boolean;
  onPress: () => void;
  text: string;
};

export function DiagnosticChoiceCard({
  index,
  isCompactLayout,
  isSelected,
  onPress,
  text,
}: DiagnosticChoiceCardProps) {
  return (
    <Pressable
      accessibilityLabel={`${index + 1}번 선택지`}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={[
        styles.card,
        isCompactLayout && styles.cardCompact,
        isSelected ? styles.cardSelected : styles.cardIdle,
      ]}>
      <View
        style={[
          styles.indexBadge,
          isCompactLayout && styles.indexBadgeCompact,
          isSelected ? styles.indexBadgeSelected : styles.indexBadgeIdle,
        ]}>
        <Text
          selectable
          style={[
            styles.indexText,
            isCompactLayout && styles.indexTextCompact,
            isSelected ? styles.indexTextSelected : styles.indexTextIdle,
          ]}>
          {index + 1}
        </Text>
      </View>

      <MathText
        selectable
        text={text}
        style={[
          styles.choiceText,
          isCompactLayout && styles.choiceTextCompact,
          isSelected && styles.choiceTextSelected,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    paddingHorizontal: 18,
    paddingVertical: 12,
    boxShadow: '0 10px 24px rgba(36, 52, 38, 0.06)',
  },
  cardCompact: {
    minHeight: 64,
    gap: 14,
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  cardIdle: {
    borderWidth: 1,
    borderColor: '#D7D4CD',
    backgroundColor: '#FFFFFF',
  },
  cardSelected: {
    borderWidth: 3,
    borderColor: BrandColors.primaryDark,
    backgroundColor: '#EEF8EE',
  },
  indexBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexBadgeCompact: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  indexBadgeIdle: {
    borderWidth: 1,
    borderColor: '#D1CEC7',
    backgroundColor: '#FFFFFF',
  },
  indexBadgeSelected: {
    backgroundColor: BrandColors.primaryDark,
  },
  indexText: {
    fontFamily: FontFamilies.bold,
    fontSize: 19,
    lineHeight: 24,
  },
  indexTextCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  indexTextIdle: {
    color: '#948E83',
  },
  indexTextSelected: {
    color: '#FFFFFF',
  },
  choiceText: {
    flex: 1,
    fontSize: 22,
    lineHeight: 28,
    color: '#1B1A17',
    textAlign: 'left',
  },
  choiceTextCompact: {
    fontSize: 20,
    lineHeight: 26,
  },
  choiceTextSelected: {
    color: '#111111',
  },
});
