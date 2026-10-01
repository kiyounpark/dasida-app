import { StyleSheet, View } from 'react-native';

import { MathText } from '@/components/math/MathText';
import { FontFamilies } from '@/constants/typography';

import type { WeaknessCardView } from '../script/script-io';
import { PhotoTheme } from '../theme';

/**
 * 설문 결말 카드 — 오류를 못 짚은 날 학생이 직접 짚어준 약점. web-proto의 `.card.final`과 같은 모양
 * (크림 바탕 · green-soft 테두리). 글자는 대본이 정한다(features/photo/script).
 */
export function PhotoWeaknessCard({ card }: { card: WeaknessCardView }) {
  return (
    <View style={styles.card}>
      <MathText selectable style={styles.title} text={card.title} />
      <MathText selectable style={styles.body} text={card.body} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: PhotoTheme.cream2,
    borderWidth: 1,
    borderColor: PhotoTheme.greenSoft,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
  },
  title: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 15,
    color: PhotoTheme.ink,
    marginBottom: 6,
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    lineHeight: 22,
    color: PhotoTheme.ink,
  },
});
