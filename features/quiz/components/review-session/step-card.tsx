// v2: L1 카드 — 본문 13→15, 제목 17→20, 그림자 강화 (opacity 0.08 → 1.0 hard)
import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { ThinkingStep } from '@/data/review-content-map';

import { Paper } from './paper-tokens';

interface StepCardProps {
  step: ThinkingStep;
  currentStepIndex: number;
  totalSteps: number;
}

export function StepCard({ step, currentStepIndex, totalSteps }: StepCardProps) {
  return (
    <>
      <View style={styles.ribbonRow}>
        <View style={styles.ribbon}>
          <View style={styles.ribbonNumBadge}>
            <Text style={styles.ribbonNumText}>{currentStepIndex + 1}</Text>
          </View>
          <Text style={styles.ribbonLabel}>
            {`STEP ${currentStepIndex + 1} / ${totalSteps}`}
          </Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.body}>{step.body}</Text>
        {step.example ? (
          <View style={styles.exampleBox}>
            <Text style={styles.exampleLabel}>예시</Text>
            <Text style={styles.exampleText}>{step.example}</Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  ribbonRow: {
    paddingHorizontal: 4,
    marginBottom: -1,
    zIndex: 1,
  },
  ribbon: {
    alignSelf: 'flex-start',
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Paper.forest800,
    paddingLeft: 6,
    paddingRight: 14,
    paddingVertical: 5,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  ribbonNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Paper.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbonNumText: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 12,
    color: Paper.forest800,
    lineHeight: 14,
  },
  ribbonLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: Paper.cream,
    letterSpacing: 1.2,
  },
  // ── L1 카드 ──
  card: {
    backgroundColor: Paper.paper,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    borderRadius: 16,             // v2: 14 → 16
    paddingHorizontal: 18,        // v2: 16 → 18
    paddingTop: 20,               // v2: 18 → 20
    paddingBottom: 16,            // v2: 14 → 16
    shadowColor: Paper.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,             // v2: 0.08 → 1 (하드 그림자)
    shadowRadius: 0,
    elevation: 2,
  },
  title: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 20,                 // v2: 17 → 20
    lineHeight: 26,               // v2: 23 → 26
    color: Paper.ink,
    letterSpacing: -0.4,
    marginBottom: 8,              // v2: 6 → 8
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 15,                 // v2: 13 → 15
    lineHeight: 25,               // v2: 20 → 25
    color: Paper.inkSoft,
  },
  exampleBox: {
    marginTop: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Paper.edge,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Paper.cream,
  },
  exampleLabel: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 10,                 // v2: 9 → 10
    color: Paper.inkMute,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  exampleText: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 15,                 // v2: 14 → 15
    lineHeight: 22,
    color: Paper.ink,
    letterSpacing: 0.5,
  },
});
