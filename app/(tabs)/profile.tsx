import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { BrandTypography } from '@/constants/typography';
import { useCurrentLearner } from '@/features/learner/provider';
import type { PreviewSeedState } from '@/features/learner/types';

const gradeOptions = [
  { value: 'g1', label: '고1' },
  { value: 'g2', label: '고2' },
  { value: 'g3', label: '고3' },
  { value: 'unknown', label: '미설정' },
] as const;

const previewStates: { value: PreviewSeedState; label: string }[] = [
  { value: 'fresh', label: '첫 설치' },
  { value: 'diagnostic-complete', label: '진단 완료' },
  { value: 'review-available', label: '오늘 복습 있음' },
  { value: 'exam-in-progress', label: '모의고사 진행 중' },
];

function maskAccountKey(accountKey: string) {
  if (accountKey.length <= 18) {
    return accountKey;
  }

  return `${accountKey.slice(0, 12)}...${accountKey.slice(-4)}`;
}

export default function ProfileScreen() {
  const {
    isReady,
    session,
    profile,
    homeState,
    updateGrade,
    seedPreview,
    resetLocalProfile,
  } = useCurrentLearner();

  return (
    <View style={styles.screen}>
      <BrandHeader compact />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text selectable style={styles.title}>
            설정
          </Text>
          <Text selectable style={styles.subtitle}>
            지금은 로컬 익명 프로필로 학습 상태를 관리하고, 나중에 소셜 로그인 구현체만
            바꿀 수 있게 구조를 준비합니다.
          </Text>
        </View>

        <View style={styles.card}>
          <Text selectable style={styles.cardTitle}>
            학년 설정
          </Text>
          <View style={styles.chipWrap}>
            {gradeOptions.map((option) => {
              const isSelected = profile?.grade === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => void updateGrade(option.value)}>
                  <Text selectable style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text selectable style={styles.cardTitle}>
            현재 학습자 상태
          </Text>
          {isReady && session && profile ? (
            <View style={styles.infoList}>
              <Text selectable style={styles.body}>
                세션 상태: {session.status}
              </Text>
              <Text selectable style={styles.body}>
                계정 키: {maskAccountKey(session.accountKey)}
              </Text>
              <Text selectable style={styles.body}>
                허브 히어로: {homeState?.hero ?? '준비 중'}
              </Text>
            </View>
          ) : (
            <Text selectable style={styles.body}>
              학습자 상태를 불러오는 중입니다.
            </Text>
          )}
        </View>

        <View style={[styles.card, styles.devCard]}>
          <Text selectable style={styles.devLabel}>
            개발용 상태 미리보기
          </Text>
          <Text selectable style={styles.body}>
            로그인 없이도 허브 히어로와 함께 공부 중인 학생 스트립이 어떻게 보이는지
            바로 전환해볼 수 있습니다. 이 샘플 프로필은 개발용 미리보기에서만 보입니다.
          </Text>
          <View style={styles.previewList}>
            {previewStates.map((preview) => (
              <Pressable
                key={preview.value}
                style={styles.previewButton}
                onPress={() => void seedPreview(preview.value)}>
                <Text selectable style={styles.previewButtonText}>
                  {preview.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.resetButton} onPress={() => void resetLocalProfile()}>
            <Text selectable style={styles.resetButtonText}>
              로컬 상태 초기화
            </Text>
          </Pressable>
        </View>
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
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    backgroundColor: '#FAFCF8',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.xs,
  },
  card: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    backgroundColor: '#fff',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  title: {
    ...BrandTypography.screenTitle,
    color: BrandColors.text,
  },
  subtitle: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
  cardTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  body: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BrandSpacing.xs,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: '#F7FAF6',
  },
  chipSelected: {
    borderColor: BrandColors.primarySoft,
    backgroundColor: BrandColors.primarySoft,
  },
  chipText: {
    ...BrandTypography.chip,
    color: BrandColors.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  infoList: {
    gap: 4,
  },
  devCard: {
    borderStyle: 'dashed',
  },
  devLabel: {
    ...BrandTypography.meta,
    color: BrandColors.primarySoft,
    letterSpacing: 0.2,
  },
  previewList: {
    gap: BrandSpacing.xs,
  },
  previewButton: {
    borderRadius: BrandRadius.md,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  previewButtonText: {
    ...BrandTypography.button,
    color: BrandColors.text,
  },
  resetButton: {
    borderRadius: BrandRadius.md,
    backgroundColor: '#F4F6F3',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  resetButtonText: {
    ...BrandTypography.button,
    color: BrandColors.primaryDark,
  },
});
