// v2: L1 카드. 워시 테이프 라벨 제거 → 질문이 카드의 첫 줄.
//     보기는 InputArea와 같은 L2 톤(1px edge)으로 통일.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CheckNode } from '@/data/review-remedial-flows';
import { Paper } from './paper-tokens';
import { FontFamilies } from '@/constants/typography';

const CHOICE_LABELS = ['가', '나', '다', '라'];

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
      {/* v2: 라벨 제거. node.title("이해 확인" 등)을 작은 메타로만, 질문을 메인으로 */}
      {node.title ? <Text style={styles.metaLabel}>{node.title}</Text> : null}
      <Text style={styles.prompt}>{node.prompt}</Text>
      <View style={styles.options}>
        {node.options.map((option, i) => {
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
              <View style={[styles.badge, isPicked && (option.isCorrect ? styles.badgeCorrect : styles.badgeWrong)]}>
                <Text style={[styles.badgeText, isPicked && styles.badgeTextActive]}>
                  {CHOICE_LABELS[i] ?? `${i + 1}`}
                </Text>
              </View>
              <Text style={[styles.optionText, isPicked && styles.optionTextActive]}>{option.text}</Text>
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
  // ── L1 카드 ──
  card: {
    backgroundColor: Paper.paper,
    borderColor: Paper.ink,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    marginVertical: 8,
    shadowColor: Paper.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  locked: { opacity: 0.5 },
  metaLabel: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 12,
    color: Paper.inkMute,
    letterSpacing: 1,
    marginBottom: 6,
  },
  prompt: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,                 // v2: 14 → 16
    color: Paper.ink,
    lineHeight: 24,
    marginBottom: 14,
  },
  options: { gap: 8, marginBottom: 4 },
  // ── L2 톤 보기 (InputArea와 동일) ──
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
  optionCorrect: {
    backgroundColor: Paper.forest800,
    borderColor: Paper.forest800,
  },
  optionWrong: {
    backgroundColor: Paper.rustSoft,
    borderColor: Paper.rustDeep,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Paper.creamDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCorrect: { backgroundColor: Paper.cream },
  badgeWrong: { backgroundColor: Paper.rustDeep },
  badgeText: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 14,
    color: Paper.ink,
  },
  badgeTextActive: { color: Paper.forest800 },
  optionText: {
    flex: 1,
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Paper.ink,
  },
  optionTextActive: { color: Paper.cream, fontFamily: FontFamilies.bold },
  // ── "모르겠어요" 인라인 링크 ──
  dontKnow: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  dontKnowText: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: Paper.inkMute,
    textDecorationLine: 'underline',
  },
  btnDisabled: { opacity: 0.5 },
});
