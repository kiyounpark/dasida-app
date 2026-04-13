// features/quiz/exam/components/exam-problem-card.tsx
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { BrandRadius } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import type { ExamProblemType } from '@/features/quiz/data/exam-problems';
import examImages from '@/features/quiz/data/exam-images';

type ExamProblemCardProps = {
  imageKey: string;        // '{examId}/{number}' format, e.g. 'g3-geom-mock-2024-09/5'
  userAnswer: number;      // 오답 번호 (빨강)
  correctAnswer: number;   // 정답 번호 (초록)
  problemType: ExamProblemType;
};

export function ExamProblemCard({
  imageKey,
  userAnswer,
  correctAnswer,
  problemType,
}: ExamProblemCardProps) {
  const imageSource = examImages[imageKey];

  return (
    <View style={styles.card}>
      <Image
        source={imageSource}
        style={styles.image}
        contentFit="contain"
      />
      {problemType === 'multiple_choice' && (
        <View style={styles.answerSection}>
          <View style={styles.circleRow}>
            {[1, 2, 3, 4, 5].map((n) => {
              const isUserAnswer = n === userAnswer;
              const isCorrect = n === correctAnswer;
              return (
                <View
                  key={n}
                  style={[
                    styles.circle,
                    isCorrect && styles.circleCorrect,
                    isUserAnswer && !isCorrect && styles.circleWrong,
                    !isCorrect && !isUserAnswer && styles.circleDefault,
                  ]}>
                  <Text
                    style={[
                      styles.circleText,
                      (isCorrect || (isUserAnswer && !isCorrect)) && styles.circleTextFilled,
                    ]}>
                    {n}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#c0392b' }]} />
              <Text style={styles.legendText}>내 답 {userAnswer}번</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2e7d32' }]} />
              <Text style={styles.legendText}>정답 {correctAnswer}번</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(41,59,39,0.08)',
    overflow: 'hidden',
    boxShadow: '0 4px 14px rgba(36,52,38,0.09)',
  },
  image: {
    width: '100%',
    aspectRatio: 1.5,
  },
  answerSection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  circleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDefault: {
    borderWidth: 1.5,
    borderColor: '#D7D4CD',
    backgroundColor: '#FFFFFF',
  },
  circleCorrect: {
    backgroundColor: '#2e7d32',
  },
  circleWrong: {
    backgroundColor: '#c0392b',
  },
  circleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B6560',
  },
  circleTextFilled: {
    color: '#FFFFFF',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  legendText: {
    fontSize: 11,
    color: DiagnosisTheme.inkMuted,
  },
});
