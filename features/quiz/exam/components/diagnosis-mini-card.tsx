import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { NoteCollectionBar } from '@/features/quiz/exam/components/note-collection-bar';

export type DiagnosisMiniCardProps = {
  problemNumber: number;
  patternName: string;
  patternDescription: string;
  noteCount: number;
  totalNotes: number;
  onPause: () => void;
  onNext: () => void;
  isLastProblem?: boolean; // true면 "다음 문제 →" 대신 "리포트 보기 →"
};

export function DiagnosisMiniCard({
  problemNumber,
  patternName,
  patternDescription,
  noteCount,
  totalNotes,
  onPause,
  onNext,
  isLastProblem = false,
}: DiagnosisMiniCardProps) {
  return (
    <View style={styles.outer}>
      <View style={styles.completionBlock}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkText}>✓</Text>
        </View>
        <Text style={styles.completionLabel}>분석 완료</Text>
        <Text style={styles.problemLabel}>{problemNumber}번 문제</Text>

        <View style={styles.patternBlock}>
          <Text style={styles.patternKicker}>오답 패턴</Text>
          <Text style={styles.patternName}>{patternName}</Text>
          <Text style={styles.patternDesc}>{patternDescription}</Text>
        </View>
      </View>

      <NoteCollectionBar current={noteCount} total={totalNotes} variant="full" />

      <View style={styles.buttonRow}>
        <Pressable style={({ pressed }) => [styles.btnGhost, pressed && styles.btnPressed]} onPress={onPause}>
          <Text style={styles.btnGhostText}>잠시 쉬기</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]} onPress={onNext}>
          <Text style={styles.btnPrimaryText}>{isLastProblem ? '리포트 보기 →' : '다음 문제 →'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    gap: BrandSpacing.sm,
  },
  completionBlock: {
    backgroundColor: '#C8EAC8',
    borderColor: '#6BAA7244',
    borderWidth: 1,
    borderRadius: BrandRadius.md,
    padding: BrandSpacing.md,
    alignItems: 'center',
    gap: BrandSpacing.xs,
  },
  checkCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BrandColors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontFamily: FontFamilies.bold,
    color: '#FFFFFF',
    fontSize: 22,
  },
  completionLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: '#1C2C19',
  },
  problemLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: '#4A4540',
  },
  patternBlock: {
    backgroundColor: BrandColors.card,
    borderRadius: BrandRadius.sm,
    borderColor: '#2E7A2E1F',
    borderWidth: 1,
    padding: BrandSpacing.sm,
    width: '100%',
    gap: 4,
  },
  patternKicker: {
    fontFamily: FontFamilies.bold,
    fontSize: 9,
    color: BrandColors.success,
    letterSpacing: 0.7,
  },
  patternName: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: BrandColors.text,
  },
  patternDesc: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    color: '#4A4540',
    lineHeight: 17,
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
    paddingVertical: 11,
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
    paddingVertical: 11,
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
