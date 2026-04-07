import * as AppleAuthentication from 'expo-apple-authentication';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DasidaLogo } from '@/components/brand/DasidaLogo';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { LEGAL_URLS } from '@/constants/legal-urls';
import { BrandTypography } from '@/constants/typography';
import type { UseSignInScreenResult } from '@/features/auth/hooks/use-sign-in-screen';
import type { SupportedAuthProvider } from '@/features/auth/types';

const LOGIN_CHARACTER_SOURCE = require('../../../assets/auth/dasida-login-character.png');

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

const LOGIN_CHARACTER_ASPECT_RATIO = 492 / 534;
const LARGE_BUTTON_HEIGHT = 60;
const COMPACT_BUTTON_HEIGHT = 54;
const MAX_BUTTON_WIDTH = 304;
const MAX_LOGO_WIDTH = 236;
const MAX_CHARACTER_WIDTH = 272;

type SupportedProviderViewModel = UseSignInScreenResult['supportedAuthProviders'][number];

function BackgroundGlow({ height, width }: { height: number; width: number }) {
  const centerGlowSize = Math.min(width * 0.72, 340);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.glow, styles.glowTopLeft]} />
      <View
        style={[
          styles.glow,
          styles.glowCenter,
          {
            top: Math.round(height * 0.19),
            left: Math.round(width / 2 - centerGlowSize / 2),
            width: centerGlowSize,
            height: centerGlowSize,
          },
        ]}
      />
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
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={999}
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
    MAX_BUTTON_WIDTH,
    Math.round(buttonHeight * GOOGLE_BUTTON_ASSET.aspectRatio),
    width - BrandSpacing.xl * 2,
  );
  const logoWidth = Math.min(
    MAX_LOGO_WIDTH,
    Math.max(isCompactLayout ? 188 : 204, width - BrandSpacing.xxl * 2),
  );
  const characterWidth = Math.min(
    MAX_CHARACTER_WIDTH,
    Math.max(188, Math.round(width * (isCompactLayout ? 0.52 : 0.58))),
  );
  const heroGap = isCompactLayout ? BrandSpacing.lg : BrandSpacing.xl;
  const footerGap = isCompactLayout ? BrandSpacing.md : BrandSpacing.lg;
  const containerPaddingTop = insets.top + (isCompactLayout ? BrandSpacing.lg : BrandSpacing.xl);
  const containerPaddingBottom = insets.bottom + BrandSpacing.lg;

  return (
    <View style={styles.screen}>
      <BackgroundGlow height={height} width={width} />
      <View
        style={[
          styles.container,
          {
            paddingTop: containerPaddingTop,
            paddingBottom: containerPaddingBottom,
          },
        ]}>
        <View style={styles.content}>
          <View style={[styles.heroStack, { gap: heroGap }]}>
            <Animated.View entering={FadeInDown.duration(220)} style={styles.logoBlock}>
              <DasidaLogo width={logoWidth} height={Math.round((logoWidth / 260) * 68)} />
            </Animated.View>

            <Animated.View
              entering={ZoomIn.duration(260).delay(60)}
              style={[styles.characterBlock, { width: characterWidth }]}>
              <Image
                source={LOGIN_CHARACTER_SOURCE}
                contentFit="contain"
                style={styles.characterImage}
              />
            </Animated.View>
          </View>

          <View style={[styles.footerBlock, { gap: footerGap }]}>
            <Animated.View entering={FadeInUp.duration(220).delay(120)} style={styles.actionArea}>
              {supportedAuthProviders.length > 0 ? (
                <View style={styles.buttonList}>
                  {supportedAuthProviders.map((provider, index) => (
                    <Animated.View
                      entering={FadeInUp.duration(220).delay(160 + index * 50)}
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
              <Animated.View entering={FadeIn.duration(180).delay(220)} style={styles.devGuestWrap}>
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

            <Animated.View entering={FadeIn.duration(180).delay(280)} style={styles.privacyWrap}>
              <Text selectable style={styles.privacyText}>
                {'로그인하면 '}
                <Text
                  style={styles.privacyLink}
                  onPress={() => void Linking.openURL(LEGAL_URLS.privacyPolicy)}>
                  개인정보처리방침
                </Text>
                {'에 동의한 것으로 간주됩니다.'}
              </Text>
            </Animated.View>

          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroStack: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBlock: {
    width: '100%',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowTopLeft: {
    top: -64,
    left: -56,
    width: 240,
    height: 240,
    backgroundColor: 'rgba(245, 224, 164, 0.36)',
  },
  glowCenter: {
    backgroundColor: 'rgba(255, 237, 192, 0.42)',
  },
  glowBottom: {
    bottom: -48,
    right: -72,
    width: 220,
    height: 220,
    backgroundColor: 'rgba(255, 244, 216, 0.72)',
  },
  logoBlock: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterImage: {
    width: '100%',
    aspectRatio: LOGIN_CHARACTER_ASPECT_RATIO,
  },
  actionArea: {
    width: '100%',
    alignItems: 'center',
    gap: BrandSpacing.md,
  },
  buttonList: {
    width: '100%',
    alignItems: 'center',
    gap: 18,
  },
  officialButtonWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
    boxShadow: '0 12px 26px rgba(37, 42, 33, 0.10)',
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
    opacity: 0.88,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
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
    maxWidth: 320,
    paddingHorizontal: BrandSpacing.md,
  },
  noticeText: {
    ...BrandTypography.meta,
    textAlign: 'center',
  },
  blockingCard: {
    width: '100%',
    maxWidth: 332,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: BrandSpacing.lg,
    paddingVertical: BrandSpacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
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
  privacyWrap: {
    paddingBottom: BrandSpacing.xs,
  },
  privacyText: {
    ...BrandTypography.meta,
    color: 'rgba(41, 59, 39, 0.45)',
    textAlign: 'center',
  },
  privacyLink: {
    ...BrandTypography.meta,
    color: 'rgba(41, 59, 39, 0.55)',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(41, 59, 39, 0.30)',
  },
});
