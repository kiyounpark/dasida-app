import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type { LearnerGrade, LearnerTrack } from '@/features/learner/types';
import type { UseOnboardingScreenResult } from '@/features/onboarding/hooks/use-onboarding-screen';

const CHARACTER_SOURCE = require('../../../assets/auth/dasida-login-character.png');
const CHARACTER_ASPECT_RATIO = 492 / 534;

const GRADE_OPTIONS: { value: Exclude<LearnerGrade, 'unknown'>; label: string; sub: string }[] = [
  { value: 'g1', label: '고1', sub: '1학년' },
  { value: 'g2', label: '고2', sub: '2학년' },
  { value: 'g3', label: '고3', sub: '3학년' },
];

const TRACK_OPTIONS: { value: LearnerTrack; label: string; sub: string }[] = [
  { value: 'calc', label: '미적분', sub: '미적분 선택' },
  { value: 'stats', label: '확통', sub: '확률과통계 선택' },
  { value: 'geom', label: '기하', sub: '기하 선택' },
];

function BackgroundGlow() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.glow, styles.glowTopLeft]} />
      <View style={[styles.glow, styles.glowCenter]} />
      <View style={[styles.glow, styles.glowBottom]} />
    </View>
  );
}

function GradeCard({
  label,
  sub,
  selected,
  onPress,
}: {
  label: string;
  sub: string;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(1.06, { damping: 12 }, () => {
      scale.value = withSpring(selected ? 1 : 1.04);
    });
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${label} 선택`}
      accessibilityState={{ selected }}
      style={styles.gradeCardWrap}>
      <Animated.View
        style={[
          styles.gradeCard,
          selected && styles.gradeCardSelected,
          animatedStyle,
        ]}>
        <Text style={[styles.gradeLabel, selected && styles.gradeLabelSelected]}>
          {label}
        </Text>
        <Text style={[styles.gradeSub, selected && styles.gradeSubSelected]}>
          {sub}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function TrackCard({
  label,
  sub,
  selected,
  onPress,
}: {
  label: string;
  sub: string;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const handlePress = () => {
    scale.value = withSpring(1.06, { damping: 12 }, () => {
      scale.value = withSpring(selected ? 1 : 1.04);
    });
    onPress();
  };
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${label} 선택`}
      accessibilityState={{ selected }}
      style={styles.gradeCardWrap}>
      <Animated.View style={[styles.gradeCard, selected && styles.gradeCardSelected, animatedStyle]}>
        <Text style={[styles.gradeLabel, selected && styles.gradeLabelSelected]}>{label}</Text>
        <Text style={[styles.gradeSub, selected && styles.gradeSubSelected]}>{sub}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function OnboardingScreenView({
  nickname,
  grade,
  track,
  showTrackStep,
  isBusy,
  isReady,
  errorMessage,
  onChangeNickname,
  onSelectGrade,
  onSelectTrack,
  onSubmit,
}: UseOnboardingScreenResult) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <BackgroundGlow />
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + BrandSpacing.lg,
            paddingBottom: insets.bottom + BrandSpacing.lg,
          },
        ]}>

        {/* 캐릭터 + 말풍선 */}
        <Animated.View entering={FadeInDown.duration(220)} style={styles.heroBlock}>
          <View style={styles.speechBubble}>
            <Text selectable style={styles.bubbleGreeting}>안녕하세요!</Text>
            <Text selectable style={styles.bubbleMain}>어떻게 불러드릴까요?</Text>
          </View>
          <Image
            source={CHARACTER_SOURCE}
            contentFit="contain"
            style={styles.characterImage}
          />
        </Animated.View>

        {/* 폼 */}
        <View style={styles.form}>

          {/* 닉네임 */}
          <Animated.View entering={FadeInUp.duration(220).delay(80)} style={styles.fieldBlock}>
            <Text selectable style={styles.fieldLabel}>닉네임</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={onChangeNickname}
              placeholder="불러드릴 이름을 입력해주세요"
              placeholderTextColor="rgba(30,47,32,0.35)"
              maxLength={10}
              returnKeyType="done"
            />
          </Animated.View>

          {/* 학년 선택 */}
          <Animated.View entering={FadeInUp.duration(220).delay(160)} style={styles.fieldBlock}>
            <Text selectable style={styles.fieldLabel}>학년</Text>
            <View style={styles.gradeRow}>
              {GRADE_OPTIONS.map((option) => (
                <GradeCard
                  key={option.value}
                  label={option.label}
                  sub={option.sub}
                  selected={grade === option.value}
                  onPress={() => onSelectGrade(option.value)}
                />
              ))}
            </View>
          </Animated.View>

          {/* 트랙 선택 (고3 전용) */}
          {showTrackStep ? (
            <Animated.View entering={FadeInUp.duration(220).delay(200)} style={styles.fieldBlock}>
              <Text selectable style={styles.fieldLabel}>수능 수학 선택과목</Text>
              <View style={styles.gradeRow}>
                {TRACK_OPTIONS.map((option) => (
                  <TrackCard
                    key={option.value}
                    label={option.label}
                    sub={option.sub}
                    selected={track === option.value}
                    onPress={() => onSelectTrack(option.value)}
                  />
                ))}
              </View>
            </Animated.View>
          ) : null}

          {/* CTA 버튼 */}
          <Animated.View entering={FadeInUp.duration(220).delay(240)} style={styles.ctaBlock}>
            <Pressable
              onPress={() => void onSubmit()}
              disabled={!isReady || isBusy}
              accessibilityRole="button"
              accessibilityLabel="다시다 시작하기"
              accessibilityState={{ disabled: !isReady || isBusy }}
              style={({ pressed }) => [
                styles.ctaButton,
                isReady ? styles.ctaButtonActive : styles.ctaButtonDisabled,
                pressed && isReady && styles.ctaButtonPressed,
              ]}>
              {isBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text selectable style={[styles.ctaText, !isReady && styles.ctaTextDisabled]}>
                  다시다 시작하기
                </Text>
              )}
            </Pressable>
            {errorMessage ? (
              <Animated.View entering={FadeIn.duration(180)}>
                <Text selectable style={styles.errorText}>{errorMessage}</Text>
              </Animated.View>
            ) : null}
          </Animated.View>

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
    top: 120,
    left: '10%',
    width: 280,
    height: 280,
    backgroundColor: 'rgba(255, 237, 192, 0.42)',
  },
  glowBottom: {
    bottom: -48,
    right: -72,
    width: 220,
    height: 220,
    backgroundColor: 'rgba(255, 244, 216, 0.72)',
  },
  heroBlock: {
    alignItems: 'center',
    paddingTop: BrandSpacing.md,
  },
  speechBubble: {
    backgroundColor: '#FFFDF4',
    borderWidth: 2,
    borderColor: '#1F1D18',
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: BrandSpacing.lg,
    paddingVertical: BrandSpacing.md,
    alignItems: 'center',
    gap: 2,
    boxShadow: '3px 3px 0 rgba(31,29,24,0.10)',
  },
  bubbleGreeting: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: BrandColors.primary,
    letterSpacing: 0.04,
  },
  bubbleMain: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: BrandColors.text,
  },
  characterImage: {
    width: 140,
    aspectRatio: CHARACTER_ASPECT_RATIO,
  },
  form: {
    flex: 1,
    gap: BrandSpacing.lg,
    justifyContent: 'center',
  },
  fieldBlock: {
    gap: BrandSpacing.xs,
  },
  fieldLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: BrandColors.text,
    letterSpacing: 0.02,
  },
  input: {
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(41,59,39,0.18)',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    paddingHorizontal: BrandSpacing.md,
    fontFamily: FontFamilies.medium,
    fontSize: 16,
    color: BrandColors.text,
  },
  gradeRow: {
    flexDirection: 'row',
    gap: BrandSpacing.sm,
  },
  gradeCardWrap: {
    flex: 1,
  },
  gradeCard: {
    height: 72,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1.5,
    borderColor: 'rgba(41,59,39,0.14)',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  gradeCardSelected: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
    boxShadow: '0 6px 18px rgba(74,124,89,0.32)',
  },
  gradeLabel: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 22,
    color: BrandColors.text,
    letterSpacing: -0.02,
  },
  gradeLabelSelected: {
    color: '#FFFFFF',
  },
  gradeSub: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: 'rgba(30,47,32,0.45)',
  },
  gradeSubSelected: {
    color: 'rgba(255,255,255,0.7)',
  },
  ctaBlock: {
    marginTop: BrandSpacing.sm,
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
    marginTop: BrandSpacing.xs,
  },
});
