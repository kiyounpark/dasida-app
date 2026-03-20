import * as AppleAuthentication from 'expo-apple-authentication';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DasidaLogo } from '@/components/brand/DasidaLogo';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { BrandTypography } from '@/constants/typography';
import type { UseSignInScreenResult } from '@/features/auth/hooks/use-sign-in-screen';
import type { SupportedAuthProvider } from '@/features/auth/types';

const GOOGLE_BUTTON_ASSET =
  process.env.EXPO_OS === 'android'
    ? {
        source: require('../../../assets/auth/google-signin-light-android.png'),
        aspectRatio: 567 / 120,
      }
    : process.env.EXPO_OS === 'web'
      ? {
          source: require('../../../assets/auth/google-signin-light-web.png'),
          aspectRatio: 567 / 120,
        }
      : {
          source: require('../../../assets/auth/google-signin-light-ios.png'),
          aspectRatio: 597 / 132,
        };

const LARGE_BUTTON_HEIGHT = 56;
const COMPACT_BUTTON_HEIGHT = 52;

type SupportedProviderViewModel = UseSignInScreenResult['supportedAuthProviders'][number];

function BackgroundGlow() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />
    </View>
  );
}

function InlineNotice({
  color,
  message,
}: {
  color: string;
  message: string;
}) {
  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.noticeWrap}>
      <Text selectable style={[styles.noticeText, { color }]}>
        {message}
      </Text>
    </Animated.View>
  );
}

function BusyOverlay({ dark = false }: { dark?: boolean }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.busyOverlay, dark ? styles.busyOverlayDark : styles.busyOverlayLight]}>
      <ActivityIndicator color={dark ? '#FFFFFF' : BrandColors.primaryDark} />
    </View>
  );
}

function GoogleSignInButton({
  busy,
  disabled,
  height,
  label,
  onPress,
  width,
}: {
  busy: boolean;
  disabled: boolean;
  height: number;
  label: string;
  onPress: () => void;
  width: number;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.officialButtonWrap,
        { width, height },
        (pressed || disabled) && styles.buttonPressed,
      ]}>
      <Image
        source={GOOGLE_BUTTON_ASSET.source}
        contentFit="contain"
        style={styles.officialImageButton}
      />
      {busy ? <BusyOverlay /> : null}
    </Pressable>
  );
}

function AppleSignInButton({
  busy,
  height,
  label,
  onPress,
  width,
}: {
  busy: boolean;
  height: number;
  label: string;
  onPress: () => void;
  width: number;
}) {
  return (
    <View
      accessibilityLabel={label}
      pointerEvents={busy ? 'none' : 'auto'}
      style={[styles.officialButtonWrap, { width, height }, busy && styles.buttonPressed]}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
        cornerRadius={BrandRadius.lg}
        onPress={onPress}
        style={styles.appleButton}
      />
      {busy ? <BusyOverlay dark /> : null}
    </View>
  );
}

