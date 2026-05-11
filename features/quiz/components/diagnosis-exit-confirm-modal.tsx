import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';

type DiagnosisExitConfirmModalProps = {
  visible: boolean;
  completedCount: number;
  onContinue: () => void;
  onExit: () => void;
};

export function DiagnosisExitConfirmModal({
  visible,
  completedCount,
  onContinue,
  onExit,
}: DiagnosisExitConfirmModalProps) {
  const bodyText =
    completedCount > 0
      ? '이미 분석한 약점은 저장돼요. 퀴즈는 다시 풀지 않아도 돼요.'
      : '퀴즈는 다시 풀지 않아도 돼요. 약점 분석부터 이어서 할 수 있어요.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
      onRequestClose={onContinue}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.topBand} />
          <Text selectable style={styles.title}>
            잠시 멈추고 나갈까요?
          </Text>
          <Text selectable style={styles.body}>
            {bodyText}
          </Text>
          <View style={styles.actions}>
            <Pressable
              style={styles.secondaryButton}
              onPress={onContinue}
              accessibilityRole="button"
              accessibilityLabel="계속할게요"
              accessibilityHint="오답 분석 화면으로 돌아가 계속 진행합니다">
              <Text style={styles.secondaryLabel}>계속할게요</Text>
            </Pressable>
            <Pressable
              style={styles.primaryButton}
              onPress={onExit}
              accessibilityRole="button"
              accessibilityLabel="나갈게요"
              accessibilityHint="완료하지 않은 분석을 버리고 현재까지 결과 화면으로 이동합니다">
              <Text style={styles.primaryLabel}>나갈게요</Text>
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
    paddingHorizontal: BrandSpacing.xl,
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 40, 32, 0.28)',
  },
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DiagnosisTheme.line,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.panel,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.md,
    boxShadow: '0 20px 42px rgba(24, 32, 25, 0.18)',
  },
  topBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: DiagnosisTheme.heroAccent,
  },
  title: {
    marginTop: BrandSpacing.xs,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    color: DiagnosisTheme.ink,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: DiagnosisTheme.inkMuted,
  },
  actions: {
    gap: BrandSpacing.xs,
  },
  primaryButton: {
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: BrandColors.danger,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: DiagnosisTheme.line,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: '#FAF7F2',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: DiagnosisTheme.ink,
  },
});
