import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  onContinue,
  onRetry,
  onSelectChoice,
  onSubmit,
  onViewResult,
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
          <View
            style={[
              styles.feedbackCard,
              feedback.kind === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong,
            ]}>
            <Text style={styles.feedbackTitle}>
              {feedback.kind === 'correct' ? '정답입니다!' : '오답입니다. 힌트를 확인해 주세요.'}
            </Text>
            <MathText text={feedback.message} style={styles.feedbackBody} />

            <View style={styles.buttonTopGap}>
              {feedback.kind === 'wrong' ? (
                <BrandButton
                  title="다시 도전"
                  variant="danger"
                  onPress={onRetry}
                />
              ) : (
                <BrandButton
                  title={continueLabel}
                  variant="success"
                  onPress={onContinue}
                />
              )}
            </View>
          </View>
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
    backgroundColor: '#fff',
    marginTop: BrandSpacing.md,
    padding: BrandSpacing.lg,
  },
  problemCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
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
    borderColor: '#F2B8B8',
    backgroundColor: '#FFF4F4',
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
});
