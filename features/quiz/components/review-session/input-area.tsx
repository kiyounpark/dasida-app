import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { ThinkingStep } from '@/data/review-content-map';

import { Paper } from './paper-tokens';

const CHOICE_LABELS = ['가', '나', '다', '라'];

interface InputAreaProps {
  step: ThinkingStep;
  freeText: string;
  interactive: boolean;
  onSelectChoice: (index: number) => void;
  onChangeFreeText: (text: string) => void;
  onSubmitFreeText: () => void;
}

export function InputArea({
  step,
  freeText,
  interactive,
  onSelectChoice,
  onChangeFreeText,
  onSubmitFreeText,
}: InputAreaProps) {
  const canSubmit = interactive && freeText.trim().length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>💭 이 단계, 어떻게 이해했나요?</Text>

      <View>
        {step.choices.map((choice, i) => (
          <Pressable
            key={i}
            onPress={() => interactive && onSelectChoice(i)}
            disabled={!interactive}
            accessibilityRole="button"
            accessibilityLabel={`보기 ${CHOICE_LABELS[i] ?? i + 1}: ${choice.text}`}
            style={[styles.choiceBtn, !interactive && styles.choiceBtnDim]}>
            <View style={styles.choiceBadge}>
              <Text style={styles.choiceBadgeText}>{CHOICE_LABELS[i] ?? `${i + 1}`}</Text>
            </View>
            <Text style={styles.choiceText}>{choice.text}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.orLabel}>또는 직접 적어주세요</Text>

      <View style={styles.freeInputRow}>
        <View style={[styles.freeInputBox, !interactive && styles.freeInputBoxDim]}>
          <TextInput
            style={styles.freeInputText}
            value={freeText}
            onChangeText={onChangeFreeText}
            editable={interactive}
            placeholder="이해한 내용을 짧게 적어보세요"
            placeholderTextColor={Paper.inkFaint}
            multiline
          />
        </View>
        <Pressable
          onPress={() => canSubmit && onSubmitFreeText()}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="자유 입력 전송"
          accessibilityState={{ disabled: !canSubmit }}
          style={[styles.sendBtn, !canSubmit && styles.sendBtnDisabled]}>
          <Text style={styles.sendBtnText}>↑</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  label: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 12,
    color: Paper.ink,
    paddingLeft: 4,
  },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    borderRadius: 12,
    backgroundColor: Paper.paper,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
    boxShadow: '0 2px 0 rgba(26,25,22,0.06)',
  },
  choiceBtnDim: { opacity: 0.5 },
  choiceBadge: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.5, borderColor: Paper.ink, backgroundColor: Paper.cream,
    alignItems: 'center', justifyContent: 'center',
  },
  choiceBadgeText: {
    fontFamily: FontFamilies.serifBold, fontSize: 13, color: Paper.ink,
  },
  choiceText: {
    flex: 1, fontFamily: FontFamilies.medium, fontSize: 13, lineHeight: 19, color: Paper.ink,
  },
  orLabel: {
    fontFamily: FontFamilies.medium, fontSize: 11, color: Paper.inkMute,
    paddingLeft: 4, marginTop: 4,
  },
  freeInputRow: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-end',
  },
  freeInputBox: {
    flex: 1, minHeight: 50, maxHeight: 120,
    borderWidth: 1.5, borderColor: Paper.ink, borderRadius: 14,
    backgroundColor: Paper.paper, paddingHorizontal: 14, paddingVertical: 10,
    boxShadow: '0 2px 0 rgba(26,25,22,0.06)',
  },
  freeInputBoxDim: { opacity: 0.5 },
  freeInputText: {
    fontFamily: FontFamilies.regular, fontSize: 13, color: Paper.ink, padding: 0,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: Paper.ink, backgroundColor: Paper.forest800,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Paper.creamDeep, borderColor: Paper.edge,
  },
  sendBtnText: {
    fontFamily: FontFamilies.extrabold, fontSize: 18, color: Paper.cream,
  },
});
