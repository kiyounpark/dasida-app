// v2 NEW (옵션): fallback/remedial 진입 후 잠긴 InputArea 대신 보여줄 압축 chip.
// 스크롤 부피를 줄이고 싶을 때 EntryRenderer의 'input-area' 케이스에서
// interactive=false 일 때 InputArea 대신 이걸 렌더해도 됩니다.
//
// 사용 예 (entry-renderer.tsx):
//   case 'input-area':
//     if (!entry.interactive) {
//       return <PickedChoiceChip text="잘 모르겠어요 · 직접 적기로" correct={false} />;
//     }
//     return <InputArea ... />;

import { StyleSheet, Text, View } from 'react-native';
import { FontFamilies } from '@/constants/typography';
import { Paper } from './paper-tokens';

type Props = {
  text: string;
  correct: boolean;
};

export function PickedChoiceChip({ text, correct }: Props) {
  return (
    <View style={[styles.chip, correct ? styles.chipCorrect : styles.chipWrong]}>
      <View style={[styles.ic, correct ? styles.icCorrect : styles.icWrong]}>
        <Text style={styles.icText}>{correct ? '✓' : '×'}</Text>
      </View>
      <Text style={[styles.text, correct ? styles.textCorrect : styles.textWrong]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 7,
    borderRadius: 99,
  },
  chipCorrect: { backgroundColor: Paper.forest100 },
  chipWrong: { backgroundColor: Paper.rustSoft },
  ic: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icCorrect: { backgroundColor: Paper.forest800 },
  icWrong: { backgroundColor: Paper.rustDeep },
  icText: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 11,
    color: Paper.cream,
  },
  text: {
    fontFamily: FontFamilies.semibold,
    fontSize: 12,
  },
  textCorrect: { color: Paper.forest800 },
  textWrong: { color: Paper.rustDeep },
});
