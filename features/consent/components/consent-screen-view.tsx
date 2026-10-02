import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

import { CONSENT_COPY } from '../consent-copy';
import type { UseConsentScreenResult } from '../hooks/use-consent-screen';
import { openAccountManageAlert } from './account-manage-alert';

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.box, checked && styles.boxChecked]}>
      {checked ? <Text style={styles.boxMark}>✓</Text> : null}
    </View>
  );
}

function CheckRow({
  label,
  tag,
  checked,
  strong,
  onPress,
}: {
  label: string;
  tag?: string;
  checked: boolean;
  strong?: boolean;
  onPress: () => void;
}) {
  const accessibilityLabel = tag ? `${tag} ${label}` : label;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <CheckBox checked={checked} />
      <Text style={[styles.rowText, strong && styles.rowTextStrong]}>
        {tag ? <Text style={styles.tag}>{`${tag} `}</Text> : null}
        {label}
      </Text>
    </Pressable>
  );
}

export function ConsentScreenView({
  allChecked,
  rows,
  canSubmit,
  busyAction,
  errorMessage,
  onToggleAll,
  onToggle,
  onSubmit,
  onSignOut,
  onDeleteAccount,
}: UseConsentScreenResult) {
  const insets = useSafeAreaInsets();
  const isBusy = busyAction !== null;

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + BrandSpacing.lg, paddingBottom: insets.bottom + BrandSpacing.lg },
      ]}>
      <View style={styles.content}>
        <View style={styles.card}>
          <CheckRow label={CONSENT_COPY.all} checked={allChecked} strong onPress={onToggleAll} />
          <View style={styles.divider} />
          {rows.map((row) => (
            <CheckRow
              key={row.kind}
              label={row.label}
              tag={row.tag}
              checked={row.checked}
              onPress={() => onToggle(row.kind)}
            />
          ))}
        </View>

        <Pressable
          onPress={() => void onSubmit()}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel={CONSENT_COPY.next}
          accessibilityState={{ disabled: !canSubmit }}
          style={({ pressed }) => [
            styles.ctaButton,
            canSubmit ? styles.ctaButtonActive : styles.ctaButtonDisabled,
            pressed && canSubmit && styles.ctaButtonPressed,
          ]}>
          {busyAction === 'submit' ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.ctaText, !canSubmit && styles.ctaTextDisabled]}>{CONSENT_COPY.next}</Text>
          )}
        </Pressable>

        {errorMessage ? (
          <Text selectable style={styles.errorText}>
            {errorMessage}
          </Text>
        ) : null}

        <Pressable
          onPress={() =>
            openAccountManageAlert({
              onSignOut: () => void onSignOut(),
              onDeleteAccount: () => void onDeleteAccount(),
            })
          }
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel={CONSENT_COPY.accountManage}
          style={styles.manageLink}>
          <Text style={styles.manageLinkText}>{CONSENT_COPY.accountManage}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
    paddingHorizontal: BrandSpacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: BrandSpacing.lg,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(41,59,39,0.14)',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    paddingVertical: BrandSpacing.xs,
  },
  divider: {
    height: 1,
    marginHorizontal: BrandSpacing.md,
    backgroundColor: 'rgba(41,59,39,0.12)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrandSpacing.sm,
    paddingHorizontal: BrandSpacing.md,
    paddingVertical: BrandSpacing.sm,
    minHeight: 52,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowText: {
    flex: 1,
    fontFamily: FontFamilies.medium,
    fontSize: 15,
    lineHeight: 21,
    color: BrandColors.text,
  },
  rowTextStrong: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
  },
  tag: {
    fontFamily: FontFamilies.bold,
    color: BrandColors.primarySoft,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(41,59,39,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  boxChecked: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  boxMark: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    lineHeight: 18,
    color: '#FFFFFF',
  },
  ctaButton: {
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonActive: {
    backgroundColor: BrandColors.primaryDark,
    boxShadow: '0 14px 32px rgba(30,47,32,0.28)',
  },
  ctaButtonDisabled: {
    backgroundColor: 'rgba(30,47,32,0.10)',
  },
  ctaButtonPressed: {
    opacity: 0.88,
  },
  ctaText: {
    fontFamily: FontFamilies.bold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  ctaTextDisabled: {
    color: 'rgba(30,47,32,0.28)',
  },
  errorText: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: BrandColors.danger,
    textAlign: 'center',
  },
  manageLink: {
    alignSelf: 'center',
    paddingVertical: BrandSpacing.xs,
    paddingHorizontal: BrandSpacing.sm,
  },
  manageLinkText: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: BrandColors.mutedText,
  },
});
