import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ExplainNode } from '@/data/review-remedial-flows';
import { Paper } from './paper-tokens';

type Props = {
  node: ExplainNode;
  interactive: boolean;
  onPressPrimary: () => void;
  onPressSecondary: () => void;
};

export function RemedialExplainCard({ node, interactive, onPressPrimary, onPressSecondary }: Props) {
  return (
    <View style={[styles.card, !interactive && styles.locked]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>💡 잠깐 짚고 가요</Text>
      </View>
      <Text style={styles.title}>{node.title}</Text>
      <Text style={styles.body}>{node.body}</Text>
      <View style={styles.actions}>
        <Pressable
          style={[styles.primaryBtn, !interactive && styles.btnDisabled]}
          onPress={onPressPrimary}
          disabled={!interactive}
          accessibilityRole="button"
          accessibilityLabel={node.primaryLabel}>
          <Text style={styles.primaryBtnText}>{node.primaryLabel}</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryBtn, !interactive && styles.btnDisabled]}
          onPress={onPressSecondary}
          disabled={!interactive}
          accessibilityRole="button"
          accessibilityLabel={node.secondaryLabel}>
          <Text style={styles.secondaryBtnText}>{node.secondaryLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Paper.cream,
    borderColor: Paper.edge,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginVertical: 8,
  },
  locked: { opacity: 0.55 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Paper.honeyTape,
    borderColor: Paper.honeyTapeBorder,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 99,
    marginBottom: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: Paper.ink },
  title: { fontSize: 15, fontWeight: '700', color: Paper.ink, marginBottom: 6 },
  body: { fontSize: 13, color: Paper.inkSoft, lineHeight: 20, marginBottom: 14 },
  actions: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    flex: 2,
    backgroundColor: Paper.forest800,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: Paper.paper, fontSize: 13, fontWeight: '600' },
  secondaryBtn: {
    flex: 1,
    backgroundColor: Paper.paper,
    borderColor: Paper.forest800,
    borderWidth: 1.5,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryBtnText: { color: Paper.forest800, fontSize: 13, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
});
