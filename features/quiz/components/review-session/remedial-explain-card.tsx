// v2: L1 카드 — 워시테이프 라벨(absolute) + 본문 +2~3px + 하드 그림자
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ExplainNode } from '@/data/review-remedial-flows';
import { Paper } from './paper-tokens';
import { FontFamilies } from '@/constants/typography';

type Props = {
  node: ExplainNode;
  interactive: boolean;
  onPressPrimary: () => void;
  onPressSecondary: () => void;
};

export function RemedialExplainCard({ node, interactive, onPressPrimary, onPressSecondary }: Props) {
  return (
    <View style={[styles.card, !interactive && styles.locked]}>
      {/* 워시 테이프 라벨 — 카드 좌상단에 떠 있는 형태 */}
      <View style={styles.tape}>
        <Text style={styles.tapeText}>💡 잠깐 짚고 가요</Text>
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
  // ── L1 카드 ──
  card: {
    position: 'relative',
    backgroundColor: Paper.paperWarm,
    borderColor: Paper.ink,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 22,               // 워시 테이프 공간 + 첫 줄 여유
    paddingBottom: 16,
    marginTop: 10,                // 워시 테이프가 위로 -10 튀어나오는 공간
    marginBottom: 8,
    shadowColor: Paper.ink,
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
    fontSize: 19,                 // v2: 15 → 19
    color: Paper.ink,
    marginTop: 6,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 15,                 // v2: 13 → 15
    color: Paper.inkSoft,
    lineHeight: 25,
    marginBottom: 14,
  },
  actions: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    flex: 1.7,
    height: 48,
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
  primaryBtnText: {
    fontFamily: FontFamilies.bold,
    color: Paper.cream,
    fontSize: 14,
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    backgroundColor: Paper.paper,
    borderColor: Paper.ink,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: FontFamilies.bold,
    color: Paper.ink,
    fontSize: 13,
  },
  btnDisabled: { opacity: 0.5 },
});
