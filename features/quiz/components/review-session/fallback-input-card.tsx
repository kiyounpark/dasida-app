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
  // Spec §3 시나리오 B: 2번째 입력 재활성 라벨 = "한 번 더 이야기해볼래요?".
  // 1턴(remedial "모르겠어요" 진입 직후)은 처음 묻는 상황이므로 다른 카피 사용.
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
  card: {
    marginVertical: 8, padding: 12, gap: 8,
    backgroundColor: Paper.cream, borderColor: Paper.edge, borderWidth: 1, borderRadius: 12,
  },
  locked: { opacity: 0.55 },
  hint: { fontFamily: FontFamilies.medium, fontSize: 12, color: Paper.inkMute },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  inputBox: {
    flex: 1, minHeight: 44, maxHeight: 100,
    borderWidth: 1.5, borderColor: Paper.ink, borderRadius: 12,
    backgroundColor: Paper.paper, paddingHorizontal: 12, paddingVertical: 8,
  },
  inputText: { fontFamily: FontFamilies.regular, fontSize: 13, color: Paper.ink, padding: 0 },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1.5, borderColor: Paper.ink, backgroundColor: Paper.forest800,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Paper.creamDeep, borderColor: Paper.edge,
  },
  sendBtnText: { fontFamily: FontFamilies.extrabold, fontSize: 16, color: Paper.cream },
});
