import { useEffect, useState } from 'react';
import type { DiagnosisFlowNode } from '@/data/detailedDiagnosisFlows';
import { BrandRadius, BrandSpacing } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type DiagnosisFlowCardProps = {
  node: DiagnosisFlowNode;
  methodLabel: string;
  disabled?: boolean;
  variant?: 'explain' | 'check' | 'final' | 'choice';
  onChoicePress: (optionId: string) => void;
  onExplainContinue: () => void;
  onExplainDontKnow: () => void;
  onCheckPress: (optionId: string) => void;
  onCheckDontKnow: () => void;
  onFinalConfirm: () => void;
};

export function DiagnosisFlowCard({
  node,
  methodLabel,
  disabled = false,
  variant,
  onChoicePress,
  onExplainContinue,
  onExplainDontKnow,
  onCheckPress,
  onCheckDontKnow,
  onFinalConfirm,
}: DiagnosisFlowCardProps) {
  const resolvedVariant = variant ?? node.kind;

  // final 노드: 이전 버튼의 터치 이벤트가 새 버튼에 흡수되는 현상 방지
  const [isFinalReady, setIsFinalReady] = useState(node.kind !== 'final');
  useEffect(() => {
    if (node.kind !== 'final') return;
    const t = setTimeout(() => setIsFinalReady(true), 350);
    return () => clearTimeout(t);
  }, [node.kind]);

  return (
    <View
      style={[
        styles.card,
        resolvedVariant === 'choice' ? styles.choiceCard : null,
        resolvedVariant === 'explain' ? styles.explainCard : null,
        resolvedVariant === 'check' ? styles.checkCard : null,
        resolvedVariant === 'final' ? styles.finalCard : null,
        disabled ? styles.cardDisabled : null,
      ]}>
      <View style={styles.header}>
        <Text selectable style={styles.eyebrow}>
          {methodLabel}
        </Text>
        <Text selectable style={styles.title}>
          {node.title}
        </Text>
      </View>

      {'body' in node && node.body ? (
        <Text selectable style={styles.body}>
          {node.body}
        </Text>
      ) : null}

      {node.kind === 'choice' && (
        <View style={styles.optionGroup}>
          {node.options.map((option) => (
            <Pressable
              key={option.id}
              style={[styles.optionButton, disabled ? styles.optionButtonDisabled : null]}
              onPress={() => onChoicePress(option.id)}
              accessibilityRole="button"
              accessibilityLabel={option.text}
              disabled={disabled}>
              <Text selectable style={styles.optionText}>
                {option.text}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {node.kind === 'explain' && (
        <View style={styles.actionGroup}>
          <Pressable
            style={[styles.primaryButton, disabled ? styles.buttonDisabled : null]}
            onPress={onExplainContinue}
            accessibilityRole="button"
            accessibilityLabel={node.primaryLabel}
            disabled={disabled}>
            <Text style={styles.primaryButtonText}>
              {node.primaryLabel}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, disabled ? styles.buttonDisabled : null]}
            onPress={onExplainDontKnow}
            accessibilityRole="button"
            accessibilityLabel={node.secondaryLabel}
            disabled={disabled}>
            <Text style={styles.secondaryButtonText}>
              {node.secondaryLabel}
            </Text>
          </Pressable>
        </View>
      )}

      {node.kind === 'check' && (
        <>
          {node.prompt ? (
            <Text selectable style={styles.prompt}>
              {node.prompt}
            </Text>
          ) : null}
          <View style={styles.optionGroup}>
            {node.options.map((option) => (
              <Pressable
                key={option.id}
                style={[styles.optionButton, disabled ? styles.optionButtonDisabled : null]}
                onPress={() => onCheckPress(option.id)}
                accessibilityRole="button"
                accessibilityLabel={option.text}
                disabled={disabled}>
                <Text selectable style={styles.optionText}>
                  {option.text}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[styles.secondaryButton, disabled ? styles.buttonDisabled : null]}
            onPress={onCheckDontKnow}
            accessibilityRole="button"
            accessibilityLabel="모르겠습니다"
            disabled={disabled}>
            <Text style={styles.secondaryButtonText}>모르겠습니다</Text>
          </Pressable>
        </>
      )}

      {node.kind === 'final' && (
        <View style={styles.actionGroup}>
          <Pressable
            style={[styles.primaryButton, (disabled || !isFinalReady) ? styles.buttonDisabled : null]}
            onPress={onFinalConfirm}
            accessibilityRole="button"
            accessibilityLabel={node.ctaLabel}
            disabled={disabled || !isFinalReady}>
            <Text style={styles.primaryButtonText}>
              {node.ctaLabel}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    padding: BrandSpacing.md,
    gap: BrandSpacing.sm,
    boxShadow: '0 12px 28px rgba(36, 50, 41, 0.07)',
  },
  choiceCard: {
    backgroundColor: DiagnosisTheme.panel,
    borderColor: DiagnosisTheme.line,
  },
  explainCard: {
    backgroundColor: DiagnosisTheme.panelAlt,
    borderColor: DiagnosisTheme.line,
  },
  checkCard: {
    backgroundColor: DiagnosisTheme.infoBg,
    borderColor: DiagnosisTheme.infoBorder,
  },
  finalCard: {
    backgroundColor: DiagnosisTheme.successBg,
    borderColor: DiagnosisTheme.successBorder,
  },
  cardDisabled: {
    opacity: 0.84,
    backgroundColor: '#F3F1EB',
    borderColor: '#DBDDD6',
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderCurve: 'continuous',
    backgroundColor: '#E7EFE5',
    color: '#4F6953',
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
    color: DiagnosisTheme.ink,
  },
  body: {
    fontSize: 15,
    lineHeight: 25,
    color: DiagnosisTheme.inkMuted,
  },
  prompt: {
    fontSize: 15,
    lineHeight: 22,
    color: DiagnosisTheme.ink,
    fontWeight: '800',
  },
  optionGroup: {
    gap: BrandSpacing.xs,
  },
  optionButton: {
    backgroundColor: DiagnosisTheme.choiceBg,
    borderWidth: 1,
    borderColor: DiagnosisTheme.choiceBorder,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionText: {
    fontSize: 15,
    lineHeight: 21,
    color: DiagnosisTheme.ink,
    fontWeight: '700',
  },
  optionButtonDisabled: {
    opacity: 0.66,
  },
  actionGroup: {
    gap: BrandSpacing.xs,
  },
  primaryButton: {
    backgroundColor: DiagnosisTheme.userBubble,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: DiagnosisTheme.line,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.panel,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: DiagnosisTheme.ink,
  },
  buttonDisabled: {
    opacity: 0.66,
  },
});
