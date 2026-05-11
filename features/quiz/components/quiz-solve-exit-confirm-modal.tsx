import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

export type QuizSolveExitConfirmModalProps = {
  body: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirmExit: () => void;
  title: string;
  visible: boolean;
};

export function QuizSolveExitConfirmModal({
  body,
  cancelLabel = '계속 풀기',
  confirmLabel = '나가기',
  onClose,
  onConfirmExit,
  title,
  visible,
}: QuizSolveExitConfirmModalProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
      transparent
      visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text selectable style={styles.title}>
            {title}
          </Text>
          <Text selectable style={styles.body}>
            {body}
          </Text>

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryButton}>
              <Text selectable style={styles.secondaryLabel}>
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onConfirmExit}
              style={styles.primaryButton}>
              <Text selectable style={styles.primaryLabel}>
                {confirmLabel}
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
