import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandRadius, BrandSpacing } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';

type DiagnosisAiHelpActionsCardProps = {
  nodeKind: 'explain' | 'check';
  disabled?: boolean;
  onContinue: () => void;
  onFallback: () => void;
};

function getPrimaryLabel(nodeKind: 'explain' | 'check') {
  return nodeKind === 'check' ? '문제를 다시 볼게요' : '확인 문제로 넘어갈게요';
}

export function DiagnosisAiHelpActionsCard({
  nodeKind,
  disabled = false,
  onContinue,
  onFallback,
}: DiagnosisAiHelpActionsCardProps) {
  return (
    <View style={[styles.card, disabled ? styles.cardDisabled : null]}>
      <Text selectable style={styles.title}>
        설명을 보고 다음으로 이어가볼까요?
      </Text>

      <View style={styles.actionGroup}>
        <Pressable
          style={[styles.primaryButton, disabled ? styles.buttonDisabled : null]}
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel={getPrimaryLabel(nodeKind)}
          disabled={disabled}>
          <Text style={styles.primaryButtonText}>{getPrimaryLabel(nodeKind)}</Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, disabled ? styles.buttonDisabled : null]}
          onPress={onFallback}
          accessibilityRole="button"
          accessibilityLabel="더 쉬운 설명으로 볼게요"
          disabled={disabled}>
          <Text style={styles.secondaryButtonText}>더 쉬운 설명으로 볼게요</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: DiagnosisTheme.line,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.panel,
    padding: BrandSpacing.md,
    gap: BrandSpacing.sm,
    boxShadow: '0 10px 22px rgba(36, 50, 41, 0.05)',
  },
  cardDisabled: {
    opacity: 0.72,
  },
  title: {
    fontSize: 15,
    lineHeight: 22,
    color: DiagnosisTheme.ink,
    fontWeight: '700',
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
    backgroundColor: DiagnosisTheme.panelAlt,
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
