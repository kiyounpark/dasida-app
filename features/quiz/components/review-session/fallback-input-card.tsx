// v2: L2 — fallback-input을 채팅 흐름에 자연스럽게. 보더 1px edge, 그림자 없음.
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FontFamilies } from '@/constants/typography';
import { Paper } from './paper-tokens';

interface Props {
  text: string;
  turn: 1 | 2;
  interactive: boolean;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
}

export function FallbackInputCard({ text, turn, interactive, onChangeText, onSubmit }: Props) {
  const canSubmit = interactive && text.trim().length > 0;
  const hint = turn === 1 ? '어떤 부분이 헷갈리는지 적어볼래요?' : '한 번 더 이야기해볼래요?';
  return (
    <View style={[styles.card, !interactive && styles.locked]}>
      <Text style={styles.hint}>{hint}</Text>
      <View style={styles.row}>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.inputText}
            value={text}
            onChangeText={onChangeText}
            editable={interactive}
            placeholder="짧게 적어주세요"
            placeholderTextColor={Paper.inkFaint}
            multiline
          />
        </View>
        <Pressable
          onPress={() => canSubmit && onSubmit()}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="자유 입력 전송"
          style={[styles.sendBtn, !canSubmit && styles.sendBtnDisabled]}>
          <Text style={styles.sendBtnText}>↑</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── L2 카드 ──
  card: {
    marginVertical: 4,
    padding: 14,
    gap: 8,
    backgroundColor: Paper.paper,
    borderColor: Paper.edge,
    borderWidth: 1,
    borderRadius: 16,             // v2: 12 → 16 (채팅 버블과 동일)
  },
  locked: { opacity: 0.5 },
  hint: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,                 // v2: 12 → 13
    color: Paper.inkMute,
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  inputBox: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 0,               // v2: 1.5 → 0 (카드 안에 또 보더 두지 않음)
    backgroundColor: Paper.cream, // v2: paper → cream (살짝 들어간 느낌)
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputText: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,                 // v2: 13 → 14
    color: Paper.ink,
    padding: 0,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Paper.forest800,
    alignItems: 'center',
    justifyContent: 'center',
    // v2: 보더 제거 — 카드 안의 버튼이라 가볍게
  },
  sendBtnDisabled: {
    backgroundColor: Paper.creamDeep,
  },
  sendBtnText: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 16,
    color: Paper.cream,
  },
});
