import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MilestoneFraction } from '@/features/quiz/exam/diagnosis-milestone';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { NoteCollectionBar } from '@/features/quiz/exam/components/note-collection-bar';

export type DiagnosisMilestoneBannerProps = {
  fraction: MilestoneFraction; // 33 | 67
  noteCount: number;
  totalNotes: number;
  onPause: () => void;
  onContinue: () => void;
};

export function DiagnosisMilestoneBanner({
  fraction,
  noteCount,
  totalNotes,
  onPause,
  onContinue,
}: DiagnosisMilestoneBannerProps) {
  const isFirst = fraction === 33;
  const icon = isFirst ? '🌱' : '🌿';
  const title = isFirst ? '1/3 도달' : '2/3 도달';
  const subtitle = isFirst
    ? `노트 ${noteCount}장 모았어요\n여기까지 잘 왔어요`
    : `노트 ${noteCount}장 모았어요\n조금만 더 가면 끝이에요`;

  return (
    <View style={styles.outer}>
      <View style={styles.banner}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.fracPill}>
          <Text style={styles.fracText}>
            {noteCount} / {totalNotes}
          </Text>
        </View>
      </View>

      <NoteCollectionBar current={noteCount} total={totalNotes} variant="full" showRemainingHint={false} />

      <View style={styles.buttonRow}>
        <Pressable style={({ pressed }) => [styles.btnGhost, pressed && styles.btnPressed]} onPress={onPause}>
          <Text style={styles.btnGhostText}>잠시 쉬기</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]} onPress={onContinue}>
          <Text style={styles.btnPrimaryText}>계속하기 →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    gap: BrandSpacing.sm,
  },
  banner: {
    backgroundColor: '#FFF8EF',
    borderColor: '#A89F8C66',
    borderWidth: 1.5,
    borderRadius: BrandRadius.lg,
    paddingVertical: 22,
    paddingHorizontal: BrandSpacing.md,
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 17,
    color: '#1C2C19',
  },
  subtitle: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    color: '#4A4540',
    textAlign: 'center',
    lineHeight: 18,
  },
  fracPill: {
    backgroundColor: '#EDF7ED',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginTop: 6,
  },
  fracText: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: BrandColors.success,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: BrandSpacing.xs,
  },
  btnGhost: {
    flex: 1,
    backgroundColor: 'transparent',
    borderColor: BrandColors.border,
    borderWidth: 1.5,
    borderRadius: BrandRadius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnGhostText: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: BrandColors.mutedText,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: BrandColors.success,
    borderRadius: BrandRadius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.7,
  },
});
