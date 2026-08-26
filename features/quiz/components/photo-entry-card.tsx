import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { useIsTablet } from '@/hooks/use-is-tablet';

type Props = {
  onPress: () => void;
};

/**
 * 홈에서 사진 오답노트로 들어가는 문.
 *
 * 홈 골격 3개(여정 진행 중 · 시험 분석 중 · 졸업) 어디서나 같은 자리에 뜬다.
 * 상태별로 숨기지 않는 이유: 이번 릴리스는 "사진이 약점 이름을 몇 % 뽑는가"를 재려고 내는 것이라,
 * 표본을 좁히는 분기를 지금 넣으면 그 숫자를 못 얻는다.
 *
 * 문구에 "찍어"를 쓰지 않는다 — 지금은 사진첩에서 고르는 것만 된다.
 */
export function PhotoEntryCard({ onPress }: Props) {
  const isTablet = useIsTablet();

  return (
    <View style={[styles.wrap, isTablet && { maxWidth: undefined }]}>
      <Text style={styles.tag}>새로 생겼어요</Text>
      <Text style={styles.title}>틀린 문제, 사진 한 장이면 돼요</Text>
      <Text style={styles.body}>옮겨 적지 말고 사진만 올려요. 어디서 틀렸는지 같이 찾아요.</Text>
      <Pressable style={styles.btn} onPress={onPress} accessibilityLabel="사진으로 물어보기">
        <Text style={styles.btnText}>사진으로 물어보기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: 'rgba(255, 252, 247, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(74, 124, 89, 0.28)',
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.xs,
  },
  tag: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: BrandColors.primarySoft,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 17,
    lineHeight: 25,
    color: BrandColors.text,
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    lineHeight: 20,
    color: BrandColors.mutedText,
  },
  btn: {
    marginTop: BrandSpacing.sm,
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    color: '#F6F2E7',
  },
});
