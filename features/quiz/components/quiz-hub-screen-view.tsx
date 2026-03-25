import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { JourneyBoard } from '@/features/quiz/components/journey-board';
import type { UseQuizHubScreenResult } from '@/features/quiz/hooks/use-quiz-hub-screen';
import { PosterTitleBanner } from '@/features/quiz/components/poster-title-banner';

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
  onPressJourneyCta,
  onRefresh,
  profile,
  session,
}: UseQuizHubScreenResult) {
  const insets = useSafeAreaInsets();
  const topPadding = insets.top + (isCompactLayout ? 14 : 24);
  const bottomPadding = insets.bottom + (isCompactLayout ? 8 : 12);

  if (!isReady) {
    return (
      <View style={styles.screen}>
        <View style={[styles.feedbackScreen, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>
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
        <View style={[styles.feedbackScreen, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>
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
      <View style={[styles.posterScreen, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>
        <JourneyScreenHero isCompactLayout={isCompactLayout} />
        {authNoticeMessage ? (
          <AuthNotice
            isCompactLayout={isCompactLayout}
            message={authNoticeMessage}
            onDismiss={onDismissAuthNotice}
          />
        ) : null}
        <JourneyBoard
          isCompactLayout={isCompactLayout}
          onPressCurrentStep={onPressJourneyCta}
          onPressCta={onPressJourneyCta}
          state={journey}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F2E7',
  },
  posterScreen: {
    flex: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
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
});
