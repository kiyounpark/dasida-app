// v2: L3 인라인 — 보더 제거, 색 면 + left-bar 만. 스크롤 부피 감소.
import { StyleSheet, Text, View } from 'react-native';
import { FontFamilies } from '@/constants/typography';
import { Paper } from './paper-tokens';

export function FeedbackBanner({ correct, text }: { correct: boolean; text: string }) {
  return (
    <View style={[styles.box, !correct && styles.boxWrong]}>
      <Text style={[styles.label, !correct && styles.labelWrong]}>
        {correct ? '정답' : '다시 한 번'}
      </Text>
      <Text style={styles.text} selectable>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── L3 인라인: 보더 없음, 색 면 + 왼쪽 3px 컬러바만 ──
  box: {
    paddingTop: 11,
    paddingRight: 14,
    paddingBottom: 12,
    paddingLeft: 14,
    backgroundColor: Paper.forest100,
    borderLeftWidth: 3,
    borderLeftColor: Paper.forest700,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  boxWrong: {
    backgroundColor: Paper.rustSoft,
    borderLeftColor: Paper.rustDeep,
  },
  label: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 11,
    color: Paper.forest800,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  labelWrong: { color: Paper.rustDeep },
  text: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,             // v2: 13 → 14
    lineHeight: 22,           // v2: 20 → 22
    color: Paper.ink,         // v2: inkSoft → ink (대비 강화)
  },
});
