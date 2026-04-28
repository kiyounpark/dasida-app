import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type { MilestoneFraction } from '@/features/quiz/exam/diagnosis-milestone';

const MASCOT_SOURCE = require('../../../../assets/images/characters/char_07.png');

export type DiagnosisMilestoneBannerProps = {
  fraction: MilestoneFraction; // 33 | 67
  noteCount: number;
  totalNotes: number;
  onPause: () => void;
  onContinue: () => void;
};

function getHeadline(fraction: MilestoneFraction): string {
  return fraction === 33 ? '벌써 절반 왔어.' : '한 문제만 더.';
}

function getSub(fraction: MilestoneFraction, noteCount: number): string {
  return fraction === 33
    ? `${noteCount}문제 분석 완료 · 잘 하고 있어`
    : `${noteCount}문제 분석 완료 · 거의 다 왔어`;
}

export function DiagnosisMilestoneBanner({
  fraction,
  noteCount,
  totalNotes,
  onPause,
  onContinue,
}: DiagnosisMilestoneBannerProps) {
  const pct = Math.min(Math.max(totalNotes > 0 ? noteCount / totalNotes : 0, 0), 1);

  return (
    <View style={styles.outer}>
      <View style={styles.milestoneCard}>
        <View style={styles.topStripe} />

        <Image
          source={MASCOT_SOURCE}
          contentFit="contain"
          style={styles.mascot}
          transition={0}
        />

        <Text style={styles.headline}>{getHeadline(fraction)}</Text>
        <Text style={styles.sub}>{getSub(fraction, noteCount)}</Text>

        <View style={styles.fractionRow}>
          <Text style={styles.fractionNum}>{noteCount}</Text>
          <Text style={styles.fractionDen}> / {totalNotes}</Text>
        </View>

        <View style={styles.barTrack}>
          <View style={[styles.barFill, { flex: pct }]} />
          <View style={{ flex: 1 - pct }} />
        </View>
      </View>

      <View style={styles.buttonCol}>
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
          onPress={onContinue}
          accessibilityRole="button">
          <Text style={styles.btnPrimaryText}>계속하기 →</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btnGhost, pressed && styles.btnGhostPressed]}
          onPress={onPause}
          accessibilityRole="button">
          <Text style={styles.btnGhostText}>잠시 쉬기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    gap: BrandSpacing.sm,
  },
  milestoneCard: {
    backgroundColor: '#FFFCF4',
    borderWidth: 2,
    borderColor: '#1A1916',
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: 20,
    paddingBottom: 22,
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  topStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#5C8C5A',
  },
  mascot: {
    width: 76,
    height: 76,
  },
  headline: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: '#1A1916',
    textAlign: 'center',
  },
  sub: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
    color: '#6B675E',
    textAlign: 'center',
  },
  fractionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  fractionNum: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
    color: '#293B27',
  },
  fractionDen: {
    fontFamily: FontFamilies.semibold,
    fontSize: 20,
    color: '#6B675E',
  },
  barTrack: {
    flexDirection: 'row',
    width: '100%',
    height: 8,
    backgroundColor: '#F2EDDC',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ECE4CD',
    overflow: 'hidden',
    marginTop: 4,
  },
  barFill: {
    backgroundColor: '#5C8C5A',
    borderRadius: 999,
  },
  buttonCol: {
    gap: 4,
  },
  btnPrimary: {
    backgroundColor: '#293B27',
    borderWidth: 2.5,
    borderColor: '#1A1916',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    paddingVertical: 16,
    alignItems: 'center',
    boxShadow: '0 3px 0 #1A1916',
  },
  btnPrimaryText: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 15,
    color: '#FAF6EC',
    letterSpacing: -0.2,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnGhost: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnGhostText: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: '#6B675E',
  },
  btnGhostPressed: {
    opacity: 0.6,
  },
});
