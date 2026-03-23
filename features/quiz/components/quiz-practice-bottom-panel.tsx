import { ScrollView, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandButton } from '@/components/brand/BrandButton';
import { MathText } from '@/components/math/MathText';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { getQuizBottomPanelMaxHeight } from '@/features/quiz/components/quiz-solve-layout';
import type { UsePracticeScreenResult } from '@/features/quiz/hooks/use-practice-screen';

type PracticeFeedback = NonNullable<UsePracticeScreenResult['feedback']>;

export type QuizPracticeBottomPanelProps = Pick<
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
  activeProblem: NonNullable<UsePracticeScreenResult['activeProblem']>;
  isCompactLayout: boolean;
};

export function QuizPracticeBottomPanel({
  activeProblem,
  continueLabel,
  feedback,
  isCompactLayout,
  isPersistingAttempt,
  onContinue,
  onRetry,
  onSelectChoice,
  onSubmit,
  persistErrorMessage,
  selectedIndex,
}: QuizPracticeBottomPanelProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const panelMaxHeight = getQuizBottomPanelMaxHeight(height, isCompactLayout);
  const panelBottomPadding = Math.max(insets.bottom, 12);

  if (!feedback) {
    return (
      <View style={[styles.panel, { paddingBottom: panelBottomPadding }]}>
        <ScrollView
          key={activeProblem.id}
          style={[styles.choiceScroll, { maxHeight: panelMaxHeight }]}
          contentContainerStyle={styles.choiceContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {activeProblem.choices.map((choice, index) => {
            const isSelected = selectedIndex === index;

            return (
              <Pressable
                key={`${activeProblem.id}_${index}`}
                style={[styles.choiceButton, isSelected ? styles.choiceButtonSelected : null]}
                onPress={() => onSelectChoice(index)}>
                <MathText
                  selectable
                  text={choice}
                  style={[styles.choiceText, isSelected ? styles.choiceTextSelected : null]}
                />
              </Pressable>
            );
          })}
        </ScrollView>

        <BrandButton title="정답 확인" onPress={onSubmit} disabled={selectedIndex === null} />
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

  const actionVariant =
    feedback.kind === 'correct'
      ? 'success'
      : feedback.kind === 'resolved'
        ? 'primary'
        : 'primary';

  const actionDisabled = feedback.kind === 'correct' || feedback.kind === 'resolved'
    ? isPersistingAttempt
    : false;

  return (
    <View
      style={[
        styles.panel,
        styles.feedbackPanel,
        feedback.kind === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong,
        { paddingBottom: panelBottomPadding },
      ]}>
      <ScrollView
        style={[styles.feedbackScroll, { maxHeight: panelMaxHeight }]}
        contentContainerStyle={styles.feedbackContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View
          key={`${activeProblem.id}_${feedback.kind}`}
          entering={FadeInDown.duration(220)}
          exiting={FadeOutUp.duration(180)}
          layout={LinearTransition.duration(180)}
          style={styles.feedbackBodyWrap}>
          {renderPracticeFeedback(feedback)}
        </Animated.View>
      </ScrollView>

      <BrandButton
        title={actionTitle}
        variant={actionVariant}
        onPress={feedback.kind === 'retry' || feedback.kind === 'coaching' ? onRetry : onContinue}
        disabled={actionDisabled}
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
    gap: 16,
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: BrandSpacing.md,
  },
  choiceScroll: {
    width: '100%',
  },
  choiceContent: {
    gap: 10,
    paddingBottom: 4,
  },
  choiceButton: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  choiceButtonSelected: {
    borderColor: BrandColors.primarySoft,
    backgroundColor: BrandColors.primarySoft,
  },
  choiceText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
  },
  choiceTextSelected: {
    color: '#fff',
    fontWeight: '700',
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
