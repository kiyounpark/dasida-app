import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

type ExamShortAnswerPanelProps = {
  value: string;
  onChangeText: (text: string) => void;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  isLast: boolean;
  isCompactLayout: boolean;
};

export function ExamShortAnswerPanel({
  value,
  onChangeText,
  onPrev,
  onNext,
  canGoPrev,
  isLast,
  isCompactLayout,
}: ExamShortAnswerPanelProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.inputWrap}>
        <Text selectable style={styles.inputLabel}>
          정답 입력
        </Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => {
            // 숫자만 허용
            const cleaned = text.replace(/[^0-9]/g, '');
            onChangeText(cleaned);
          }}
          keyboardType="number-pad"
          placeholder="숫자를 입력하세요"
          placeholderTextColor="#AEAAA2"
          maxLength={6}
          returnKeyType="done"
          selectTextOnFocus
        />
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

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: 18,
    paddingTop: 16,
    gap: 16,
  },
  inputWrap: {
    gap: 8,
  },
  inputLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
    color: '#8E8A81',
    letterSpacing: 0.2,
  },
  input: {
    height: 56,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: BrandColors.primaryDark,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontFamily: FontFamilies.bold,
    fontSize: 24,
    lineHeight: 30,
    color: '#1B1A17',
    textAlign: 'center',
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
