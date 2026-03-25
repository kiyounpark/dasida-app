import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';

type QuizResultReportCardProps = {
  description: string;
  isCompactLayout: boolean;
  tip: string;
  title: string;
};

export function QuizResultReportCard({
  description,
  isCompactLayout,
  tip,
  title,
}: QuizResultReportCardProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${title}. ${description}. 팁: ${tip}`}
      style={styles.wrap}>
      <View style={[styles.card, isCompactLayout && styles.cardCompact]}>
        <View style={[styles.titleHighlight, isCompactLayout && styles.titleHighlightCompact]} />
        <Text selectable style={[styles.title, isCompactLayout && styles.titleCompact]}>
          {title}
        </Text>

        <Text selectable style={[styles.description, isCompactLayout && styles.descriptionCompact]}>
          {description}
        </Text>

        <Text selectable style={[styles.tip, isCompactLayout && styles.tipCompact]}>
          <Text style={styles.tipLabel}>Tip:</Text> {tip}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  card: {
    borderWidth: 1.5,
    borderColor: '#26211D',
    borderRadius: 20,
    borderCurve: 'continuous',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
    backgroundColor: '#FFFDF8',
    gap: 10,
  },
  cardCompact: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    gap: 8,
  },
  titleHighlight: {
    position: 'absolute',
    top: 40,
    left: 24,
    width: 130,
    height: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(183, 218, 150, 0.46)',
  },
  titleHighlightCompact: {
    top: 34,
    left: 18,
    width: 112,
    height: 14,
  },
  title: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 22,
    lineHeight: 28,
    color: '#181512',
  },
  titleCompact: {
    fontSize: 20,
    lineHeight: 26,
  },
  description: {
    fontFamily: FontFamilies.medium,
    fontSize: 16,
    lineHeight: 26,
    color: '#2D2A26',
  },
  descriptionCompact: {
    fontSize: 15,
    lineHeight: 23,
  },
  tip: {
    fontFamily: FontFamilies.medium,
    fontSize: 15,
    lineHeight: 24,
    color: '#37342F',
  },
  tipCompact: {
    fontSize: 14,
    lineHeight: 22,
  },
  tipLabel: {
    fontFamily: FontFamilies.bold,
    color: '#37342F',
  },
});
