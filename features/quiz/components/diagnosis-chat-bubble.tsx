import { BrandRadius, BrandSpacing } from '@/constants/brand';
import { StyleSheet, Text, View } from 'react-native';

type DiagnosisChatBubbleProps = {
  role: 'assistant' | 'user';
  text: string;
  tone?: 'neutral' | 'positive' | 'warning';
};

export function DiagnosisChatBubble({
  role,
  text,
  tone = 'neutral',
}: DiagnosisChatBubbleProps) {
  const isUser = role === 'user';
  const containerStyle = isUser ? styles.userBubble : styles.aiBubble;
  const textStyle = [
    styles.text,
    isUser ? styles.userText : styles.aiText,
    !isUser && tone === 'positive' ? styles.positiveText : null,
    !isUser && tone === 'warning' ? styles.warningText : null,
  ];

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.aiRow]}>
      <View style={[styles.bubble, containerStyle]}>
        <Text selectable style={textStyle}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
  },
  aiRow: {
    alignItems: 'flex-start',
  },
  userRow: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '86%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderCurve: 'continuous',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.06)',
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEE2E2',
    borderTopLeftRadius: 8,
  },
  userBubble: {
    backgroundColor: '#E8F5E9',
    borderTopRightRadius: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  aiText: {
    color: '#4F4141',
  },
  userText: {
    color: '#293B27',
    fontWeight: '700',
  },
  positiveText: {
    color: '#2F6A34',
    fontWeight: '700',
  },
  warningText: {
    color: '#9A3434',
    fontWeight: '700',
  },
});
