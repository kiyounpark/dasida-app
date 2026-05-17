// v2: L1 카드 — Explain과 동일한 톤 (워시테이프 라벨 + 본문 +2~3px + 하드 그림자).
// 보충(remedial) 흐름 첫 카드라 다른 3종(Explain/Check/Summary)와 시각 무게를 맞춤.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DiagnoseNode } from '@/data/review-remedial-flows';
import { Paper } from './paper-tokens';
import { FontFamilies } from '@/constants/typography';

const CHOICE_LABELS = ['가', '나', '다', '라'];

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
      {/* 워시 테이프 라벨 — 진단 흐름 진입점 */}
      <View style={styles.tape}>
        <Text style={styles.tapeText}>🤔 잠깐, 같이 짚어볼게요</Text>
      </View>
      <Text style={styles.title}>{node.title}</Text>
      <Text style={styles.body}>{node.body}</Text>
      <View style={styles.options}>
        {node.options.map((option, i) => {
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
              <View style={[styles.badge, isPicked && styles.badgePicked]}>
                <Text style={[styles.badgeChar, isPicked && styles.badgeCharPicked]}>
                  {CHOICE_LABELS[i] ?? `${i + 1}`}
                </Text>
              </View>
              <Text style={[styles.optionText, isPicked && styles.optionTextPicked]}>
                {option.text}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── L1 카드 (Explain과 동일 톤) ──
  card: {
    position: 'relative',
    backgroundColor: Paper.paperWarm,
    borderColor: Paper.ink,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 16,
    marginTop: 10,
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
    fontSize: 19,
    color: Paper.ink,
    marginTop: 6,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 15,
    color: Paper.inkSoft,
    lineHeight: 25,
    marginBottom: 14,
  },
  options: { gap: 8 },
  // ── L2 톤 보기 (InputArea/Check와 동일) ──
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Paper.paper,
    borderColor: Paper.edge,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  optionPicked: {
    backgroundColor: Paper.forest800,
    borderColor: Paper.forest800,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Paper.creamDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePicked: { backgroundColor: Paper.cream },
  badgeChar: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 14,
    color: Paper.ink,
  },
  badgeCharPicked: { color: Paper.forest800 },
  optionText: {
    flex: 1,
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Paper.ink,
  },
  optionTextPicked: {
    color: Paper.cream,
    fontFamily: FontFamilies.bold,
  },
  btnDisabled: { opacity: 0.5 },
});
