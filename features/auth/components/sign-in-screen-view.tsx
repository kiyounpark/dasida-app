import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { BrandTypography } from '@/constants/typography';
import type { UseSignInScreenResult } from '@/features/auth/hooks/use-sign-in-screen';

function NoticeCard({ message }: { message: string }) {
  return (
    <View style={styles.errorCard}>
      <Text selectable style={styles.errorText}>
        {message}
      </Text>
    </View>
  );
}

function AuthButton({
  label,
  disabled,
  subtle = false,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  subtle?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        subtle ? styles.buttonSubtle : styles.buttonPrimary,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}>
      <Text selectable style={[styles.buttonLabel, subtle && styles.buttonLabelSubtle]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SignInScreenView({
  blockingCopy,
  busyAction,
  canUseDevGuestAuth,
  errorMessage,
  supportedAuthProviders,
  onContinueAsDevGuest,
  onSignIn,
}: UseSignInScreenResult) {
  return (
    <View style={styles.screen}>
      <BrandHeader compact />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text selectable style={styles.heroEyebrow}>
            ACCOUNT REQUIRED
          </Text>
          <Text selectable style={styles.title}>
            로그인하고 바로 시작해요
          </Text>
          <Text selectable style={styles.body}>
            학습 기록과 복습 일정은 계정에 저장됩니다.
          </Text>
        </View>

        {errorMessage ? <NoticeCard message={errorMessage} /> : null}

        <View style={styles.card}>
          {supportedAuthProviders.length > 0 ? (
            <>
              <Text selectable style={styles.cardTitle}>
                사용할 로그인 방법
              </Text>
              <Text selectable style={styles.body}>
                현재 기기와 플랫폼에서 지원되는 소셜 로그인만 표시합니다.
              </Text>
              <View style={styles.buttonList}>
                {supportedAuthProviders.map((provider) => (
                  <AuthButton
                    key={provider.id}
                    label={
                      busyAction === provider.id ? `${provider.label}...` : provider.label
                    }
                    disabled={busyAction !== null}
                    onPress={() => void onSignIn(provider.id)}
                  />
                ))}
              </View>
            </>
          ) : (
            <>
              <Text selectable style={styles.cardTitle}>
                {blockingCopy?.title ?? '로그인을 시작할 수 없어요'}
              </Text>
              <Text selectable style={styles.body}>
                {blockingCopy?.body ?? '현재 빌드 설정을 확인한 뒤 다시 시도해 주세요.'}
              </Text>
            </>
          )}
        </View>

        {canUseDevGuestAuth ? (
          <View style={styles.devCard}>
            <Text selectable style={styles.devTitle}>
              개발 빌드 전용
            </Text>
            <Text selectable style={styles.body}>
              프로덕션에서는 허용되지 않으며, 로컬 학습 흐름 확인용으로만 사용합니다.
            </Text>
            <AuthButton
              label={
                busyAction === 'dev-guest' ? '개발용 익명으로 계속...' : '개발용 익명으로 계속'
              }
              disabled={busyAction !== null}
              subtle
              onPress={() => void onContinueAsDevGuest()}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: BrandSpacing.md,
    paddingBottom: BrandSpacing.xxl,
    gap: BrandSpacing.md,
  },
  heroCard: {
    borderRadius: BrandRadius.lg,
    borderWidth: 1,
    borderColor: '#D4DFD2',
    backgroundColor: '#F9FBF6',
    padding: BrandSpacing.xl,
    gap: BrandSpacing.sm,
  },
  heroEyebrow: {
    ...BrandTypography.meta,
    color: BrandColors.primarySoft,
    letterSpacing: 0.8,
  },
  title: {
    ...BrandTypography.screenTitle,
    color: BrandColors.text,
  },
  body: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
  card: {
    borderRadius: BrandRadius.lg,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: '#FFFFFF',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  cardTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  buttonList: {
    gap: BrandSpacing.xs,
  },
  button: {
    alignItems: 'center',
    borderRadius: BrandRadius.md,
    paddingHorizontal: BrandSpacing.md,
    paddingVertical: 14,
  },
  buttonPrimary: {
    backgroundColor: BrandColors.primarySoft,
  },
  buttonSubtle: {
    backgroundColor: '#ECF2EA',
  },
  buttonDisabled: {
    backgroundColor: '#D9E2D7',
  },
  buttonPressed: {
    opacity: 0.84,
  },
  buttonLabel: {
    ...BrandTypography.button,
    color: '#FFFFFF',
  },
  buttonLabelSubtle: {
    color: BrandColors.primaryDark,
  },
  errorCard: {
    borderRadius: BrandRadius.md,
    borderWidth: 1,
    borderColor: '#F3C8C8',
    backgroundColor: '#FFF2F2',
    paddingHorizontal: BrandSpacing.md,
    paddingVertical: 12,
  },
  errorText: {
    ...BrandTypography.body,
    color: BrandColors.danger,
  },
  devCard: {
    borderRadius: BrandRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: BrandColors.border,
    backgroundColor: '#F6F8F4',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  devTitle: {
    ...BrandTypography.bodyStrong,
    color: BrandColors.primaryDark,
  },
});
