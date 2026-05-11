import { StyleSheet, Text, View } from 'react-native';
import { FontFamilies } from '@/constants/typography';
import { Paper } from './paper-tokens';

export function FeedbackBanner({ correct, text }: { correct: boolean; text: string }) {
  return (
    <View style={styles.box}>
      <View style={styles.marginLine} />
      <View style={[styles.flag, !correct && styles.flagWrong]}>
        <Text style={styles.flagText}>{correct ? '정답' : '다시 한 번'}</Text>
      </View>
      <Text style={styles.text} selectable>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 12, paddingTop: 14, paddingRight: 14, paddingBottom: 12, paddingLeft: 38,
    borderWidth: 1.5, borderColor: Paper.ink, borderRadius: 12,
    backgroundColor: Paper.paper, position: 'relative',
    boxShadow: '0 2px 0 rgba(26,25,22,0.08)',
  },
  marginLine: {
    position: 'absolute', top: 0, bottom: 0, left: 22, width: 1.5,
    backgroundColor: Paper.marginRed,
  },
  flag: {
    position: 'absolute', top: -10, left: 14,
    backgroundColor: Paper.forest800, borderWidth: 1.5, borderColor: Paper.ink,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  flagWrong: { backgroundColor: Paper.rustDeep },
  flagText: {
    fontFamily: FontFamilies.extrabold, fontSize: 10,
    color: Paper.cream, letterSpacing: 1.2,
  },
  text: {
    fontFamily: FontFamilies.regular, fontSize: 13, lineHeight: 20, color: Paper.inkSoft,
  },
});
