import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { BrandTypography } from '@/constants/typography';
import type { ExamCatalogItem, ExamSubject, ExamType } from '@/features/quiz/data/exam-catalog';
import type { UseExamSelectionScreenResult } from '@/features/quiz/hooks/use-exam-selection-screen';

import { PosterTitleBanner } from './poster-title-banner';

const TYPE_OPTIONS: { label: string; value: ExamType }[] = [
  { label: '수능', value: 'csat' },
  { label: '모의고사', value: 'mock' },
  { label: '학력평가', value: 'academic' },
];

const SUBJECT_OPTIONS: { label: string; value: ExamSubject }[] = [
  { label: '확통', value: 'stats' },
  { label: '미적분', value: 'calc' },
  { label: '기하', value: 'geom' },
];

function ExamCard({
  item,
  onPress,
}: {
  item: ExamCatalogItem;
  onPress: () => void;
}) {
  const eyebrow = item.month ? `${item.year}년 ${item.month}월` : `${item.year}년`;

  return (
    <Pressable
      style={({ pressed }) => [styles.examCard, pressed && styles.examCardPressed]}
      onPress={onPress}>
      <Text selectable style={styles.examEyebrow}>
        {eyebrow}
      </Text>
      <View style={styles.examTitleWrap}>
        <View style={styles.examTitleHighlight} />
        <Text selectable style={styles.examTitle}>
          {item.title}
        </Text>
      </View>
      <Text selectable style={styles.examSubtitle}>
        {item.questionCount}문제
      </Text>
    </Pressable>
  );
}

export function ExamSelectionScreenView({
  isCompactLayout,
  showTypeToggle,
  selectedType,
  selectedSubject,
  onSelectType,
  onSelectSubject,
  examItems,
  onSelectExam,
}: UseExamSelectionScreenResult) {
  const insets = useSafeAreaInsets();
  const topPadding = insets.top + (isCompactLayout ? 38 : 42);

  return (
    <View style={styles.screen}>
      <View style={[styles.bannerWrap, { paddingTop: topPadding }]}>
        <PosterTitleBanner title="시험 선택" isCompactLayout={isCompactLayout} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.container, isCompactLayout && styles.containerCompact]}>
        {showTypeToggle ? (
          <>
            <View style={styles.chipWrap}>
              {TYPE_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => onSelectType(opt.value)}>
                    <Text
                      selectable
                      style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {selectedType !== 'csat' && (
              <View style={styles.chipWrap}>
                {SUBJECT_OPTIONS.map((opt) => {
                  const isSelected = selectedSubject === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => onSelectSubject(opt.value)}>
                      <Text
                        selectable
                        style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        ) : null}

        <View style={styles.examList}>
          {examItems.map((item) => (
            <ExamCard
              key={item.examId}
              item={item}
              onPress={() => onSelectExam(item.examId)}
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
  bannerWrap: {
    paddingHorizontal: 14,
    backgroundColor: BrandColors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: BrandSpacing.xs,
    paddingBottom: BrandSpacing.xxl,
    gap: BrandSpacing.md,
  },
  containerCompact: {
    paddingTop: 4,
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
  examTitleWrap: {
    position: 'relative',
  },
  examTitleHighlight: {
    position: 'absolute',
    top: 4,
    left: 0,
    width: 130,
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(183, 218, 150, 0.46)',
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
