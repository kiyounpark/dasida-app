import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

type DiagnosticSolveExitModalProps = {
  onClose: () => void;
  onConfirmExit: () => void;
  visible: boolean;
};

export function DiagnosticSolveExitModal({
  onClose,
  onConfirmExit,
  visible,
}: DiagnosticSolveExitModalProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text selectable style={styles.title}>
            진단을 나갈까요?
          </Text>
          <Text selectable style={styles.body}>
            지금까지 푼 답안은 저장되지 않아요. 나가면 처음부터 다시 시작해야 해요.
          </Text>

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryButton}>
              <Text selectable style={styles.secondaryLabel}>
                계속 풀기
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onConfirmExit}
              style={styles.primaryButton}>
              <Text selectable style={styles.primaryLabel}>
                나가기
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: BrandSpacing.xl,
    backgroundColor: 'rgba(21, 29, 22, 0.24)',
  },
  card: {
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 12,
    boxShadow: '0 24px 44px rgba(25, 36, 28, 0.18)',
  },
  title: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 24,
    lineHeight: 30,
    color: BrandColors.text,
  },
  body: {
    fontFamily: FontFamilies.medium,
    fontSize: 16,
    lineHeight: 24,
    color: BrandColors.mutedText,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primaryDark,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: '#D7D4CD',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  primaryLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  secondaryLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 20,
    color: BrandColors.text,
  },
});
