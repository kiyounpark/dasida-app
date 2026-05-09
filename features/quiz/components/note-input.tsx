import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { FontFamilies } from '@/constants/typography';

const Palette = {
  paper: '#FFFCF4',
  paperEdge: '#ECE4CD',
  ink: '#1A1916',
  inkFaint: '#A8A296',
  forest800: '#293B27',
  marginRed: 'rgba(220, 80, 70, 0.22)',
};

const LINE_HEIGHT = 28;
const TOP_PAD = 8;
const LEFT_MARGIN_X = 38;
const TEXT_LEFT_PAD = 50;
const MIN_LINES = 3;

interface NoteInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function NoteInput({
  value,
  onChangeText,
  onFocus,
  placeholder = '여기에 써보세요…',
  containerStyle,
}: NoteInputProps) {
  const [contentH, setContentH] = useState(LINE_HEIGHT * MIN_LINES);

  const visibleLines = Math.max(
    MIN_LINES,
    Math.ceil(contentH / LINE_HEIGHT) + 1,
  );

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {Array.from({ length: visibleLines }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.rule,
            { top: TOP_PAD + (i + 1) * LINE_HEIGHT - 1 },
          ]}
        />
      ))}

      <View style={styles.marginLine} />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onContentSizeChange={(e) =>
          setContentH(e.nativeEvent.contentSize.height)
        }
        placeholder={placeholder}
        placeholderTextColor={Palette.inkFaint}
        multiline
        textAlignVertical="top"
        selectionColor={Palette.forest800}
        style={[
          styles.input,
          value.length > 0 && styles.inputFilled,
        ]}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    backgroundColor: Palette.paper,
    borderWidth: 1.5,
    borderColor: Palette.ink,
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: LINE_HEIGHT * MIN_LINES + TOP_PAD + 12,
    shadowColor: Palette.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 0,
    elevation: 1,
  },
  rule: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Palette.paperEdge,
  },
  marginLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: LEFT_MARGIN_X,
    width: 1.5,
    backgroundColor: Palette.marginRed,
  },
  input: {
    paddingTop: TOP_PAD,
    paddingBottom: 10,
    paddingLeft: TEXT_LEFT_PAD,
    paddingRight: 14,
    minHeight: LINE_HEIGHT * MIN_LINES + TOP_PAD + 12,
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    lineHeight: LINE_HEIGHT,
    color: Palette.ink,
    backgroundColor: 'transparent',
  },
  inputFilled: {
    fontFamily: FontFamilies.serifRegular,
    fontSize: 15,
  },
});
