import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { diagnosisMap } from '@/data/diagnosisMap';

type QuizResultReportHeroProps = {
  isCompactLayout: boolean;
  primaryWeaknessId: string;
  missedCount: number;
};

export function QuizResultReportHero({
  isCompactLayout,
  primaryWeaknessId,
  missedCount,
}: QuizResultReportHeroProps) {
  const info = diagnosisMap[primaryWeaknessId as keyof typeof diagnosisMap];
  if (!info) return null;

  return (
    <View style={[styles.wrap, isCompactLayout && styles.wrapCompact]}>
      <View style={styles.tagRow}>
        <View style={styles.topicTag}>
          <Text style={styles.topicTagText}>{info.topicLabel}</Text>
        </View>
        <Text style={styles.eyebrow}>가장 큰 약점</Text>
      </View>

      <Text style={[styles.headline, isCompactLayout && styles.headlineCompact]}>
        {info.labelKo}에서{'\n'}
        <Text style={styles.missedHighlight}>{missedCount}번 막혔어요.</Text>
      </Text>

      <Text style={[styles.desc, isCompactLayout && styles.descCompact]}>
        {info.desc}
      </Text>

      {info.tip ? (
        <View style={styles.tipBox}>
          <Text style={styles.tipLabel}>이렇게 고쳐봐요</Text>
          <Text style={styles.tipText}>{info.tip}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    paddingBottom: 4,
  },
  wrapCompact: {
    gap: 8,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topicTag: {
    backgroundColor: '#E5EFE0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#87B084',
  },
  topicTagText: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: '#355135',
  },
  eyebrow: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    color: '#6B675E',
  },
  headline: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: '#1A1916',
  },
  headlineCompact: {
    fontSize: 22,
    lineHeight: 28,
  },
  missedHighlight: {
    color: BrandColors.danger,
  },
  desc: {
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    lineHeight: 22,
    color: '#3A3833',
  },
  descCompact: {
    fontSize: 13,
    lineHeight: 21,
  },
  tipBox: {
    backgroundColor: '#E5EFE0',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#87B084',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 4,
  },
  tipLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#355135',
  },
  tipText: {
    fontFamily: FontFamilies.semibold,
    fontSize: 13,
    lineHeight: 20,
    color: '#293B27',
  },
});
