// v2: L1 카드 — 종착점. forest800 보더 + 꿀 워시테이프 라벨 + 제목 22px.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SummaryNode } from '@/data/review-remedial-flows';
import { Paper } from './paper-tokens';
import { FontFamilies } from '@/constants/typography';

type Props = {
  node: SummaryNode;
  interactive: boolean;
  onPressContinue: () => void;
};

export function RemedialSummaryCard({ node, interactive, onPressContinue }: Props) {
  return (
    <View style={[styles.card, !interactive && styles.locked]}>
      {/* 종착점이므로 꿀 워시 테이프 라벨 유지 */}
      <View style={styles.tape}>
        <Text style={styles.tapeText}>⭐ 오늘 짚은 것</Text>
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
  // ── L1 강조 카드: forest 보더 2px + forest 그림자 ──
  card: {
    position: 'relative',
    backgroundColor: Paper.paperWarm,
    borderColor: Paper.forest800,
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 16,
    marginTop: 10,
    marginBottom: 8,
    shadowColor: Paper.forest800,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  locked: { opacity: 0.5 },
  tape: {
    position: 'absolute',
    top: -10,
    left: 16,
    backgroundColor: Paper.honey,
    borderColor: Paper.ink,
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tapeText: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 11,
    color: Paper.ink,
    letterSpacing: 0.6,
  },
  title: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 22,                 // v2: 18 → 22
    color: Paper.ink,
    marginTop: 8,
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 15,                 // v2: 13 → 15
    color: Paper.inkSoft,
    lineHeight: 26,               // v2: 22 → 26
    marginBottom: 16,
  },
  button: {
    height: 52,
    backgroundColor: Paper.forest800,
    borderColor: Paper.ink,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Paper.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },
  buttonText: {
    fontFamily: FontFamilies.bold,
    color: Paper.cream,
    fontSize: 15,
  },
  btnDisabled: { opacity: 0.5 },
});
