// features/quiz/components/review-home-card.tsx
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { diagnosisMap } from '@/data/diagnosisMap';
import { formatReviewStageLabel } from '@/features/learning/review-stage';
import type { ActiveReviewTaskSummary } from '@/features/learner/types';

const MEMORY_RETENTION_PCT: Record<string, number> = {
  day1: 70,
  day3: 50,
  day7: 35,
  day30: 20,
};

const TIMER_SECONDS = 10;

type Props = {
  task: ActiveReviewTaskSummary;
  onPress: () => void;
};

export function ReviewHomeCard({ task, onPress }: Props) {
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [ready, setReady] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 타이머 자동 시작
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 빨간 점 pulse 애니메이션
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 750, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const weaknessLabel = diagnosisMap[task.weaknessId]?.labelKo ?? task.weaknessId;
  const stageLabel = formatReviewStageLabel(task.stage);
  const retentionPct = MEMORY_RETENTION_PCT[task.stage] ?? 50;
  const timerDisplay = ready ? '✓' : String(timeLeft);
  const timerColor = timeLeft <= 3 ? BrandColors.success : BrandColors.danger;

  return (
    <View style={styles.card}>
      {/* 상단 배지 */}
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
          <Text style={styles.badgeText}>오늘 안 하면 리셋</Text>
        </View>
        <View style={styles.stagePill}>
          <Text style={styles.stagePillText}>{stageLabel}</Text>
        </View>
      </View>

      {/* 제목 */}
      <Text style={styles.title}>{weaknessLabel}, 기억 사라지는 중 📉</Text>

      {/* 기억 유지율 바 */}
      <View style={styles.memoryWrap}>
        <View style={styles.memoryLabelRow}>
          <Text style={styles.memoryLabelLeft}>기억 유지율</Text>
          <Text style={styles.memoryLabelRight}>{retentionPct}%</Text>
        </View>
        <View style={styles.memoryBarBg}>
          <View style={[styles.memoryBarFill, { width: `${retentionPct}%` }]} />
        </View>
      </View>

      {/* 인라인 타이머 */}
      <View style={styles.timerRow}>
        <View style={[styles.timerRing, { borderTopColor: timerColor }]}>
          <Text style={[styles.timerNum, { color: timerColor }]}>{timerDisplay}</Text>
        </View>
        <Text style={styles.timerHint}>
          {weaknessLabel} 개념을{'\n'}잠깐 떠올려보세요
        </Text>
      </View>

      {/* CTA 버튼 */}
      <Pressable
        style={[styles.cta, ready && styles.ctaReady]}
        onPress={ready ? onPress : undefined}
        disabled={!ready}>
        <Text style={[styles.ctaText, !ready && styles.ctaTextDisabled]}>
          사고 흐름 확인하기
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E2F20',
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: BrandColors.danger,
  },
  badgeText: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: BrandColors.danger,
    letterSpacing: 0.4,
  },
  stagePill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  stagePillText: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: '#F6F2EA',
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: '#F6F2EA',
  },
  memoryWrap: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BrandRadius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  memoryLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  memoryLabelLeft: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    color: BrandColors.mutedText,
  },
  memoryLabelRight: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: BrandColors.danger,
  },
  memoryBarBg: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    height: 5,
  },
  memoryBarFill: {
    backgroundColor: BrandColors.danger,
    borderRadius: 4,
    height: '100%',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  timerRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.1)',
    borderTopColor: BrandColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timerNum: {
    fontFamily: FontFamilies.bold,
    fontSize: 26,
    color: '#F6F2EA',
  },
  timerHint: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    color: BrandColors.mutedText,
    lineHeight: 18,
    flex: 1,
  },
  cta: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BrandRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ctaReady: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  ctaText: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    color: '#F6F2EA',
  },
  ctaTextDisabled: {
    color: BrandColors.mutedText,
  },
});