function ProviderButton({
  busyAction,
  height,
  provider,
  width,
  onSignIn,
}: {
  busyAction: string | null;
  height: number;
  provider: SupportedProviderViewModel;
  width: number;
  onSignIn: (provider: SupportedAuthProvider) => void;
}) {
  const isBusy = busyAction === provider.id;
  const isDisabled = busyAction !== null;

  if (provider.id === 'apple') {
    return (
      <AppleSignInButton
        busy={isBusy}
        height={height}
        label={provider.label}
        onPress={() => void onSignIn(provider.id)}
        width={width}
      />
    );
  }

  return (
    <GoogleSignInButton
      busy={isBusy}
      disabled={isDisabled}
      height={height}
      label={provider.label}
      onPress={() => void onSignIn(provider.id)}
      width={width}
    />
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
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompactLayout = height < 760;
  const buttonHeight = isCompactLayout ? COMPACT_BUTTON_HEIGHT : LARGE_BUTTON_HEIGHT;
  const buttonWidth = Math.min(
    Math.round(buttonHeight * GOOGLE_BUTTON_ASSET.aspectRatio),
    width - BrandSpacing.xxl * 2,
  );
  const logoWidth = Math.min(isCompactLayout ? 228 : 260, Math.max(176, width - BrandSpacing.xxl * 2));
  const contentGap = isCompactLayout ? BrandSpacing.lg : BrandSpacing.xl;
  const containerPaddingTop = insets.top + (isCompactLayout ? BrandSpacing.lg : BrandSpacing.xl);
  const containerPaddingBottom = insets.bottom + BrandSpacing.lg;

  return (
    <View style={styles.screen}>
      <BackgroundGlow />
      <View
        style={[
          styles.container,
          {
            paddingTop: containerPaddingTop,
            paddingBottom: containerPaddingBottom,
            gap: contentGap,
          },
        ]}>
        <View style={[styles.content, { gap: contentGap }]}>
          <Animated.View entering={FadeInDown.duration(240)} style={styles.logoBlock}>
            <DasidaLogo width={logoWidth} height={Math.round((logoWidth / 260) * 68)} />
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(240).delay(60)} style={styles.actionArea}>
            {supportedAuthProviders.length > 0 ? (
              <View style={styles.buttonList}>
                {supportedAuthProviders.map((provider, index) => (
                  <Animated.View
                    entering={FadeInUp.duration(220).delay(120 + index * 50)}
                    key={provider.id}>
                    <ProviderButton
                      busyAction={busyAction}
                      height={buttonHeight}
                      provider={provider}
                      width={buttonWidth}
                      onSignIn={onSignIn}
                    />
                  </Animated.View>
                ))}
              </View>
            ) : (
              <Animated.View entering={FadeIn.duration(180)} style={styles.blockingCard}>
                <Text selectable style={styles.blockingTitle}>
                  {blockingCopy?.title ?? '로그인을 시작할 수 없어요'}
                </Text>
                <Text selectable style={styles.blockingBody}>
                  {blockingCopy?.body ?? '현재 빌드 설정을 확인한 뒤 다시 시도해 주세요.'}
                </Text>
              </Animated.View>
            )}

            {errorMessage ? (
              <InlineNotice color={BrandColors.danger} message={errorMessage} />
            ) : null}
          </Animated.View>

          {canUseDevGuestAuth ? (
            <Animated.View entering={FadeIn.duration(180).delay(180)} style={styles.devGuestWrap}>
              <Pressable
                accessibilityRole="button"
                disabled={busyAction !== null}
                onPress={() => void onContinueAsDevGuest()}
                style={({ pressed }) => [
                  styles.devGuestButton,
                  (pressed || busyAction !== null) && styles.devGuestButtonPressed,
                ]}>
                <Text selectable style={styles.devGuestText}>
                  {busyAction === 'dev-guest'
                    ? '개발용 익명으로 계속하는 중...'
                    : '개발용 익명으로 계속'}
                </Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: BrandSpacing.lg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowTop: {
    top: -72,
    right: -48,
    width: 220,
    height: 220,
    backgroundColor: 'rgba(74, 124, 89, 0.14)',
  },
  glowBottom: {
    bottom: 36,
    left: -72,
    width: 180,
    height: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  logoBlock: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionArea: {
    width: '100%',
    alignItems: 'center',
    gap: BrandSpacing.md,
  },
  buttonList: {
    width: '100%',
    alignItems: 'center',
    gap: BrandSpacing.sm,
  },
  officialButtonWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  officialImageButton: {
    width: '100%',
    height: '100%',
  },
  appleButton: {
    width: '100%',
    height: '100%',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BrandRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyOverlayDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
  },
  busyOverlayLight: {
    backgroundColor: 'rgba(246, 242, 234, 0.58)',
  },
  noticeWrap: {
    paddingHorizontal: BrandSpacing.md,
  },
  noticeText: {
    ...BrandTypography.meta,
    textAlign: 'center',
  },
  blockingCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: BrandSpacing.lg,
    paddingVertical: BrandSpacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.08)',
    gap: BrandSpacing.xs,
    alignItems: 'center',
  },
  blockingTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
    textAlign: 'center',
  },
  blockingBody: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
    textAlign: 'center',
  },
  devGuestWrap: {
    width: '100%',
    alignItems: 'center',
  },
  devGuestButton: {
    paddingHorizontal: BrandSpacing.md,
    paddingVertical: BrandSpacing.sm,
    borderRadius: BrandRadius.md,
  },
  devGuestButtonPressed: {
    opacity: 0.68,
  },
  devGuestText: {
    ...BrandTypography.meta,
    color: BrandColors.primaryDark,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(41, 59, 39, 0.38)',
  },
});
