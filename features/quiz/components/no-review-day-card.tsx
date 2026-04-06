import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type { ActiveReviewTaskSummary } from '@/features/learner/types';

function getDaysUntil(scheduledFor: string): number {
  const todayStr = new Date().toISOString().slice(0, 10);
  const today = new Date(todayStr);
  const target = new Date(scheduledFor.slice(0, 10));
  const diffMs = target.getTime() - today.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

type Props = {
  nextTask: ActiveReviewTaskSummary;
  onPressExam: () => void;
};

export function NoReviewDayCard({ nextTask, onPressExam }: Props) {
  const daysUntil = getDaysUntil(nextTask.scheduledFor);
  const pillText = `오늘은 복습 없는 날이에요 · 다음 복습 D-${daysUntil}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{pillText}</Text>
      </View>
      <View style={styles.examCard}>
        <Text style={styles.examTag}>오늘 복습 없음 · 실력 확인 추천</Text>
        <Text style={styles.examTitle}>잠깐 실력 확인해볼까요?</Text>
        <Text style={styles.examBody}>
          복습 사이 여유 있을 때 풀어보면 성장 곡선이 보입니다.
        </Text>
        <Pressable style={styles.examBtn} onPress={onPressExam} accessibilityLabel="모의고사 시작하기">
          <Text style={styles.examBtnText}>모의고사 시작하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 460,
    gap: BrandSpacing.sm,
  },
  pill: {
    backgroundColor: 'rgba(255, 252, 247, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.12)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'stretch',
  },
  pillText: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    color: BrandColors.mutedText,
    textAlign: 'center',
  },
  examCard: {
    backgroundColor: '#1C2C19',
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  examTag: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: 'rgba(246, 242, 231, 0.5)',
  },
  examTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 18,
    lineHeight: 26,
    color: '#F6F2E7',
  },
  examBody: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(246, 242, 231, 0.6)',
  },
  examBtn: {
    marginTop: BrandSpacing.xs,
    backgroundColor: '#F6F2E7',
    borderRadius: BrandRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  examBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    color: '#1C2C19',
  },
});
