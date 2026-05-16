import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DiagnoseNode } from '@/data/review-remedial-flows';
import { Paper } from './paper-tokens';

type Props = {
  node: DiagnoseNode;
  interactive: boolean;
  onPressOption: (optionId: string) => void;
};

export function RemedialDiagnoseCard({ node, interactive, onPressOption }: Props) {
  const [pickedId, setPickedId] = useState<string | null>(null);

  const handlePick = (optionId: string) => {
    if (!interactive) return;
    setPickedId(optionId);
    onPressOption(optionId);
  };

  return (
    <View style={[styles.card, !interactive && styles.locked]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>🤔 잠깐, 같이 짚어볼게요</Text>
      </View>
      <Text style={styles.title}>{node.title}</Text>
      <Text style={styles.body}>{node.body}</Text>
      <View style={styles.options}>
        {node.options.map((option) => {
          const isPicked = pickedId === option.id;
          return (
            <Pressable
              key={option.id}
              style={[
                styles.option,
                isPicked && styles.optionPicked,
                !interactive && styles.btnDisabled,
              ]}
              onPress={() => handlePick(option.id)}
              disabled={!interactive}
              accessibilityRole="button"
              accessibilityLabel={option.text}>
              <Text style={styles.optionText}>{option.text}</Text>
            </Pressable>
          );
        })}
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
  options: { gap: 8 },
  option: {
    backgroundColor: Paper.paper,
    borderColor: Paper.edge,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionPicked: { borderColor: Paper.forest800, borderWidth: 1.5 },
  optionText: { fontSize: 13, color: Paper.ink, fontWeight: '500' },
  btnDisabled: { opacity: 0.5 },
});
