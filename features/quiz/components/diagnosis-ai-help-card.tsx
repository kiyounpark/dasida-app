import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandRadius, BrandSpacing } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';

type DiagnosisAiHelpCardProps = {
  nodeKind: 'explain' | 'check';
  value: string;
  error: string;
  isLoading: boolean;
  disabled?: boolean;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onFallback: () => void;
};

function getHelperCopy(nodeKind: 'explain' | 'check') {
  if (nodeKind === 'check') {
    return '어느 부분이 막혔는지 적어주면 문제를 다시 보기 전에 짧게 설명해볼게요.';
  }

  return '이 설명에서 어디가 막히는지 적어주면 지금 단계만 더 쉽게 설명해볼게요.';
}

export function DiagnosisAiHelpCard({
  nodeKind,
  value,
  error,
  isLoading,
  disabled = false,
  onChangeText,
  onSubmit,
  onFallback,
}: DiagnosisAiHelpCardProps) {
  const isSubmitDisabled = disabled || isLoading || !value.trim();

  return (
    <View style={[styles.card, disabled ? styles.cardDisabled : null]}>
      <View style={styles.header}>
        <Text selectable style={styles.eyebrow}>
          AI 보충 설명
        </Text>
        <Text selectable style={styles.title}>
          어디가 막혔는지 적어볼래요?
        </Text>
        <Text selectable style={styles.body}>
          {getHelperCopy(nodeKind)}
        </Text>
      </View>

      <TextInput
        style={[styles.input, disabled ? styles.inputDisabled : null]}
        value={value}
        onChangeText={onChangeText}
        editable={!disabled && !isLoading}
        placeholder="예: 왜 2a로 나누는지 잘 모르겠어요"
        placeholderTextColor="#8E998E"
        multiline
        textAlignVertical="top"
      />

      {error ? (
        <Text selectable style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      <View style={styles.actionGroup}>
        <Pressable
          style={[styles.primaryButton, isSubmitDisabled ? styles.buttonDisabled : null]}
          onPress={onSubmit}
          accessibilityRole="button"
          accessibilityLabel="AI에게 물어보기"
          disabled={isSubmitDisabled}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>AI에게 물어보기</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, disabled ? styles.buttonDisabled : null]}
          onPress={onFallback}
          accessibilityRole="button"
          accessibilityLabel="그냥 더 쉬운 설명으로 볼게요"
          disabled={disabled || isLoading}>
          <Text style={styles.secondaryButtonText}>그냥 더 쉬운 설명으로 볼게요</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: DiagnosisTheme.infoBorder,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.infoBg,
    padding: BrandSpacing.md,
    gap: BrandSpacing.sm,
    boxShadow: '0 12px 24px rgba(36, 50, 41, 0.06)',
  },
  cardDisabled: {
    opacity: 0.72,
  },
  header: {
    gap: 6,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderCurve: 'continuous',
    backgroundColor: '#E2ECE0',
    color: '#4C6552',
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
    color: DiagnosisTheme.ink,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: DiagnosisTheme.inkMuted,
  },
  input: {
    minHeight: 104,
    borderWidth: 1,
    borderColor: DiagnosisTheme.choiceBorder,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.panel,
    paddingVertical: 12,
    paddingHorizontal: 13,
    fontSize: 15,
    lineHeight: 22,
    color: DiagnosisTheme.ink,
  },
  inputDisabled: {
    backgroundColor: '#F0EEE8',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#A1463D',
  },
  actionGroup: {
    gap: BrandSpacing.xs,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DiagnosisTheme.userBubble,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DiagnosisTheme.line,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.panel,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: DiagnosisTheme.ink,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
