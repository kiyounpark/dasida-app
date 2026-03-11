import { BrandRadius, BrandSpacing } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import { StyleSheet, Text, View } from 'react-native';

type DiagnosisChatBubbleProps = {
  role: 'assistant' | 'user';
  text: string;
  variant?: 'assistant' | 'user';
  tone?: 'neutral' | 'positive' | 'warning' | 'info';
};

export function DiagnosisChatBubble({
  role,
  text,
  variant,
  tone = 'neutral',
}: DiagnosisChatBubbleProps) {
  const resolvedVariant = variant ?? role;
  const isUser = resolvedVariant === 'user';
  const hasAccent = !isUser && tone !== 'neutral';

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.assistantRow]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          !isUser && tone === 'warning' ? styles.assistantWarning : null,
        ]}>
        {!isUser && hasAccent ? (
          <View
            style={[
              styles.accent,
              tone === 'positive' ? styles.positiveAccent : null,
              tone === 'warning' ? styles.warningAccent : null,
              tone === 'info' ? styles.infoAccent : null,
            ]}
          />
        ) : null}
        <Text
          selectable
          style={[
            styles.text,
            isUser ? styles.userText : styles.assistantText,
            !isUser && tone === 'positive' ? styles.positiveText : null,
            !isUser && tone === 'warning' ? styles.warningText : null,
            !isUser && tone === 'info' ? styles.infoText : null,
          ]}>
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
  assistantRow: {
    alignItems: 'flex-start',
  },
  userRow: {
    alignItems: 'flex-end',
  },
  bubble: {
    position: 'relative',
    borderRadius: BrandRadius.md + 4,
    borderCurve: 'continuous',
    paddingVertical: 13,
    paddingHorizontal: 16,
    boxShadow: '0 8px 20px rgba(36, 50, 41, 0.06)',
  },
  assistantBubble: {
    maxWidth: '88%',
    backgroundColor: DiagnosisTheme.assistantBubble,
    borderWidth: 1,
    borderColor: DiagnosisTheme.assistantBubbleBorder,
    borderTopLeftRadius: 10,
  },
  assistantWarning: {
    backgroundColor: DiagnosisTheme.warningBg,
    borderColor: DiagnosisTheme.warningBorder,
  },
  userBubble: {
    maxWidth: '76%',
    backgroundColor: DiagnosisTheme.userBubble,
    borderTopRightRadius: 10,
  },
  accent: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    left: 10,
    width: 3,
    borderRadius: 999,
    backgroundColor: DiagnosisTheme.choiceActiveBorder,
  },
  positiveAccent: {
    backgroundColor: '#527A5F',
  },
  warningAccent: {
    backgroundColor: '#C9973E',
  },
  infoAccent: {
    backgroundColor: '#7B9079',
  },
  text: {
    fontSize: 15,
    lineHeight: 23,
  },
  assistantText: {
    color: DiagnosisTheme.ink,
    paddingLeft: 2,
  },
  userText: {
    color: DiagnosisTheme.userBubbleText,
    fontWeight: '700',
  },
  positiveText: {
    color: '#355B43',
    paddingLeft: BrandSpacing.sm,
  },
  warningText: {
    color: '#775520',
    paddingLeft: BrandSpacing.sm,
  },
  infoText: {
    color: '#4D6754',
    paddingLeft: BrandSpacing.sm,
  },
});
