import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Paper } from './paper-tokens';

type Props = {
  input: string;
  isLoading: boolean;
  error: string;
  interactive: boolean;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
};

export function RemedialAiHelpCard({
  input,
  isLoading,
  error,
  interactive,
  onChangeText,
  onSubmit,
}: Props) {
  const canSubmit = interactive && !isLoading && input.trim().length > 0;
  return (
    <View style={[styles.card, !interactive && styles.locked]}>
      <Text style={styles.label}>AI에게 물어보기</Text>
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={onChangeText}
        editable={interactive && !isLoading}
        placeholder="궁금한 점을 짧게 적어주세요"
        placeholderTextColor={Paper.inkFaint}
        multiline
        returnKeyType="send"
        onSubmitEditing={onSubmit}
      />
      {error.length > 0 ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.submitBtn, !canSubmit && styles.btnDisabled]}
        onPress={onSubmit}
        disabled={!canSubmit}
        accessibilityRole="button"
        accessibilityLabel="질문 전송">
        {isLoading ? (
          <ActivityIndicator color={Paper.paper} />
        ) : (
          <Text style={styles.submitBtnText}>전송</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Paper.paper,
    borderColor: Paper.honey,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginVertical: 8,
  },
  locked: { opacity: 0.55 },
  label: {
    fontSize: 11,
    color: Paper.inkMute,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Paper.cream,
    borderColor: Paper.edge,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: Paper.ink,
    minHeight: 64,
    marginBottom: 10,
  },
  error: { fontSize: 12, color: Paper.rustDeep, marginBottom: 8 },
  submitBtn: {
    backgroundColor: Paper.forest800,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnText: { color: Paper.paper, fontSize: 13, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
});
