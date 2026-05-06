import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

export type NotificationOptInCardState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'dismissed';

type Props = {
  weaknessLabels: string[];
  state: NotificationOptInCardState;
  onEnable: () => void;
  onDismiss: () => void;
};

export function NotificationOptInCard({ weaknessLabels, state, onEnable, onDismiss }: Props) {
  if (state === 'granted' || state === 'dismissed' || state === 'denied') {
    return null;
  }

  const isBusy = state === 'requesting';
  const labelText = weaknessLabels.slice(0, 2).join(', ');

  return (
    <View style={styles.card} accessibilityRole="alert">
      <Text style={styles.title}>🔔 복습 알림 받기</Text>
      <Text style={styles.body}>
        {labelText} — 내일이면 절반 이상 잊혀져요
      </Text>
      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
          onPress={onEnable}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="복습 알림 켜기">
          <Text style={styles.primaryButtonText}>켜기</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={onDismiss}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="알림 나중에 켜기">
          <Text style={styles.secondaryButtonText}>나중에</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.card,
    borderRadius: BrandRadius.md,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: BrandColors.text,
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    color: BrandColors.mutedText,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: BrandSpacing.sm,
    marginTop: BrandSpacing.xs,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: BrandColors.primary,
    paddingVertical: 12,
    borderRadius: BrandRadius.sm,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: FontFamilies.bold,
    color: '#ffffff',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BrandRadius.sm,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontFamily: FontFamilies.medium,
    color: BrandColors.mutedText,
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
