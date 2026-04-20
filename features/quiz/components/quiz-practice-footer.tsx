import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';

import { BrandButton } from '@/components/brand/BrandButton';
import { MathText } from '@/components/math/MathText';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type { UsePracticeScreenResult } from '@/features/quiz/hooks/use-practice-screen';

type PracticeFeedback = NonNullable<UsePracticeScreenResult['feedback']>;

export type QuizPracticeFooterProps = Pick<
  UsePracticeScreenResult,
  | 'continueLabel'
  | 'feedback'
  | 'isPersistingAttempt'
  | 'onContinue'
  | 'onRetry'
  | 'onSelectChoice'
  | 'onSubmit'
  | 'persistErrorMessage'
  | 'selectedIndex'
> & {
  choiceCount: number;
  isCompactLayout: boolean;
  problemId: string;
};

export function QuizPracticeFooter({
  choiceCount,
  continueLabel,
  feedback,
  isCompactLayout,
  isPersistingAttempt,
  onContinue,
  onRetry,
  onSelectChoice,
  onSubmit,
  persistErrorMessage,
  problemId,
  selectedIndex,
}: QuizPracticeFooterProps) {
  if (!feedback) {
    const indices = Array.from({ length: choiceCount }, (_, i) => i);

    return (
      <View style={styles.panel}>
        <View accessibilityRole="radiogroup" style={styles.circleRow}>
          {indices.map((i) => {
            const isSelected = selectedIndex === i;
            return (
              <Pressable
                key={i}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${i + 1}번`}
                hitSlop={isCompactLayout ? { top: 2, bottom: 2, left: 2, right: 2 } : undefined}
                onPress={() => onSelectChoice(i)}
                style={[
                  styles.circle,
                  isCompactLayout && styles.circleCompact,
                  isSelected ? styles.circleSelected : styles.circleIdle,
                ]}>
                <Text
                  style={[
                    styles.circleText,
                    isCompactLayout && styles.circleTextCompact,
                    isSelected ? styles.circleTextSelected : styles.circleTextIdle,
                  ]}>
                  {i + 1}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <BrandButton
          disabled={selectedIndex === null}
          onPress={onSubmit}
          title="정답 확인"
        />
      </View>
    );
  }

  const actionTitle =
    feedback.kind === 'retry'
      ? '다시 도전'
      : feedback.kind === 'coaching'
        ? '이 포인트로 다시 풀기'
        : isPersistingAttempt
          ? '기록 저장 중...'
          : continueLabel;

  const actionVariant = feedback.kind === 'correct' ? 'success' : 'primary';

  const actionDisabled =
    (feedback.kind === 'correct' || feedback.kind === 'resolved') && isPersistingAttempt;

  return (
    <View
      style={[
        styles.panel,
        styles.feedbackPanel,
        feedback.kind === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong,
      ]}>
      <ScrollView
        style={styles.feedbackScroll}
        contentContainerStyle={styles.feedbackContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View
          key={`${problemId}_${feedback.kind}`}
          entering={FadeInDown.duration(220)}
          exiting={FadeOutUp.duration(180)}
          layout={LinearTransition.duration(180)}
          style={styles.feedbackBodyWrap}>
          {renderPracticeFeedback(feedback)}
        </Animated.View>
      </ScrollView>

      <BrandButton
        disabled={actionDisabled}
        onPress={feedback.kind === 'retry' || feedback.kind === 'coaching' ? onRetry : onContinue}
        title={actionTitle}
        variant={actionVariant}
      />

      {persistErrorMessage ? (
        <Text selectable style={styles.feedbackErrorText}>
          {persistErrorMessage}
        </Text>
      ) : null}
    </View>
  );
}

function renderPracticeFeedback(feedback: PracticeFeedback) {
  return (
    <>
      <Text style={styles.feedbackTitle}>{feedback.title}</Text>
      <MathText selectable text={feedback.body} style={styles.feedbackBody} />

      {feedback.kind === 'coaching' ? (
        <>
          <View style={styles.feedbackFocusCard}>
            <Text style={styles.feedbackSectionLabel}>{feedback.focusTitle}</Text>
            <MathText selectable text={feedback.focusBody} style={styles.feedbackFocusBody} />
          </View>
          <Text style={styles.feedbackSupportText}>{feedback.supportText}</Text>
        </>
      ) : null}

      {feedback.kind === 'resolved' ? (
        <>
          <View style={styles.feedbackAnswerCard}>
            <Text style={styles.feedbackSectionLabel}>{feedback.answerLabel}</Text>
            <MathText selectable text={feedback.answerText} style={styles.feedbackAnswerValue} />
          </View>
          <MathText selectable text={feedback.explanation} style={styles.feedbackBody} />
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 4,
  },
  circleRow: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompact: {
    width: 40,
    height: 40,
  },
  circleIdle: {
    borderWidth: 1.5,
    borderColor: '#D7D4CD',
    backgroundColor: '#FFFFFF',
  },
  circleSelected: {
    backgroundColor: BrandColors.primaryDark,
  },
  circleText: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    lineHeight: 22,
  },
  circleTextCompact: {
    fontSize: 16,
    lineHeight: 20,
  },
  circleTextIdle: {
    color: '#6B6560',
  },
  circleTextSelected: {
    color: '#FFFFFF',
  },
  feedbackPanel: {
    gap: 12,
  },
  feedbackCorrect: {
    backgroundColor: '#EEF9F1',
  },
  feedbackWrong: {
    backgroundColor: '#FFF9EE',
  },
  feedbackScroll: {
    width: '100%',
    flexShrink: 1,
  },
  feedbackContent: {
    flexGrow: 1,
  },
  feedbackBodyWrap: {
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    gap: 8,
  },
  feedbackTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.text,
  },
  feedbackBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  feedbackFocusCard: {
    borderWidth: 1,
    borderColor: '#E7D3A8',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6,
  },
  feedbackAnswerCard: {
    borderWidth: 1,
    borderColor: '#D9D1C2',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6,
  },
  feedbackSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A6A1E',
  },
  feedbackFocusBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  feedbackSupportText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#5B584F',
  },
  feedbackAnswerValue: {
    fontSize: 18,
    lineHeight: 24,
    color: BrandColors.text,
    fontWeight: '700',
  },
  feedbackErrorText: {
    fontSize: 13,
    lineHeight: 18,
    color: BrandColors.danger,
  },
});
