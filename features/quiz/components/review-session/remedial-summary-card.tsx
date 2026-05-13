import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SummaryNode } from '@/data/review-remedial-flows';
import { Paper } from './paper-tokens';

type Props = {
  node: SummaryNode;
  interactive: boolean;
  onPressContinue: () => void;
};

export function RemedialSummaryCard({ node, interactive, onPressContinue }: Props) {
  return (
    <View style={[styles.card, !interactive && styles.locked]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>⭐ 오늘 짚은 것</Text>
      </View>
      <Text style={styles.title}>{node.title}</Text>
      <Text style={styles.body}>{node.body}</Text>
      <Pressable
        style={[styles.button, !interactive && styles.btnDisabled]}
        onPress={onPressContinue}
        disabled={!interactive}
        accessibilityRole="button"
        accessibilityLabel="이해됐어요">
        <Text style={styles.buttonText}>이해됐어요</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Paper.cream,
    borderColor: Paper.forest300,
    borderWidth: 2,
    borderRadius: 14,
    padding: 16,
    marginVertical: 8,
  },
  locked: { opacity: 0.55 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Paper.honey,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 99,
    marginBottom: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: Paper.ink },
  title: { fontSize: 18, fontWeight: '700', color: Paper.ink, marginBottom: 8 },
  body: { fontSize: 13, color: Paper.inkSoft, lineHeight: 22, marginBottom: 14 },
  button: {
    backgroundColor: Paper.forest800,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: Paper.paper, fontSize: 13, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
});
