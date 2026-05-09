import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
import {
  ExamAnalysisResumeCarousel,
  type ExamAnalysisResumeCarouselItem,
} from '@/features/quiz/exam/components/exam-analysis-resume-carousel';
import { JourneyHubRightPanel } from '@/features/quiz/components/journey-hub-right-panel';
import { JourneyHubSplitLayout } from '@/features/quiz/components/journey-hub-split-layout';

function JourneyScreenHero({
  isCompactLayout,
  isTablet,
}: {
  isCompactLayout: boolean;
  isTablet: boolean;
}) {
  return <PosterTitleBanner isCompactLayout={isCompactLayout} isTablet={isTablet} title="학습 여정" />;
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
  analysisState,
  authNoticeMessage,
  getExamTitle,
  homeState,
  isCompactLayout,
  isReady,
  journey,
  onDismissAuthNotice,
  onPressExam,
  onPressJourneyCta,
  onPressReviewCard,
  onRefresh,
  onResumeAnalysis,
  profile,
  session,
  showAnalysisResumeCard,
  showBrandHeader,
  showJourneyHero,
  showJourneyBoard,
  showNoReviewDayCard,
  showReviewHomeCard,
  showWeaknessSection,
}: UseQuizHubScreenResult) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isTablet = useIsTablet();
  const tabletContainerMaxWidth = isTablet ? Math.min(screenWidth * 0.92, 1040) : undefined;
  const insets = useSafeAreaInsets();
  const [heroLayoutBottom, setHeroLayoutBottom] = useState(0);
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

  // CTA 버튼은 SVG 이미지 비율(1497:373)을 따른다. 70% × screenWidth 또는 maxWidth(폰 340/태블릿 480) 중 작은 값.
  // 보드의 가용 높이를 산출할 때 이 추정 높이만큼을 미리 빼둔다.
  // 아래 maxWidth(340/480)는 styles.ctaFooterButton과 ctaFooter 인라인 maxWidth(480)에 맞춰져야 한다 — 한쪽만 바꾸면 STEP 4가 다시 잘릴 수 있음.
  const ctaButtonAspectRatio = 1497 / 373;
  const ctaButtonMaxWidth = isTablet ? 480 : 340;
  const ctaButtonRenderedWidth = Math.min(screenWidth * 0.7, ctaButtonMaxWidth);
  const ctaButtonEstimatedHeight = ctaButtonRenderedWidth / ctaButtonAspectRatio;
  const ctaFooterHeight =
    showJourneyBoard
      ? 4 /* paddingTop */ + ctaButtonEstimatedHeight + insets.bottom + (isCompactLayout ? 24 : 28)
      : 0;

  // heroLayoutBottom이 0(첫 렌더, onLayout 전)이면 0을 전달해 JourneyBoard가 width-only로 동작하게 한다.
  // onLayout 후 heroLayoutBottom이 채워지면 정상 height 제약이 적용된다.
  const boardAvailableHeight =
    heroLayoutBottom === 0
      ? 0
      : Math.max(
          0,
          screenHeight - heroLayoutBottom - ctaFooterHeight - scrollTopPadding - bottomPadding,
        );

  const useTabletSplitLayout =
    isTablet &&
    isReady &&
    !!profile &&
    !!homeState &&
    !!session &&
    !!journey &&
    showJourneyBoard;

  if (!isReady) {
    return (
      <View style={styles.screen}>
        <View style={[styles.feedbackScreen, { paddingTop: posterTopPadding, paddingBottom: bottomPadding }]}>
          <JourneyScreenHero isCompactLayout={isCompactLayout} isTablet={isTablet} />
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
          <JourneyScreenHero isCompactLayout={isCompactLayout} isTablet={isTablet} />
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

  if (useTabletSplitLayout) {
    const analysisResumeItems = analysisState.isInProgress
      ? analysisState.items.map<ExamAnalysisResumeCarouselItem>((item) => ({
          attemptId: item.attemptId,
          examTitle: getExamTitle(item.examId),
          noteCount: item.noteCount,
          totalNotes: item.totalNotes,
        }))
      : [];

    return (
      <View style={styles.screen}>
        {showBrandHeader ? <BrandHeader compact /> : null}
        <JourneyHubSplitLayout
          posterBanner={
            <JourneyScreenHero isCompactLayout={isCompactLayout} isTablet={isTablet} />
          }
          authNotice={
            authNoticeMessage ? (
              <AuthNotice
                isCompactLayout={isCompactLayout}
                message={authNoticeMessage}
                onDismiss={onDismissAuthNotice}
              />
            ) : null
          }
          leftBoard={(containerWidth) => (
            <JourneyBoard
              availableHeight={0}
              containerWidth={containerWidth}
              isCompactLayout={isCompactLayout}
              onPressCurrentStep={onPressJourneyCta}
              state={journey!}
            />
          )}
          rightPanel={
            <JourneyHubRightPanel
              analysisResumeItems={analysisResumeItems}
              ctaLabel={journey!.ctaLabel}
              isCompactLayout={isCompactLayout}
              onPressCta={onPressJourneyCta}
              onResumeAnalysis={onResumeAnalysis}
              showAnalysisResume={showAnalysisResumeCard}
              stepKey={journey!.currentStepKey}
            />
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {showBrandHeader ? <BrandHeader compact /> : null}
      {showJourneyHero ? (
        <View
          style={[styles.heroHeader, { paddingTop: heroContainerPaddingTop }]}
          onLayout={(e) => {
            const { y, height } = e.nativeEvent.layout;
            setHeroLayoutBottom(y + height);
          }}>
          <JourneyScreenHero isCompactLayout={isCompactLayout} isTablet={isTablet} />
        </View>
      ) : null}
      {authNoticeMessage ? (
        <View
          style={[
            styles.outerNotice,
            showJourneyHero && heroLayoutBottom > 0 && styles.outerNoticeOverlay,
            showJourneyHero && heroLayoutBottom > 0 && { top: heroLayoutBottom + 14 },
          ]}>
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
          isTablet && { maxWidth: tabletContainerMaxWidth },
          isTablet && styles.posterScreenTabletSpacing,
          {
            paddingTop: scrollTopPadding,
            paddingBottom: bottomPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        {!showAnalysisResumeCard ? (
          <>
            {showReviewHomeCard && homeState?.nextReviewTask ? (
              <ReviewHomeCard task={homeState.nextReviewTask} onPress={onPressReviewCard} />
            ) : null}
            {showNoReviewDayCard ? (
              <NoReviewDayCard nextTask={homeState.nextReviewTask!} onPressExam={onPressExam} />
            ) : null}
            {showJourneyBoard ? (
              <JourneyBoard
                availableHeight={boardAvailableHeight}
                isCompactLayout={isCompactLayout}
                onPressCurrentStep={onPressJourneyCta}
                state={journey}
              />
            ) : null}
            {showWeaknessSection && homeState ? (
              <HomeWeaknessSection homeState={homeState} />
            ) : null}
          </>
        ) : (
          <>
            {/* 분석 진행 중 모드: 복습이 있으면 최상단 */}
            {showReviewHomeCard && homeState?.nextReviewTask ? (
              <ReviewHomeCard task={homeState.nextReviewTask} onPress={onPressReviewCard} />
            ) : null}
            {showAnalysisResumeCard && analysisState.isInProgress ? (
              <ExamAnalysisResumeCarousel
                items={analysisState.items.map<ExamAnalysisResumeCarouselItem>((item) => ({
                  attemptId: item.attemptId,
                  examTitle: getExamTitle(item.examId),
                  noteCount: item.noteCount,
                  totalNotes: item.totalNotes,
                }))}
                onPressItem={onResumeAnalysis}
              />
            ) : null}
            {showWeaknessSection && homeState ? (
              <HomeWeaknessSection homeState={homeState} />
            ) : null}
          </>
        )}
      </ScrollView>
      {showJourneyBoard ? (
        <View style={[styles.ctaFooter, { paddingBottom: insets.bottom + (isCompactLayout ? 24 : 28) }]}>
          <JourneyCtaButton
            compact={isCompactLayout}
            label={journey.ctaLabel}
            onPress={onPressJourneyCta}
            style={[styles.ctaFooterButton, isTablet && { maxWidth: 600 }]}
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
    width: '100%',
    alignSelf: 'center',
  },
  posterScreenTabletSpacing: {
    gap: 20,
    paddingHorizontal: 24,
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
    alignItems: 'center',
    marginTop: 14,
    zIndex: 10,
  },
  outerNoticeOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginTop: 0,
    elevation: 10,
  },
});
