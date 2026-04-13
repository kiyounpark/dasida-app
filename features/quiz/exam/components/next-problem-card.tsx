// features/quiz/exam/components/next-problem-card.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandRadius } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import { FontFamilies } from '@/constants/typography';

type NextProblemCardProps = {
  nextProblemNumber: number | null; // null이면 마지막 문제
  onNext: () => void;
  onBackToResult: () => void;
};

export function NextProblemCard({
  nextProblemNumber,
  onNext,
  onBackToResult,
}: NextProblemCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(280).withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })}
      style={styles.card}>
      {nextProblemNumber !== null ? (
        <>
          <Text style={styles.label}>이 문제 분석을 완료했어요.</Text>
          <Pressable
            style={styles.nextButton}
            onPress={onNext}
            accessibilityRole="button">
            <Text style={styles.nextButtonText}>
              다음 문제 분석하기 · {nextProblemNumber}번 →
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.doneLabel}>🎉 모든 오답 분석 완료!</Text>
          <Text style={styles.label}>고생했어요. 분석 결과를 확인해보세요.</Text>
          <Pressable
            style={styles.resultButton}
            onPress={onBackToResult}
            accessibilityRole="button">
            <Text style={styles.resultButtonText}>채점 결과로 돌아가기</Text>
          </Pressable>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DiagnosisTheme.panel,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: DiagnosisTheme.line,
    padding: 16,
    gap: 10,
    marginLeft: 36,
  },
  label: {
    fontSize: 13,
    color: DiagnosisTheme.inkMuted,
    lineHeight: 19,
  },
  doneLabel: {
    fontSize: 16,
    fontFamily: FontFamilies.bold,
    color: DiagnosisTheme.ink,
  },
  nextButton: {
    backgroundColor: '#2e7d32',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    paddingVertical: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 15,
    fontFamily: FontFamilies.bold,
    color: '#FFFFFF',
  },
  resultButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: DiagnosisTheme.line,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resultButtonText: {
    fontSize: 14,
    fontFamily: FontFamilies.medium,
    color: DiagnosisTheme.ink,
  },
});
