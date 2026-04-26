import { StyleSheet, Text, View } from 'react-native';
import type { DiagnosedNote } from '@/features/quiz/exam/exam-analysis-in-progress';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

export type CollectedNotesListProps = {
  notes: DiagnosedNote[];
  resolveLabel: (weaknessId: string) => string;
};

export function CollectedNotesList({ notes, resolveLabel }: CollectedNotesListProps) {
  if (notes.length === 0) {
    return null;
  }
  return (
    <View style={styles.card}>
      <Text style={styles.title}>📚 모은 노트</Text>
      {notes.map((note, idx) => (
        <View
          key={`${note.problemNumber}-${note.weaknessId}`}
          style={[styles.row, idx === notes.length - 1 && styles.rowLast]}
        >
          <Text style={styles.num}>{note.problemNumber}번 문제</Text>
          <Text style={styles.label}>{resolveLabel(note.weaknessId)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.card,
    borderColor: '#4A45401F',
    borderWidth: 1,
    borderRadius: BrandRadius.md,
    padding: BrandSpacing.sm,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: BrandColors.mutedText,
    marginBottom: BrandSpacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  num: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: BrandColors.text,
  },
  label: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    color: BrandColors.mutedText,
  },
});
