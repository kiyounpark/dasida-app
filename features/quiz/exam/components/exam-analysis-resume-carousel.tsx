// features/quiz/exam/components/exam-analysis-resume-carousel.tsx
import { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
} from 'react-native';

import { BrandColors, BrandSpacing } from '@/constants/brand';

import { ExamAnalysisResumeCard } from './exam-analysis-resume-card';

export type ExamAnalysisResumeCarouselItem = {
  attemptId: string;
  examTitle: string;
  noteCount: number;
  totalNotes: number;
};

export type ExamAnalysisResumeCarouselProps = {
  items: ExamAnalysisResumeCarouselItem[];
  onPressItem: (attemptId: string) => void;
};

export function ExamAnalysisResumeCarousel({
  items,
  onPressItem,
}: ExamAnalysisResumeCarouselProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const onMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number }; layoutMeasurement: { width: number } } }) => {
      const pageWidth = e.nativeEvent.layoutMeasurement.width;
      if (pageWidth <= 0) return;
      const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      setActiveIndex(Math.max(0, Math.min(items.length - 1, idx)));
    },
    [items.length],
  );

  if (items.length === 0) return null;

  // 단일 항목: 캐러셀/도트 없이 카드 1개만 (현재 동작과 동일)
  if (items.length === 1) {
    const only = items[0];
    return (
      <ExamAnalysisResumeCard
        examTitle={only.examTitle}
        noteCount={only.noteCount}
        totalNotes={only.totalNotes}
        onPress={() => onPressItem(only.attemptId)}
      />
    );
  }

  return (
    <View onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      {containerWidth > 0 ? (
        <FlatList
          data={items}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(it) => it.attemptId}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={({ item }) => (
            <View style={{ width: containerWidth }}>
              <ExamAnalysisResumeCard
                examTitle={item.examTitle}
                noteCount={item.noteCount}
                totalNotes={item.totalNotes}
                onPress={() => onPressItem(item.attemptId)}
              />
            </View>
          )}
        />
      ) : null}
      <View style={styles.dots}>
        {items.map((it, idx) => (
          <View
            key={it.attemptId}
            style={[
              styles.dot,
              idx === activeIndex ? styles.dotActive : null,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: BrandSpacing.sm,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.examForestBorder,
  },
  dotActive: {
    backgroundColor: BrandColors.primary,
    width: 16,
  },
});
