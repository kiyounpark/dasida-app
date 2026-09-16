import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { resolveWeaknessLabel } from '@/data/diagnosisMap';
import type { ActiveReviewTaskSummary } from '@/features/learner/types';
import { formatReviewStageLabel } from '@/features/learning/review-stage';
import { ReviewHomeCard } from '@/features/quiz/components/review-home-card';
import { useIsTablet } from '@/hooks/use-is-tablet';

type Props = {
  title: string;
  body: string;
  tasks: ActiveReviewTaskSummary[];
  onPressTask: (taskId: string) => void;
  onPressPhoto: () => void;
};

/**
 * 오늘 복습할 것 목록. 홈의 주인공이다 (🔒 2026.09.15 결정 B).
 *
 * 1번 칸은 기존 `ReviewHomeCard`를 그대로 쓴다 — 원래 "오늘의 복습 1개"를 위해 만든 카드라
 * 리스트 맨 앞자리와 역할이 같다. 2번부터는 한 줄짜리로 줄인다.
 *
 * 맨 아래 사진 줄은 C안의 핵심이다: 복습이 있는 날에도 사진 문을 없애지 않되,
 * 큰 카드가 아니라 한 줄로 남긴다. 사진이 약점 이름을 몇 % 뽑는지 재는 중이라
 * 표본을 끊으면 안 된다.
 */
export function HomeReviewList({ title, body, tasks, onPressTask, onPressPhoto }: Props) {
  const isTablet = useIsTablet();
  const [leadTask, ...restTasks] = tasks;

  return (
    <View testID="home-review-list" style={[styles.wrap, isTablet && { maxWidth: undefined }]}>
      <Text selectable style={styles.title}>
        {title}
      </Text>
      <Text selectable style={styles.body}>
        {body}
      </Text>

      {leadTask ? (
        <ReviewHomeCard task={leadTask} onPress={() => onPressTask(leadTask.id)} />
      ) : null}

      {restTasks.map((task) => (
        <Pressable
          key={task.id}
          style={styles.row}
          onPress={() => onPressTask(task.id)}
          accessibilityLabel={`${resolveWeaknessLabel(task.weaknessId)} 복습하기`}>
          <Text selectable style={styles.rowLabel} numberOfLines={1}>
            {resolveWeaknessLabel(task.weaknessId)}
          </Text>
          <Text selectable style={styles.rowStage}>
            {formatReviewStageLabel(task.stage)}
          </Text>
        </Pressable>
      ))}

      <Pressable
        style={styles.photoRow}
        onPress={onPressPhoto}
        accessibilityLabel="사진 추가하기">
        <Text selectable style={styles.photoRowText}>
          + 틀린 문제 찍어서 추가하기
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 430,
    gap: BrandSpacing.xs,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 20,
    lineHeight: 28,
    color: BrandColors.text,
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
    color: BrandColors.mutedText,
    marginBottom: BrandSpacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BrandSpacing.sm,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 252, 247, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.12)',
  },
  rowLabel: {
    flex: 1,
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    lineHeight: 20,
    color: BrandColors.text,
  },
  rowStage: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    color: BrandColors.mutedText,
  },
  photoRow: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(41, 59, 39, 0.24)',
  },
  photoRowText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    lineHeight: 20,
    color: BrandColors.primaryDark,
  },
});
