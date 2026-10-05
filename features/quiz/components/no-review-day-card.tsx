import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { resolveWeaknessLabel } from '@/data/diagnosisMap';
import { useIsTablet } from '@/hooks/use-is-tablet';
import type { ActiveReviewTaskSummary } from '@/features/learner/types';
import { daysUntilScheduled } from '@/features/learning/review-scheduler';
import { formatReviewStageLabel } from '@/features/learning/review-stage';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** '2026-10-04T…' → { md: '10/4', mdw: '10/4(일)' }. 날짜 글자만 읽는다(시간대 무관). */
function formatScheduledDay(scheduledFor: string) {
  const [y, m, d] = scheduledFor.slice(0, 10).split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return { md: `${m}/${d}`, mdw: `${m}/${d}(${weekday})` };
}

type Props = {
  nextTask: ActiveReviewTaskSummary;
  onPressExam: () => void;
};

export function NoReviewDayCard({ nextTask, onPressExam }: Props) {
  const isTablet = useIsTablet();
  const daysUntil = daysUntilScheduled(nextTask.scheduledFor);
  const pillText = `오늘은 복습 없는 날이에요 · 다음 복습 D-${Math.max(1, daysUntil)}`;

  return (
    <View style={[styles.wrap, isTablet && { maxWidth: undefined }]}>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{pillText}</Text>
      </View>
      {nextTask.source === 'photo' ? (
        <NextReviewBody nextTask={nextTask} daysUntil={daysUntil} />
      ) : (
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
      )}
    </View>
  );
}

/**
 * 사진에서 온 복습 — 내일 다시 열 이유를 날짜·약점 이름으로 말한다(기윤 10.03, Fable 최종 문구).
 * 저장된 과제(today.nextTask)가 있을 때만 이 카드가 뜬다 — 과제 저장이 실패했으면 안 뜬다.
 */
function NextReviewBody({ nextTask, daysUntil }: { nextTask: ActiveReviewTaskSummary; daysUntil: number }) {
  const { md, mdw } = formatScheduledDay(nextTask.scheduledFor);
  const isTomorrow = daysUntil === 1;
  // 「첫」은 안 쓴다 — 복습 중에 또 틀리면 그 과제가 day1로 다시 만들어진다(spawnMistakeReviewTasks) — 이미 복습한 학생이다
  const title = `${resolveWeaknessLabel(nextTask.weaknessId)} · ${formatReviewStageLabel(nextTask.stage)}`;
  const tag = isTomorrow ? `내일 · ${mdw}` : daysUntil > 1 ? `${mdw} · D-${daysUntil}` : mdw;

  return (
    <View testID="home-next-review" style={styles.examCard}>
      <Text style={styles.examTag}>{tag}</Text>
      <Text style={styles.examTitle}>{title}</Text>
      <Text style={styles.examBody}>{`${isTomorrow ? '내일' : md} 홈에 떠요. 짧게 다시 보면 돼요.`}</Text>
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
