import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CheckNode } from '@/data/review-remedial-flows';
import { Paper } from './paper-tokens';

type Props = {
  node: CheckNode;
  interactive: boolean;
  onPressOption: (optionId: string) => void;
  onPressDontKnow: () => void;
};

export function RemedialCheckCard({ node, interactive, onPressOption, onPressDontKnow }: Props) {
  const [pickedId, setPickedId] = useState<string | null>(null);

  const handlePick = (optionId: string) => {
    if (!interactive) return;
    setPickedId(optionId);
    onPressOption(optionId);
  };

  return (
    <View style={[styles.card, !interactive && styles.locked]}>
      <Text style={styles.title}>{node.title}</Text>
      <Text style={styles.prompt}>{node.prompt}</Text>
      <View style={styles.options}>
        {node.options.map((option) => {
          const isPicked = pickedId === option.id;
          return (
            <Pressable
              key={option.id}
              style={[
                styles.option,
                isPicked && (option.isCorrect ? styles.optionCorrect : styles.optionWrong),
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
      <Pressable
        style={[styles.dontKnow, !interactive && styles.btnDisabled]}
        onPress={onPressDontKnow}
        disabled={!interactive}
        accessibilityRole="button"
        accessibilityLabel="모르겠어요">
        <Text style={styles.dontKnowText}>모르겠어요</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Paper.paper,
    borderColor: Paper.edge,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginVertical: 8,
  },
  locked: { opacity: 0.55 },
  title: { fontSize: 13, fontWeight: '700', color: Paper.inkSoft, marginBottom: 6 },
  prompt: { fontSize: 14, color: Paper.ink, lineHeight: 21, marginBottom: 12 },
  options: { gap: 8, marginBottom: 12 },
  option: {
    backgroundColor: Paper.paper,
    borderColor: Paper.edge,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionCorrect: { borderColor: Paper.forest500, backgroundColor: Paper.forest100, borderWidth: 2 },
  optionWrong: { borderColor: Paper.rust, backgroundColor: Paper.rustSoft, borderWidth: 2 },
  optionText: { fontSize: 13, color: Paper.ink, fontWeight: '500' },
  dontKnow: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 10 },
  dontKnowText: { fontSize: 12, color: Paper.inkMute, textDecorationLine: 'underline' },
  btnDisabled: { opacity: 0.5 },
});
