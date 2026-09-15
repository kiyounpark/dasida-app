import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsTablet } from '@/hooks/use-is-tablet';

import { PageContainer } from '@/components/layout/page-container';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { HomeReviewList } from '@/features/quiz/components/home-review-list';
import { NoReviewDayCard } from '@/features/quiz/components/no-review-day-card';
import { PhotoEntryCard } from './photo-entry-card';
import type { UseQuizHubScreenResult } from '@/features/quiz/hooks/use-quiz-hub-screen';
import { HomeWeaknessSection } from '@/features/quiz/components/home-weakness-section';
import {
  ExamAnalysisResumeCarousel,
  type ExamAnalysisResumeCarouselItem,
} from '@/features/quiz/exam/components/exam-analysis-resume-carousel';

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

/**
 * 홈. "오늘 복습할 것"이 주인공이다 (🔒 2026.09.15 결정 B).
 *
 * 골격 3개:
 *  - 실모 분석 중  → 사진 카드 + 이어하기 캐러셀
 *  - 오늘 복습 있음 → 복습 리스트(끝에 사진 한 줄)
 *  - 그 외        → (오늘 차례 아니면 복습없는날 카드 +) 사진 카드
 *
 * 걷어낸 것: 여정보드 4노드 · 하단 CTA · "학습 여정" 포스터 배너 · 태블릿 split 레이아웃.
 * 전부 10문제 진단을 출발칸으로 삼던 구조라 진단이 사라지면서 같이 뜻을 잃었다.
 */
export function QuizHubScreenView({
  analysisState,
  authNoticeMessage,
  getExamTitle,
  homeState,
  isCompactLayout,
  isReady,
  onDismissAuthNotice,
  onPressExam,
  onPressPhoto,
  onPressReviewTask,
  onRefresh,
  onResumeAnalysis,
  profile,
  session,
  showAnalysisResumeCard,
  showNoReviewDayCard,
  showWeaknessSection,
  today,
}: UseQuizHubScreenResult) {
  const isTablet = useIsTablet();
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom + (isCompactLayout ? 8 : 12);
  const topPadding = isCompactLayout ? 14 : 24;

  if (!isReady) {
    return (
      <View style={styles.screen}>
        <BrandHeader compact />
        <View style={[styles.feedbackScreen, { paddingBottom: bottomPadding }]}>
          <FeedbackCard
            title="오늘 복습할 것을 불러오는 중이에요"
            body="지금 차례가 된 복습을 정리하고 있습니다."
          />
        </View>
      </View>
    );
  }

  if (!profile || !homeState || !session || !today) {
    return (
      <View style={styles.screen}>
        <BrandHeader compact />
        <View style={[styles.feedbackScreen, { paddingBottom: bottomPadding }]}>
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
      <BrandHeader compact />
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
          { paddingTop: topPadding, paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}>
        <PageContainer
          variant="hub"
          style={[styles.posterScreenInner, isTablet && styles.posterScreenTabletSpacing]}>
          {showAnalysisResumeCard ? (
            <>
              {/* 분석 진행 중: 사진 문은 큰 카드로 남긴다 — 이어하기와 경쟁하지 않는다 */}
              <PhotoEntryCard onPress={onPressPhoto} />
              {analysisState.isInProgress ? (
                <ExamAnalysisResumeCarousel
                  items={analysisResumeItems}
                  onPressItem={onResumeAnalysis}
                />
              ) : null}
            </>
          ) : today.mode === 'review' ? (
            <HomeReviewList
              title={today.title}
              body={today.body}
              tasks={today.dueTasks}
              onPressTask={onPressReviewTask}
              onPressPhoto={onPressPhoto}
            />
          ) : (
            <>
              {showNoReviewDayCard && today.nextTask ? (
                // 이 카드가 이미 "오늘은 복습 없는 날이에요 · 다음 복습 D-N"을 말한다.
                // 같은 말을 위에 또 얹지 않는다.
                <NoReviewDayCard nextTask={today.nextTask} onPressExam={onPressExam} />
              ) : (
                // 사진 카드는 사진 얘기만 한다. 홈이 복습 앱의 홈이라는 걸
                // 화면에서 말해주는 건 여기 한 줄뿐이다.
                <View
                  testID="home-today-heading"
                  style={[styles.todayHeading, isTablet && { maxWidth: undefined }]}>
                  <Text selectable style={styles.todayTitle}>
                    {today.title}
                  </Text>
                  <Text selectable style={styles.todayBody}>
                    {today.body}
                  </Text>
                </View>
              )}
              <PhotoEntryCard onPress={onPressPhoto} />
            </>
          )}
          {showWeaknessSection ? <HomeWeaknessSection homeState={homeState} /> : null}
        </PageContainer>
      </ScrollView>
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
  },
  posterScreenInner: {
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
  posterScreenTabletSpacing: {
    gap: 20,
    paddingHorizontal: 24,
  },
  // HomeReviewList의 제목/본문과 같은 크기를 쓴다 — 복습이 생기면 이 자리를 리스트가 물려받는다.
  todayHeading: {
    width: '100%',
    maxWidth: 430,
    gap: 2,
  },
  todayTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 20,
    lineHeight: 28,
    color: BrandColors.text,
  },
  todayBody: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
    color: BrandColors.mutedText,
  },
  outerNotice: {
    width: '100%',
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 14,
    zIndex: 10,
  },
});
