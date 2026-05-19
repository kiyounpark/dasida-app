import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';

import { Paper } from './paper-tokens';

interface AllDoneViewProps {
  totalCount: number;
  paddingBottom: number;
  onHome: () => void;
}

export function AllDoneView({
  totalCount,
  paddingBottom,
  onHome,
}: AllDoneViewProps) {
  return (
    <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom }]}>
      <View style={styles.stampRing}>
        <Text style={styles.stampKo}>완 료</Text>
        <Text style={styles.stampEn}>ALL DONE</Text>
      </View>

      <Text style={styles.title}>오늘 복습 다 끝냈어요 🎉</Text>
      <Text style={styles.sub}>{totalCount}개 전부 복습 완료</Text>

      <Pressable
        style={styles.primaryBtn}
        onPress={onHome}
        accessibilityRole="button"
        accessibilityLabel="홈으로 돌아가기">
        <Text style={styles.primaryBtnText}>홈으로 돌아가기</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 40,
    gap: 14,
  },
  stampRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2.5,
    borderColor: Paper.forest800,
    backgroundColor: 'rgba(41,59,39,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-7deg' }],
    marginBottom: 6,
  },
  stampKo: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 22,
    letterSpacing: 4,
    color: Paper.forest800,
    lineHeight: 24,
  },
  stampEn: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 9,
    letterSpacing: 2,
    color: Paper.forest800,
    marginTop: 4,
  },
  title: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 22,
    color: Paper.ink,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  sub: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    lineHeight: 21,
    color: Paper.inkMute,
    textAlign: 'center',
  },
  primaryBtn: {
    width: '100%',
    height: 50,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    borderRadius: 14,
    backgroundColor: Paper.forest800,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Paper.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    marginTop: 8,
  },
  primaryBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: Paper.cream,
    letterSpacing: -0.2,
  },
});
