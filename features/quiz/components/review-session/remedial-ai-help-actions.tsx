import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Paper } from './paper-tokens';

type Props = {
  interactive: boolean;
  onContinue: () => void;
  onFallback: () => void;
};

export function RemedialAiHelpActions({ interactive, onContinue, onFallback }: Props) {
  return (
    <View style={[styles.card, !interactive && styles.locked]}>
      <Text style={styles.label}>이제 어떻게 하시겠어요?</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.primaryBtn, !interactive && styles.btnDisabled]}
          onPress={onContinue}
          disabled={!interactive}
          accessibilityRole="button"
          accessibilityLabel="다시 풀어볼게요">
          <Text style={styles.primaryBtnText}>다시 풀어볼게요</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryBtn, !interactive && styles.btnDisabled]}
          onPress={onFallback}
          disabled={!interactive}
          accessibilityRole="button"
          accessibilityLabel="여전히 모르겠어요">
          <Text style={styles.secondaryBtnText}>여전히 모르겠어요</Text>
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
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  locked: { opacity: 0.55 },
  label: { fontSize: 12, color: Paper.inkMute, marginBottom: 10, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    flex: 2,
    backgroundColor: Paper.forest800,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: Paper.paper, fontSize: 13, fontWeight: '600' },
  secondaryBtn: {
    flex: 1,
    backgroundColor: Paper.paper,
    borderColor: Paper.forest800,
    borderWidth: 1.5,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryBtnText: { color: Paper.forest800, fontSize: 12, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
});
