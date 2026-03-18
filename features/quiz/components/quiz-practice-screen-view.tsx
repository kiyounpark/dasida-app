import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { MathText } from '@/components/math/MathText';
import { ProblemStatement } from '@/components/math/problem-statement';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import type { UsePracticeScreenResult } from '@/features/quiz/hooks/use-practice-screen';

export function QuizPracticeScreenView({
  activeProblem,
  continueLabel,
  feedback,
  isPersistingAttempt,
  onContinue,
  onRetry,
  onSelectChoice,
  onSubmit,
  onViewResult,
  persistErrorMessage,
  selectedIndex,
  weaknessLabel,
}: UsePracticeScreenResult) {
  if (!activeProblem) {
    return (
      <View style={styles.screen}>
        <BrandHeader compact />
        <View style={styles.emptyBody}>
          <View style={styles.emptyCard}>
            <Text style={styles.title}>연습 문제를 찾지 못했어요.</Text>
            <View style={styles.buttonTopGap}>
              <BrandButton title="결과로 돌아가기" onPress={onViewResult} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <BrandHeader />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>
        <View style={styles.problemCard}>
          <Text style={styles.title}>약점 기반 연습</Text>
          <Text style={styles.subtitle}>{weaknessLabel}</Text>
          <ProblemStatement question={activeProblem.question} />

          <View style={styles.choicesContainer}>
            {activeProblem.choices.map((choice, index) => {
              const isSelected = selectedIndex === index;
              return (
                <Pressable
                  key={`${activeProblem.id}_${index}`}
                  style={[styles.choiceButton, isSelected && styles.choiceButtonSelected]}
                  disabled={Boolean(feedback)}
                  onPress={() => onSelectChoice(index)}>
                  <MathText
                    text={choice}
                    style={[styles.choiceText, isSelected && styles.choiceTextSelected]}
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.buttonTopGap}>
            <BrandButton
              title="정답 확인"
              onPress={onSubmit}
              disabled={selectedIndex === null || !!feedback}
            />
          </View>
        </View>

        {feedback ? (
          <Animated.View
            key={`${activeProblem.id}_${feedback.kind}`}
            entering={FadeInDown.duration(220)}
            exiting={FadeOutUp.duration(180)}
            layout={LinearTransition.duration(180)}
            style={[
              styles.feedbackCard,
              feedback.kind === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong,
            ]}>
            <Text style={styles.feedbackTitle}>{feedback.title}</Text>
            <MathText text={feedback.body} style={styles.feedbackBody} />

            {feedback.kind === 'coaching' ? (
              <>
                <View style={styles.feedbackFocusCard}>
                  <Text style={styles.feedbackSectionLabel}>{feedback.focusTitle}</Text>
                  <MathText text={feedback.focusBody} style={styles.feedbackFocusBody} />
                </View>
                <Text style={styles.feedbackSupportText}>{feedback.supportText}</Text>
              </>
            ) : null}

            {feedback.kind === 'resolved' ? (
              <>
                <View style={styles.feedbackAnswerCard}>
                  <Text style={styles.feedbackSectionLabel}>{feedback.answerLabel}</Text>
                  <MathText text={feedback.answerText} style={styles.feedbackAnswerValue} />
                </View>
                <MathText text={feedback.explanation} style={styles.feedbackBody} />
              </>
            ) : null}

            <View style={styles.buttonTopGap}>
              {feedback.kind === 'retry' || feedback.kind === 'coaching' ? (
                <BrandButton
                  title={
                    feedback.kind === 'coaching' ? '이 포인트로 다시 풀기' : '다시 도전'
                  }
                  variant="primary"
                  onPress={onRetry}
                />
              ) : (
                <BrandButton
                  title={isPersistingAttempt ? '기록 저장 중...' : continueLabel}
                  variant={feedback.kind === 'correct' ? 'success' : 'primary'}
                  onPress={onContinue}
                  disabled={isPersistingAttempt}
                />
              )}
            </View>

            {persistErrorMessage ? (
              <Text selectable style={styles.feedbackErrorText}>
                {persistErrorMessage}
              </Text>
            ) : null}
          </Animated.View>
        ) : null}
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
  emptyBody: {
    flex: 1,
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: BrandSpacing.md,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    backgroundColor: '#fff',
    marginTop: BrandSpacing.md,
    padding: BrandSpacing.lg,
  },
  problemCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    backgroundColor: '#fff',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: BrandColors.text,
  },
  subtitle: {
    fontSize: 14,
    color: BrandColors.primarySoft,
    fontWeight: '700',
  },
  choicesContainer: {
    marginTop: 12,
    gap: 10,
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
    color: '#333',
    lineHeight: 24,
  },
  choiceTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  buttonTopGap: {
    marginTop: 20,
  },
  feedbackCard: {
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    padding: 14,
    gap: 8,
  },
  feedbackCorrect: {
    borderWidth: 1,
    borderColor: '#BFE2C7',
    backgroundColor: '#EEF9F1',
  },
  feedbackWrong: {
    borderWidth: 1,
    borderColor: '#E7D3A8',
    backgroundColor: '#FFF9EE',
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
