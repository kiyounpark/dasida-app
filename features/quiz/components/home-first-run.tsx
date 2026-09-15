import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { useIsTablet } from '@/hooks/use-is-tablet';

type Props = {
  onPressPhoto: () => void;
};

/**
 * 처음 온 학생이 보는 홈. `web-proto/index.html`의 첫 화면(#screen-upload)을 앱으로 옮겼다.
 *
 * 웹에서 쓰던 문구를 그대로 쓴다 — 앱 홈의 "틀린 문제, 찍기만 하면 돼요"보다
 * 약속이 구체적이다("왜 틀렸는지 알려줄게"). 3단계는 찍기 전에 "뭐가 나오는지"를 알려준다.
 *
 * 웹에서 안 가져온 줄이 하나 있다 — "설치·로그인 없음".
 * 웹 프로토에서 제일 센 문구지만 앱에서는 거짓말이다: 이미 설치했고, 로그인도 이 화면 앞에서 시켰다.
 *
 * 말투는 웹 그대로 반말이다. 앱 기본은 해요체지만 사진 흐름은 반말이고(H칸),
 * 이 화면은 사진 흐름의 입구다.
 *
 * 사진 노트가 한 장이라도 있으면 이 화면은 더 안 나온다 (판정은 use-quiz-hub-screen).
 */
export function HomeFirstRun({ onPressPhoto }: Props) {
  const isTablet = useIsTablet();

  return (
    <View testID="home-first-run" style={[styles.wrap, isTablet && { maxWidth: undefined }]}>
      <Text selectable style={styles.title}>
        틀린 문제만 찍어서 올려줘
      </Text>
      <Text selectable style={styles.title}>
        <Text style={styles.titleHighlight}>왜 틀렸는지</Text> 알려줄게
      </Text>
      <Text selectable style={styles.sub}>
        채점은 이미 했잖아. 틀린 문제 하나, 풀이 흔적까지 나오게 찍으면 돼.
      </Text>

      <Pressable
        style={styles.drop}
        onPress={onPressPhoto}
        accessibilityLabel="틀린 문제 사진 올리기">
        <Text style={styles.dropIcon}>📸</Text>
        <Text selectable style={styles.dropBig}>
          틀린 문제 사진 올리기
        </Text>
        <Text selectable style={styles.dropSmall}>
          풀이 쓴 부분까지 한 장에 나오게
        </Text>
      </Pressable>

      <View style={styles.steps}>
        {[
          '틀린 문제 하나를 풀이까지 나오게 찍는다',
          'AI가 풀이를 읽고 어디서 막혔는지 찾는다',
          '질문 몇 개로 확정한다 — 오답노트 한 장이 나온다',
        ].map((step, index) => (
          <View key={step} style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text selectable style={styles.stepText}>
              {step}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.footRow}>
        <Text style={styles.tag}>지금 무료</Text>
      </View>
      <Text selectable style={styles.foot}>
        사진은 AI 분석에만 써요. 우리 서버에는 저장 안 해요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 430,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 24,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: BrandColors.text,
  },
  titleHighlight: {
    color: BrandColors.primaryDark,
  },
  sub: {
    fontFamily: FontFamilies.regular,
    fontSize: 15,
    lineHeight: 24,
    color: BrandColors.mutedText,
    marginTop: 10,
    marginBottom: BrandSpacing.lg,
  },
  drop: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(41, 59, 39, 0.24)',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 6,
  },
  dropIcon: {
    fontSize: 32,
    lineHeight: 40,
  },
  dropBig: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 22,
    color: BrandColors.text,
    marginTop: 6,
  },
  dropSmall: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
    color: BrandColors.mutedText,
  },
  steps: {
    marginTop: BrandSpacing.lg,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(41, 59, 39, 0.12)',
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BrandColors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    lineHeight: 21,
    color: BrandColors.text,
  },
  footRow: {
    alignItems: 'center',
    marginTop: BrandSpacing.lg,
  },
  tag: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    lineHeight: 16,
    color: BrandColors.primaryDark,
    backgroundColor: 'rgba(41, 59, 39, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.12)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  foot: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    lineHeight: 18,
    color: BrandColors.mutedText,
    textAlign: 'center',
    marginTop: 8,
  },
});
