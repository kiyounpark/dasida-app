import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Paper } from './paper-tokens';
import { RemedialExplainCard } from './remedial-explain-card';
import { RemedialCheckCard } from './remedial-check-card';
import { RemedialAiHelpCard } from './remedial-ai-help-card';
import { RemedialAiHelpActions } from './remedial-ai-help-actions';
import { RemedialTransitionCard } from './remedial-transition-card';
import type { RemedialEntry } from './remedial-entries';

type Props = {
  entries: readonly RemedialEntry[];
  aiHelpInput: string;
  aiHelpLoading: boolean;
  aiHelpError: string;
  onPressExplainPrimary: (nodeId: string) => void;
  onPressExplainSecondary: (nodeId: string) => void;
  onPressCheckOption: (nodeId: string, optionId: string) => void;
  onPressCheckDontKnow: (nodeId: string) => void;
  onChangeAiHelpInput: (text: string) => void;
  onSubmitAiHelp: () => void;
  onPressAiHelpAction: (action: 'continue' | 'fallback') => void;
};

// 부모 ScrollView 안에 렌더되므로 본 컴포넌트는 ScrollView를 가지지 않는다.
// 자동 스크롤은 부모의 onContentSizeChange + autoScrollFlagRef에 위임.
export function RemedialFlow(props: Props) {
  const {
    entries,
    aiHelpInput,
    aiHelpLoading,
    aiHelpError,
    onPressExplainPrimary,
    onPressExplainSecondary,
    onPressCheckOption,
    onPressCheckDontKnow,
    onChangeAiHelpInput,
    onSubmitAiHelp,
    onPressAiHelpAction,
  } = props;

  return (
    <View style={styles.container}>
      {entries.map((entry, index) => {
        switch (entry.kind) {
          case 'node':
            if (entry.payload.kind === 'explain') {
              return (
                <RemedialExplainCard
                  key={`explain-${index}`}
                  node={entry.payload}
                  interactive={entry.interactive}
                  onPressPrimary={() => onPressExplainPrimary(entry.payload.id)}
                  onPressSecondary={() => onPressExplainSecondary(entry.payload.id)}
                />
              );
            }
            if (entry.payload.kind === 'check') {
              return (
                <RemedialCheckCard
                  key={`check-${index}`}
                  node={entry.payload}
                  interactive={entry.interactive}
                  onPressOption={(optionId) => onPressCheckOption(entry.payload.id, optionId)}
                  onPressDontKnow={() => onPressCheckDontKnow(entry.payload.id)}
                />
              );
            }
            return null;
          case 'user-bubble':
            return (
              <View key={`u-${index}`} style={[styles.bubble, styles.userBubble]}>
                <Text style={styles.userBubbleText}>{entry.text}</Text>
              </View>
            );
          case 'ai-bubble':
            return (
              <View key={`a-${index}`} style={[styles.bubble, styles.aiBubble]}>
                <Text style={styles.aiBubbleText}>{entry.text}</Text>
              </View>
            );
          case 'ai-help-input':
            return (
              <RemedialAiHelpCard
                key={`ai-input-${index}`}
                input={aiHelpInput}
                isLoading={aiHelpLoading}
                error={aiHelpError}
                interactive={entry.interactive}
                onChangeText={onChangeAiHelpInput}
                onSubmit={onSubmitAiHelp}
              />
            );
          case 'ai-help-actions':
            return (
              <RemedialAiHelpActions
                key={`ai-actions-${index}`}
                interactive={entry.interactive}
                onContinue={() => onPressAiHelpAction('continue')}
                onFallback={() => onPressAiHelpAction('fallback')}
              />
            );
          case 'transition':
            return <RemedialTransitionCard key={`t-${index}`} text={entry.text} />;
          default:
            return null;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  bubble: { maxWidth: '85%', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, marginVertical: 4 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Paper.rustSoft, borderTopRightRadius: 4 },
  userBubbleText: { fontSize: 13, color: Paper.rustDeep, lineHeight: 19 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: Paper.forest100, borderTopLeftRadius: 4 },
  aiBubbleText: { fontSize: 13, color: Paper.forest800, lineHeight: 19 },
});
