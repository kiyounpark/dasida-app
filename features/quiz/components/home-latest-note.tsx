import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type { PhotoNote } from '@/features/photo/types';
import { useIsTablet } from '@/hooks/use-is-tablet';

/**
 * 첫 사진 뒤 홈 — 방금 만든 노트가 남아 있다는 걸 보여준다(기윤 10.03 「허전하다」).
 *
 * 작은 판(astra 안, Fable 2차 최종): 사진 작게 + 다음엔 두 줄까지. 갈라진 지점·왜는 10초 전에 읽었으니
 * 「노트 펼쳐 보기」로 목록에서 본다 — 목록은 최신순이라 첫 장이 이 노트다.
 * 큰 카드는 「다음 복습」 카드와 사진 줄을 첫 화면 밖으로 밀어낸다. 그 둘이 내일 다시 열 이유다.
 *
 * 아래 사진 줄은 HomeReviewList의 photoRow와 같은 모양 — 노트가 있으면 큰 사진 카드 대신 이걸 쓴다.
 */
export function HomeLatestNote({
  note,
  onPressNotes,
  onPressPhoto,
}: {
  note: PhotoNote;
  onPressNotes: () => void;
  onPressPhoto: () => void;
}) {
  const isTablet = useIsTablet();

  return (
    <View testID="home-latest-note" style={[styles.wrap, isTablet && { maxWidth: undefined }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="노트 펼쳐 보기"
        onPress={onPressNotes}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <Text style={styles.head}>{`오답노트 · ${note.dateLabel}`}</Text>
        <View style={styles.row}>
          {note.photoUri ? (
            <Image source={{ uri: note.photoUri }} style={styles.thumb} contentFit="cover" />
          ) : null}
          <View style={styles.fixCol}>
            <Text style={styles.fixLabel}>다음엔</Text>
            <Text style={styles.fixText} numberOfLines={2}>
              {note.fix}
            </Text>
          </View>
        </View>
        <Text style={styles.more}>노트 펼쳐 보기 ›</Text>
      </Pressable>
      <Pressable style={styles.photoRow} onPress={onPressPhoto} accessibilityLabel="사진 추가하기">
        <Text style={styles.photoRowText}>+ 틀린 문제 하나 더 올리기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 430,
    gap: BrandSpacing.xs,
  },
  card: {
    gap: BrandSpacing.xs,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 252, 247, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.12)',
  },
  pressed: {
    opacity: 0.85,
  },
  head: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
    color: BrandColors.mutedText,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: BrandSpacing.sm,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: BrandRadius.md,
    backgroundColor: '#ECE6D6',
  },
  fixCol: {
    flex: 1,
    gap: 2,
  },
  fixLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    lineHeight: 18,
    color: BrandColors.text,
  },
  fixText: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
    color: BrandColors.text,
  },
  more: {
    alignSelf: 'flex-end',
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
    color: BrandColors.primary,
  },
  photoRow: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(41, 59, 39, 0.24)',
  },
  photoRowText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    lineHeight: 20,
    color: BrandColors.primary,
  },
});
