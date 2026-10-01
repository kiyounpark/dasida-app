import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';

import type { TextPrompt } from '../script/script-io';
import { PhotoTheme } from '../theme';
import { PhotoActionButtons } from './photo-action-buttons';

/**
 * 방법을 학생 말로 받는 입력칸 — web-proto `.fallback-input` + [보내기]와 같은 모양(한 줄, 200자).
 * 빈 글자는 안 보낸다. 보내면 입력칸부터 비우는 건 thread.submitText(두 번 보내기 방지).
 */
export function PhotoTextInput({ prompt, onSubmit }: { prompt: TextPrompt; onSubmit: (text: string) => void }) {
  const [value, setValue] = useState('');
  const send = () => {
    if (value.trim()) onSubmit(value);
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        accessibilityLabel={prompt.placeholder}
        autoFocus
        maxLength={prompt.maxLength}
        onChangeText={setValue}
        onSubmitEditing={send}
        placeholder={prompt.placeholder}
        placeholderTextColor={PhotoTheme.muted}
        returnKeyType="send"
        style={styles.input}
        value={value}
      />
      <PhotoActionButtons
        actions={[{ label: prompt.submitLabel, kind: 'primary', onPress: send }]}
        onPress={(action) => action.onPress()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 2,
    paddingTop: 6,
  },
  // web-proto .fallback-input — 테두리 1.5 line · 둥글기 12 · 안쪽 13 · 글자 15
  input: {
    borderWidth: 1.5,
    borderColor: PhotoTheme.line,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    padding: 13,
    fontFamily: FontFamilies.regular,
    fontSize: 15,
    color: PhotoTheme.ink,
  },
});
