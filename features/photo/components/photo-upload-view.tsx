import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';

import { PhotoTheme } from '../theme';

type PhotoUploadViewProps = {
  error: string | null;
  onPick: () => void;
};

/** web-proto 화면 1(업로드). 문구·순서·굵기 모두 그쪽이 원본이다. */
const STEPS = [
  '틀린 문제 하나를 풀이까지 나오게 찍는다',
  'AI가 풀이를 읽고 어디서 막혔는지 찾는다',
  '질문 몇 개로 확정한다 — 오답노트 한 장이 나온다',
];

export function PhotoUploadView({ error, onPick }: PhotoUploadViewProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>다시다</Text>

      <Text selectable style={styles.title}>
        틀린 문제만 찍어서 올려줘{'\n'}
        <Text style={styles.titleHighlight}>왜 틀렸는지</Text> 알려줄게
      </Text>
      <Text selectable style={styles.sub}>
        채점은 이미 했잖아. 틀린 문제 하나, 풀이 흔적까지 나오게 찍으면 돼.
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={onPick}
        style={({ pressed }) => [styles.drop, pressed && styles.dropPressed]}>
        <Text style={styles.dropIcon}>📸</Text>
        <Text style={styles.dropBig}>틀린 문제 사진 올리기</Text>
        <Text style={styles.dropSmall}>풀이 쓴 부분까지 한 장에 나오게</Text>
      </Pressable>

      <View style={styles.steps}>
        {STEPS.map((step, index) => (
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

      {error && (
        <View style={styles.errorCard}>
          <Text selectable style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

      <Text style={styles.foot}>사진은 AI 분석에만 쓰고 우리 서버에는 저장 안 함</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  brand: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 15,
    color: PhotoTheme.green,
    letterSpacing: -0.2,
  },
  title: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 26,
    lineHeight: 35,
    letterSpacing: -0.5,
    color: PhotoTheme.ink,
    marginTop: 22,
    marginBottom: 10,
  },
  titleHighlight: {
    color: PhotoTheme.green,
  },
  sub: {
    fontFamily: FontFamilies.regular,
    fontSize: 15,
    lineHeight: 24,
    color: PhotoTheme.muted,
    marginBottom: 28,
  },
  drop: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: PhotoTheme.line,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  dropPressed: {
    borderColor: PhotoTheme.greenSoft,
    backgroundColor: PhotoTheme.cream2,
  },
  dropIcon: {
    fontSize: 34,
    lineHeight: 42,
  },
  dropBig: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: PhotoTheme.ink,
    marginTop: 12,
  },
  dropSmall: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: PhotoTheme.muted,
    marginTop: 6,
  },
  steps: {
    marginTop: 30,
  },
  step: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: PhotoTheme.line,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PhotoTheme.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    lineHeight: 21,
    color: PhotoTheme.ink,
  },
  errorCard: {
    marginTop: 18,
    backgroundColor: PhotoTheme.cream2,
    borderWidth: 1.5,
    borderColor: PhotoTheme.greenSoft,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 14,
  },
  errorText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    lineHeight: 21,
    color: PhotoTheme.green,
  },
  foot: {
    fontFamily: FontFamilies.regular,
    marginTop: 18,
    fontSize: 12,
    lineHeight: 18,
    color: PhotoTheme.muted,
    textAlign: 'center',
  },
});
