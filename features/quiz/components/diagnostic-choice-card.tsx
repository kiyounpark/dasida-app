import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MathText } from '@/components/math/MathText';
import { FontFamilies } from '@/constants/typography';
import {
  DIAGNOSTIC_SKETCH_CHOICE_IDLE_SOURCE,
  DIAGNOSTIC_SKETCH_CHOICE_SELECTED_SOURCE,
  DiagnosticSketchColors,
} from '@/features/quiz/components/diagnostic-sketch-assets';

type DiagnosticChoiceCardProps = {
  index: number;
  isFullWidth?: boolean;
  isCompactLayout: boolean;
  isSelected: boolean;
  onPress: () => void;
  text: string;
};

export function DiagnosticChoiceCard({
  index,
  isFullWidth = false,
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
      style={({ pressed }) => [
        styles.card,
        isFullWidth ? styles.cardFullWidth : styles.cardHalfWidth,
        isCompactLayout && styles.cardCompact,
        pressed ? styles.cardPressed : null,
      ]}>
      <View pointerEvents="none" style={styles.background}>
        <Image
          contentFit="fill"
          source={isSelected ? DIAGNOSTIC_SKETCH_CHOICE_SELECTED_SOURCE : DIAGNOSTIC_SKETCH_CHOICE_IDLE_SOURCE}
          style={styles.backgroundImage}
          transition={0}
        />
      </View>

      <View style={styles.content}>
        <Text style={[styles.indexText, isCompactLayout && styles.indexTextCompact]}>
          {index + 1}
        </Text>

        <View style={styles.textWrap}>
          <MathText text={text} style={[styles.choiceText, isCompactLayout && styles.choiceTextCompact]} />
        </View>

        <View style={styles.trailingSpacer} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 76,
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  cardCompact: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cardHalfWidth: {
    width: '48.4%',
  },
  cardFullWidth: {
    width: '100%',
  },
  cardPressed: {
    opacity: 0.9,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  indexText: {
    fontFamily: FontFamilies.bold,
    fontSize: 21,
    lineHeight: 26,
    color: DiagnosticSketchColors.ink,
    textAlign: 'center',
    width: 22,
  },
  indexTextCompact: {
    fontSize: 18,
    lineHeight: 22,
    width: 18,
  },
  textWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  trailingSpacer: {
    width: 22,
  },
  choiceText: {
    fontFamily: FontFamilies.medium,
    fontSize: 18,
    lineHeight: 24,
    color: DiagnosticSketchColors.ink,
    textAlign: 'center',
  },
  choiceTextCompact: {
    fontSize: 16,
    lineHeight: 20,
  },
});
