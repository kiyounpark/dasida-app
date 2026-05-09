import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type { JourneyStepKey } from '@/features/learning/home-journey-state';
import { getJourneyStepDetailCopy } from '@/features/quiz/components/journey-step-detail-copy';

export type StepDetailCardMode = 'rich' | 'compact';

export function StepDetailCard({
  mode,
  stepKey,
}: {
  mode: StepDetailCardMode;
  stepKey: JourneyStepKey;
}) {
  const copy = getJourneyStepDetailCopy(stepKey);
  const isRich = mode === 'rich';

  return (
    <View style={[styles.card, isRich && styles.cardRich]}>
      <Text selectable style={styles.label}>
        {copy.label}
      </Text>
      <Text
        selectable
        style={[styles.title, isRich ? styles.titleRich : styles.titleCompact]}
        numberOfLines={2}>
        {copy.title}
      </Text>
      <Text selectable style={[styles.body, isRich ? styles.bodyRich : styles.bodyCompact]}>
        {isRich ? copy.bodyRich : copy.bodyCompact}
      </Text>

      {isRich ? (
        <>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text selectable style={styles.metaLabel}>예상 시간</Text>
              <Text selectable style={styles.metaValue}>{copy.meta.duration}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text selectable style={styles.metaLabel}>난이도</Text>
              <Text selectable style={styles.metaValue}>{copy.meta.difficulty}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text selectable style={styles.metaLabel}>문항 수</Text>
              <Text selectable style={styles.metaValue}>{copy.meta.questionCount}</Text>
            </View>
          </View>
          <Text selectable style={styles.afterHint}>
            {copy.afterStepHint}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.12)',
    borderRadius: 14,
    padding: 14,
  },
  cardRich: {
    padding: 18,
    boxShadow: '0 8px 16px rgba(28, 44, 25, 0.04)',
  },
  label: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: '#999999',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: FontFamilies.bold,
    color: BrandColors.primaryDark,
    marginTop: 4,
  },
  titleRich: {
    fontSize: 18,
    lineHeight: 24,
  },
  titleCompact: {
    fontSize: 15,
    lineHeight: 20,
  },
  body: {
    fontFamily: FontFamilies.regular,
    color: BrandColors.mutedText,
    marginTop: 6,
  },
  bodyRich: {
    fontSize: 13,
    lineHeight: 20,
  },
  bodyCompact: {
    fontSize: 12,
    lineHeight: 18,
  },
  metaRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 219, 200, 1)',
    borderStyle: 'dashed',
    flexDirection: 'row',
    gap: 18,
  },
  metaItem: {
    minWidth: 60,
  },
  metaLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    letterSpacing: 0.3,
    color: '#AAAAAA',
  },
  metaValue: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: BrandColors.text,
    marginTop: 2,
  },
  afterHint: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 219, 200, 1)',
    borderStyle: 'dashed',
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    lineHeight: 17,
    color: '#888888',
  },
});
