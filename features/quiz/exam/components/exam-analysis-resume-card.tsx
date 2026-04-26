import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { NoteCollectionBar } from '@/features/quiz/exam/components/note-collection-bar';

export type ExamAnalysisResumeCardProps = {
  examTitle: string;
  noteCount: number;
  totalNotes: number;
  onPress: () => void;
};

export function ExamAnalysisResumeCard({
  examTitle,
  noteCount,
  totalNotes,
  onPress,
}: ExamAnalysisResumeCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <Text style={styles.kicker}>📔 모의고사 분석 진행 중</Text>
      <Text style={styles.title}>{examTitle}</Text>
      <Text style={styles.sub}>지난 분석을 이어서 해보세요</Text>

      <View style={styles.collection}>
        <NoteCollectionBar
          current={noteCount}
          total={totalNotes}
          variant="compact"
          showRemainingHint={false}
        />
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaText}>이어서 분석하기 →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#C8EAC8',
    borderColor: '#2A5C3833',
    borderWidth: 1,
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.md,
  },
  cardPressed: {
    opacity: 0.85,
  },
  kicker: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: '#2A5C38',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  title: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 16,
    color: '#1C2C19',
    marginBottom: 2,
  },
  sub: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: '#2A5C38',
    marginBottom: BrandSpacing.sm,
  },
  collection: {
    marginBottom: BrandSpacing.sm,
  },
  cta: {
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: '#F8F3E8',
  },
});
