import type { DiagnosisFlowNode } from '@/data/detailedDiagnosisFlows';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type DiagnosisFlowCardProps = {
  node: DiagnosisFlowNode;
  methodLabel: string;
  disabled?: boolean;
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
  onChoicePress,
  onExplainContinue,
  onExplainDontKnow,
  onCheckPress,
  onCheckDontKnow,
  onFinalConfirm,
}: DiagnosisFlowCardProps) {
  return (
    <View style={styles.card}>
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
              style={[styles.optionButton, disabled && styles.optionButtonDisabled]}
              onPress={() => onChoicePress(option.id)}
              accessibilityRole="button"
              accessibilityLabel={option.text}
              disabled={disabled}>
              <Text style={styles.optionText}>
                {option.text}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {node.kind === 'explain' && (
        <View style={styles.actionGroup}>
          <Pressable
            style={[styles.primaryButton, disabled && styles.buttonDisabled]}
            onPress={onExplainContinue}
            accessibilityRole="button"
            accessibilityLabel={node.primaryLabel}
            disabled={disabled}>
            <Text style={styles.primaryButtonText}>
              {node.primaryLabel}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, disabled && styles.buttonDisabled]}
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
                style={[styles.optionButton, disabled && styles.optionButtonDisabled]}
                onPress={() => onCheckPress(option.id)}
                accessibilityRole="button"
                accessibilityLabel={option.text}
                disabled={disabled}>
                <Text style={styles.optionText}>
                  {option.text}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[styles.secondaryButton, disabled && styles.buttonDisabled]}
            onPress={onCheckDontKnow}
            accessibilityRole="button"
            accessibilityLabel="모르겠습니다"
            disabled={disabled}>
            <Text style={styles.secondaryButtonText}>
              모르겠습니다
            </Text>
          </Pressable>
        </>
      )}

      {node.kind === 'final' && (
        <View style={styles.actionGroup}>
          <Pressable
            style={[styles.primaryButton, disabled && styles.buttonDisabled]}
            onPress={onFinalConfirm}
            accessibilityRole="button"
            accessibilityLabel={node.ctaLabel}
            disabled={disabled}>
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
    backgroundColor: '#FFF9F6',
    borderWidth: 1,
    borderColor: '#F0D7D7',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    padding: BrandSpacing.md,
    gap: BrandSpacing.sm,
    boxShadow: '0 12px 28px rgba(122, 90, 90, 0.08)',
  },
  header: {
    gap: 6,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#FFE7D8',
    color: '#A5551A',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
    color: '#7C2D12',
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: '#5F4A4A',
  },
  prompt: {
    fontSize: 15,
    lineHeight: 22,
    color: BrandColors.text,
    fontWeight: '700',
  },
  optionGroup: {
    gap: BrandSpacing.xs,
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F4C6C6',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionText: {
    fontSize: 15,
    lineHeight: 21,
    color: BrandColors.text,
    fontWeight: '700',
  },
  optionButtonDisabled: {
    opacity: 0.65,
  },
  actionGroup: {
    gap: BrandSpacing.xs,
  },
  primaryButton: {
    backgroundColor: BrandColors.warning,
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
    borderColor: '#E8B8B8',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: '#FFF0F0',
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9A3434',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
});
