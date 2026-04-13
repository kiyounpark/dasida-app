// features/quiz/components/diagnosis-dark-header.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontFamilies } from '@/constants/typography';

type DiagnosisDarkHeaderProps = {
  title: string;             // "Q3" | "21번"
  backLabel: string;         // "← 뒤로" | "← 채점 결과"
  progressLabel: string;     // "1 / 5"
  progressPercent: number;   // 0~100
  totalCount: number;
  completedIndices: number[]; // 완료된 페이지 인덱스 목록
  activeIndex: number;        // 현재 페이지 인덱스 (0-based)
  onBack: () => void;
  onDotPress: (index: number) => void;
};

export function DiagnosisDarkHeader({
  title,
  backLabel,
  progressLabel,
  progressPercent,
  totalCount,
  completedIndices,
  activeIndex,
  onBack,
  onDotPress,
}: DiagnosisDarkHeaderProps) {
  // totalCount > 5: show 5 dots only + '···'
  // Window centered around activeIndex
  const showEllipsis = totalCount > 5;
  const visibleCount = showEllipsis ? 5 : totalCount;

  const windowStart = showEllipsis
    ? Math.max(0, Math.min(activeIndex - 2, totalCount - 5))
    : 0;
  const visibleIndices = Array.from({ length: visibleCount }, (_, i) => windowStart + i);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.inner}>
        {/* 상단 행: 뒤로 | N / M */}
        <View style={styles.topRow}>
          <Pressable onPress={onBack} accessibilityRole="button" style={styles.backButton}>
            <Text style={styles.backLabel}>{backLabel}</Text>
          </Pressable>
          <Text style={styles.progressLabel}>{progressLabel}</Text>
        </View>

        {/* 제목 */}
        <Text style={styles.title}>{title}</Text>

        {/* 도트 내비게이터 */}
        <View style={styles.dotsRow}>
          {visibleIndices.map((pageIndex) => {
            const isActive = pageIndex === activeIndex;
            const isCompleted = completedIndices.includes(pageIndex);
            return (
              <Pressable
                key={pageIndex}
                onPress={() => onDotPress(pageIndex)}
                style={styles.dotHitArea}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}>
                <View
                  style={[
                    styles.dot,
                    isActive
                      ? styles.dotActive
                      : isCompleted
                        ? styles.dotCompleted
                        : styles.dotUpcoming,
                  ]}
                />
              </Pressable>
            );
          })}
          {showEllipsis && (
            <Text style={styles.ellipsis}>···</Text>
          )}
        </View>

        {/* 진행률 바 */}
        <View style={styles.progTrack}>
          <View style={[styles.progFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a2a1a',
  },
  inner: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backLabel: {
    fontSize: 11,
    fontFamily: FontFamilies.medium,
    color: '#6BAA72',
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: FontFamilies.regular,
    color: 'rgba(255,255,255,0.55)',
  },
  title: {
    fontSize: 18,
    fontFamily: FontFamilies.bold,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 8,
  },
  dotHitArea: {
    width: 24,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },
  dotCompleted: {
    width: 8,
    backgroundColor: '#7FC87A',
  },
  dotUpcoming: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  ellipsis: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    paddingBottom: 2,
  },
  progTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    backgroundColor: '#7FC87A',
  },
});
