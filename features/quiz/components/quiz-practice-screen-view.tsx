import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { ProblemStatement } from '@/components/math/problem-statement';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { QuizPracticeBottomPanel } from '@/features/quiz/components/quiz-practice-bottom-panel';
import { QuizSolveLayout } from '@/features/quiz/components/quiz-solve-layout';
import type { UsePracticeScreenResult } from '@/features/quiz/hooks/use-practice-screen';

export function QuizPracticeScreenView({
  activeProblem,
  canGraduate,
  continueLabel,
  emptyActionLabel,
  emptyTitle,
  feedback,
  isGraduating,
  isPersistingAttempt,
  onContinue,
  onGraduate,
  onRetry,
  onSelectChoice,
  onSubmit,
  onViewResult,
  persistErrorMessage,
  screenTitle,
  selectedIndex,
  weaknessLabel,
}: UsePracticeScreenResult) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompactLayout = width < 390 || height < 780;

  if (!activeProblem) {
    return (
      <View style={styles.screen}>
        <BrandHeader compact />
        <View style={styles.emptyBody}>
          <View style={styles.emptyCard}>
            <Text style={styles.title}>{emptyTitle}</Text>
            <View style={styles.buttonTopGap}>
              <BrandButton title={emptyActionLabel} onPress={onViewResult} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <QuizSolveLayout
        body={
          <View style={styles.problemCard}>
            <Text style={styles.title}>{screenTitle}</Text>
            <Text style={styles.subtitle}>{weaknessLabel}</Text>
            <ProblemStatement question={activeProblem.question} />
          </View>
        }
        bodyContentContainerStyle={styles.container}
        footer={
          <QuizPracticeBottomPanel
            activeProblem={activeProblem}
            continueLabel={continueLabel}
            feedback={feedback}
            isCompactLayout={isCompactLayout}
            isPersistingAttempt={isPersistingAttempt}
            onContinue={onContinue}
            onRetry={onRetry}
            onSelectChoice={onSelectChoice}
            onSubmit={onSubmit}
            persistErrorMessage={persistErrorMessage}
            selectedIndex={selectedIndex}
          />
        }
        header={<BrandHeader />}
        screenBackgroundColor={BrandColors.background}
      />
      {canGraduate ? (
        <View style={[styles.graduateBar, { paddingBottom: insets.bottom + BrandSpacing.lg }]}>
          <BrandButton
            title={isGraduating ? '저장 중...' : '약점 연습 완료하기'}
            variant="neutral"
            onPress={onGraduate}
            disabled={isGraduating}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
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
  buttonTopGap: {
    marginTop: 20,
  },
  graduateBar: {
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: BrandSpacing.sm,
    backgroundColor: BrandColors.background,
  },
});
