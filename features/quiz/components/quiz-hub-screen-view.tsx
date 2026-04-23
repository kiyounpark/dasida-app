import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsTablet } from '@/hooks/use-is-tablet';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { JourneyBoard } from '@/features/quiz/components/journey-board';
import { JourneyCtaButton } from '@/features/quiz/components/journey-cta-button';
import { NoReviewDayCard } from '@/features/quiz/components/no-review-day-card';
import { ReviewHomeCard } from '@/features/quiz/components/review-home-card';
import type { UseQuizHubScreenResult } from '@/features/quiz/hooks/use-quiz-hub-screen';
import { PosterTitleBanner } from '@/features/quiz/components/poster-title-banner';
import { HomeWeaknessSection } from '@/features/quiz/components/home-weakness-section';

function JourneyScreenHero({ isCompactLayout }: { isCompactLayout: boolean }) {
  return <PosterTitleBanner isCompactLayout={isCompactLayout} title="학습 여정" />;
}

function FeedbackCard({
  actionLabel,
  body,
  onPress,
  title,
}: {
  actionLabel?: string;
  body: string;
  onPress?: () => void;
  title: string;
}) {
  return (
    <View style={styles.feedbackCard}>
      <Text selectable style={styles.feedbackTitle}>
        {title}
      </Text>
      <Text selectable style={styles.feedbackBody}>
        {body}
      </Text>
      {actionLabel && onPress ? (
        <Pressable style={styles.retryButton} onPress={onPress}>
          <Text selectable style={styles.retryButtonText}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AuthNotice({
  isCompactLayout,
  message,
  onDismiss,
}: {
  isCompactLayout: boolean;
  message: string;
  onDismiss: () => void;
}) {
  return (
    <View style={[styles.noticePill, isCompactLayout && styles.noticePillCompact]}>
      <Text
        selectable
        numberOfLines={2}
        style={[styles.noticePillText, isCompactLayout && styles.noticePillTextCompact]}>
        {message}
      </Text>
      <Pressable hitSlop={8} onPress={onDismiss} style={styles.noticeDismiss}>
        <Text selectable style={styles.noticeDismissText}>
          닫기
        </Text>
      </Pressable>
    </View>
  );
}

export function QuizHubScreenView({
  authNoticeMessage,
  homeState,
  isCompactLayout,
  isReady,
  journey,
  onDismissAuthNotice,
  onPressExam,
  onPressJourneyCta,
  onPressReviewCard,
  onRefresh,
  profile,
  session,
  showBrandHeader,
  showJourneyHero,
  showJourneyBoard,
  showNoReviewDayCard,
  showReviewHomeCard,
  showWeaknessSection,
}: UseQuizHubScreenResult) {
  const isTablet = useIsTablet();
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom + (isCompactLayout ? 8 : 12);
  // poster-title-banner.tsx heroFrameWrapRaised(d) translateY(-32/-24)에 맞춰야 함
  const bannerRaise = isCompactLayout ? 24 : 32;
  // BrandHeader가 SafeAreaView edges={['top']}으로 insets.top을 처리하므로
  // 졸업 후 상태에서는 insets.top을 제외한 콘텐츠 간격만 적용
  const posterTopPadding = showBrandHeader
    ? (isCompactLayout ? 14 : 24)
    : insets.top + (isCompactLayout ? 14 : 24) + bannerRaise;
  // Hero가 ScrollView 밖에 있으므로 Hero 컨테이너가 insets + bannerRaise를 담당한다.
  const heroContainerPaddingTop = insets.top + (isCompactLayout ? 14 : 24) + bannerRaise;
  // ScrollView는 Hero 아래 gap(14)만 갖는다 (졸업 후는 기존 brandHeader 케이스 그대로).
  const scrollTopPadding = showJourneyHero
    ? 14
    : (isCompactLayout ? 14 : 24);

  if (!isReady) {
    return (
      <View style={styles.screen}>
        <View style={[styles.feedbackScreen, { paddingTop: posterTopPadding, paddingBottom: bottomPadding }]}>
          <JourneyScreenHero isCompactLayout={isCompactLayout} />
          <FeedbackCard
            title="학습 여정을 준비 중이에요"
            body="지금 할 일과 최근 흐름을 여정판으로 정리하고 있습니다."
          />
        </View>
      </View>
    );
  }

  if (!profile || !homeState || !session || !journey) {
    return (
      <View style={styles.screen}>
        <View style={[styles.feedbackScreen, { paddingTop: posterTopPadding, paddingBottom: bottomPadding }]}>
          <JourneyScreenHero isCompactLayout={isCompactLayout} />
          <FeedbackCard
            title="홈 상태를 다시 불러와야 해요"
            body="현재 학습자 상태를 완전히 복원하지 못했습니다. 한 번 더 불러오면 대부분 바로 해결됩니다."
            actionLabel="다시 불러오기"
            onPress={() => void onRefresh()}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {showBrandHeader ? <BrandHeader compact /> : null}
      {showJourneyHero ? (
        <View style={[styles.heroHeader, { paddingTop: heroContainerPaddingTop }]}>
          <JourneyScreenHero isCompactLayout={isCompactLayout} />
        </View>
      ) : null}
      {authNoticeMessage ? (
        <View style={styles.outerNotice}>
          <AuthNotice
            isCompactLayout={isCompactLayout}
            message={authNoticeMessage}
            onDismiss={onDismissAuthNotice}
          />
        </View>
      ) : null}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.posterScreen,
          isTablet && styles.tabletPosterScreen,
          {
            paddingTop: scrollTopPadding,
            paddingBottom: bottomPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        {showReviewHomeCard && homeState?.nextReviewTask ? (
          <ReviewHomeCard
            task={homeState.nextReviewTask}
            onPress={onPressReviewCard}
          />
        ) : null}
        {showNoReviewDayCard ? (
          <NoReviewDayCard
            nextTask={homeState.nextReviewTask!}
            onPressExam={onPressExam}
          />
        ) : null}
        {showJourneyBoard ? (
          <JourneyBoard
            isCompactLayout={isCompactLayout}
            onPressCurrentStep={onPressJourneyCta}
            state={journey}
          />
        ) : null}
        {showWeaknessSection && homeState ? (
          <HomeWeaknessSection homeState={homeState} />
        ) : null}
      </ScrollView>
      {showJourneyBoard ? (
        <View style={[styles.ctaFooter, { paddingBottom: insets.bottom + (isCompactLayout ? 24 : 28) }]}>
          <JourneyCtaButton
            compact={isCompactLayout}
            label={journey.ctaLabel}
            onPress={onPressJourneyCta}
            style={styles.ctaFooterButton}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F2E7',
  },
  scrollView: {
    flex: 1,
  },
  posterScreen: {
    flexGrow: 1,
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
  },
  feedbackScreen: {
    flex: 1,
    paddingHorizontal: BrandSpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: BrandSpacing.lg,
  },
  noticePill: {
    width: '100%',
    maxWidth: 460,
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrandSpacing.xs,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 252, 247, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.12)',
  },
  noticePillCompact: {
    paddingVertical: 7,
  },
  noticePillText: {
    flex: 1,
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    color: BrandColors.mutedText,
  },
  noticePillTextCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  noticeDismiss: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  noticeDismissText: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    lineHeight: 14,
    color: BrandColors.primaryDark,
  },
  feedbackCard: {
    width: '100%',
    maxWidth: 430,
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.12)',
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 252, 247, 0.96)',
    padding: BrandSpacing.xl,
    gap: BrandSpacing.xs,
    boxShadow: '0 18px 32px rgba(28, 44, 25, 0.06)',
  },
  feedbackTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 22,
    lineHeight: 30,
    color: BrandColors.text,
    textAlign: 'center',
  },
  feedbackBody: {
    fontFamily: FontFamilies.regular,
    fontSize: 15,
    lineHeight: 24,
    color: BrandColors.mutedText,
    textAlign: 'center',
  },
  retryButton: {
    alignSelf: 'center',
    marginTop: BrandSpacing.sm,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: BrandRadius.lg,
    backgroundColor: BrandColors.primary,
  },
  retryButtonText: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  tabletPosterScreen: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  ctaFooter: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  ctaFooterButton: {
    width: '70%',
    maxWidth: 340,
  },
  heroHeader: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  outerNotice: {
    width: '100%',
    paddingHorizontal: 14,
  },
});
