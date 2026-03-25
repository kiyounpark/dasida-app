import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';

type QuizResultReportCardProps = {
  description: string;
  index: number;
  isCompactLayout: boolean;
  tip: string;
  title: string;
};

export function QuizResultReportCard({
  description,
  index,
  isCompactLayout,
  tip,
  title,
}: QuizResultReportCardProps) {
  const isTapeLeft = index % 2 === 0;

  return (
    <View
      accessible
      accessibilityLabel={`${title}. ${description}. Tip: ${tip}`}
      style={styles.wrap}>
      <View
        style={[
          styles.tape,
          isCompactLayout && styles.tapeCompact,
          isTapeLeft ? styles.tapeLeft : styles.tapeRight,
        ]}
      />

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

        <View style={styles.foldCorner} />
        <View style={styles.foldInner} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    paddingTop: 10,
  },
  tape: {
    position: 'absolute',
    top: 0,
    width: 52,
    height: 18,
    borderRadius: 4,
    backgroundColor: 'rgba(171, 197, 131, 0.72)',
    transform: [{ rotate: '-18deg' }],
    zIndex: 2,
    boxShadow: '0 4px 10px rgba(45, 64, 33, 0.08)',
  },
  tapeCompact: {
    width: 44,
    height: 16,
  },
  tapeLeft: {
    left: 22,
  },
  tapeRight: {
    right: 22,
  },
  card: {
    position: 'relative',
    borderWidth: 2,
    borderColor: '#26211D',
    borderRadius: 20,
    borderCurve: 'continuous',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
    backgroundColor: '#FFFDF8',
    boxShadow: '0 12px 26px rgba(37, 31, 25, 0.08)',
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
    color: '#1E2F20',
  },
  foldCorner: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#26211D',
    borderTopLeftRadius: 12,
    backgroundColor: '#EDE4D3',
    transform: [{ skewX: '-22deg' }],
  },
  foldInner: {
    position: 'absolute',
    right: 8,
    bottom: 6,
    width: 18,
    height: 14,
    borderBottomWidth: 1,
    borderColor: 'rgba(38, 33, 29, 0.18)',
    transform: [{ rotate: '-18deg' }],
  },
});
