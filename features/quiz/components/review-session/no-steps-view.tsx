import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';

import { Paper } from './paper-tokens';

interface NoStepsViewProps {
  weaknessLabel: string;
  paddingBottom: number;
  onHome: () => void;
}

/**
 * 복습 단계가 하나도 없는 약점에 걸렸을 때 나오는 화면.
 *
 * 학생 잘못이 아니라 우리가 아직 안 만든 것이므로 그렇게 적는다.
 * 여기까지 왔다는 건 `review-content-map`에 `thinkingSteps`가 비어 있다는 뜻이고,
 * 그건 `data/review-content-map.test.ts`가 빨간불로 잡아 준다.
 */
export function NoStepsView({ weaknessLabel, paddingBottom, onHome }: NoStepsViewProps) {
  return (
    <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom }]}>
      <Text style={styles.title}>이 복습은 아직 준비 중이에요</Text>
      <Text style={styles.sub}>
        {weaknessLabel} 복습을 만드는 중이에요.{'\n'}
        오늘은 다른 복습부터 해볼까요?
      </Text>

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
    justifyContent: 'center',
    paddingHorizontal: 22,
    gap: 12,
  },
  title: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 20,
    color: Paper.ink,
    textAlign: 'center',
    letterSpacing: -0.3,
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
