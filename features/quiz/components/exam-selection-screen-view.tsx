import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { BrandTypography } from '@/constants/typography';
import type { ExamCategory, ExamCatalogItem } from '@/features/quiz/data/exam-catalog';
import type { UseExamSelectionScreenResult } from '@/features/quiz/hooks/use-exam-selection-screen';

import { PosterTitleBanner } from './poster-title-banner';

const CATEGORY_OPTIONS: { label: string; value: ExamCategory }[] = [
  { label: '모의고사', value: 'mock_exam' },
  { label: '학력평가', value: 'academic_assessment' },
];

function ExamCard({
  item,
  onPress,
}: {
  item: ExamCatalogItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.examCard, pressed && styles.examCardPressed]}
      onPress={onPress}>
      <Text selectable style={styles.examEyebrow}>
        {item.year}년 {item.month}월
      </Text>
      <Text selectable style={styles.examTitle}>
        {item.title}
      </Text>
      <Text selectable style={styles.examSubtitle}>
        {item.questionCount}문제
      </Text>
    </Pressable>
  );
}

export function ExamSelectionScreenView({
  isCompactLayout,
  showCategoryToggle,
  selectedCategory,
  onSelectCategory,
  examItems,
  onSelectExam,
}: UseExamSelectionScreenResult) {
  return (
    <View style={styles.screen}>
      <BrandHeader compact />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>
        <PosterTitleBanner title="시험 선택" isCompactLayout={isCompactLayout} />

        {showCategoryToggle ? (
          <View style={styles.chipWrap}>
            {CATEGORY_OPTIONS.map((option) => {
              const isSelected = selectedCategory === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => onSelectCategory(option.value)}>
                  <Text
                    selectable
                    style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.examList}>
          {examItems.map((item) => (
            <ExamCard
              key={item.id}
              item={item}
              onPress={() => onSelectExam(item.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: BrandSpacing.md,
    paddingBottom: BrandSpacing.xxl,
    gap: BrandSpacing.md,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BrandSpacing.xs,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: '#F7FAF6',
  },
  chipSelected: {
    borderColor: BrandColors.primarySoft,
    backgroundColor: BrandColors.primarySoft,
  },
  chipText: {
    ...BrandTypography.chip,
    color: BrandColors.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  examList: {
    gap: BrandSpacing.sm,
  },
  examCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    padding: BrandSpacing.lg,
    gap: 4,
  },
  examCardPressed: {
    backgroundColor: '#F2F6F1',
  },
  examEyebrow: {
    ...BrandTypography.meta,
    color: BrandColors.primarySoft,
  },
  examTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  examSubtitle: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
});
