import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
  // 초기 추정값으로 첫 프레임부터 FlatList 렌더 → 2-frame flash 방지.
  // onLayout에서 실측치로 갱신.
  const [containerWidth, setContainerWidth] = useState(
    () => Dimensions.get('window').width,
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<ExamAnalysisResumeCarouselItem>>(null);
  const prevWidthRef = useRef(containerWidth);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const pageWidth = e.nativeEvent.layoutMeasurement.width;
      if (pageWidth <= 0) return;
      const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      setActiveIndex(Math.max(0, Math.min(items.length - 1, idx)));
    },
    [items.length],
  );

  // 컨테이너 폭 변경(회전/리사이즈) 시 active index에 맞춰 offset 재정렬.
  // containerWidth가 prev와 다를 때만 scroll → 초기 mount나 같은 폭에서는 no-op.
  useEffect(() => {
    if (containerWidth <= 0) return;
    if (prevWidthRef.current === containerWidth) return;
    prevWidthRef.current = containerWidth;
    listRef.current?.scrollToOffset({
      offset: activeIndex * containerWidth,
      animated: false,
    });
  }, [containerWidth, activeIndex]);

  if (items.length === 0) return null;

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
    <View
      style={{ width: '100%' }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setContainerWidth(w);
      }}
    >
      <FlatList
        ref={listRef}
        data={items}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(it) => it.attemptId}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: containerWidth,
          offset: containerWidth * index,
          index,
        })}
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
