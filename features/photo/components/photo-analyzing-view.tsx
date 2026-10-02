import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { FontFamilies } from '@/constants/typography';
import { logEvent } from '@/features/analytics/log-event';

import { PhotoTheme } from '../theme';

/**
 * 실제로는 vision 호출 한 번이라 진행률이 없다. 가짜 퍼센트 막대는 정직 라벨에 어긋나므로
 * AI가 실제로 하는 일들을 20초씩 돌려 보여준다(통과 사진 65~110초, 10.01 설계). 80초를 넘기면 더 걸린다고 인정한다 —
 * "15초"라고 해놓고 계속 우기면 그때부터 화면 전체가 안 믿긴다. 마지막 문구에 숫자 상한을 안 쓴다 —
 * 요청 마감 195초에 축소·전송이 더해져 "3분"은 거짓이 된다. (web-proto와 같은 문구 — 1.0.10)
 */
const ANALYZING_STEPS = [
  '사진에서 네 손글씨 읽는 중…',
  '어떤 방법으로 풀었는지 보는 중…',
  '해설이랑 한 줄씩 맞춰보는 중…',
  '처음 갈라진 데 찾는 중…',
];
const ANALYZING_OVERTIME = '아직 보는 중이야. 너무 오래 걸리면 내가 멈추고 알려줄게';
const STEP_MS = 20_000;

/** 적분 위끝·아래끝 — 웹은 HTML span(.lim)으로 쌓는다 */
type SolutionPart = string | { upper: string; lower: string };

/**
 * 대기 중 예시 오답노트 (10.01 astra·Fable 둘 다 A안 → 1.0.11 앱에도, 10.02 기윤).
 * web-proto/app.js WAIT_CARDS와 같은 내용이다 — 카드를 고치거나 늘리면 둘 다 고친다.
 * 수학은 math-checker, 문구는 target-student를 먼저 거친다.
 */
const WAIT_CARDS: readonly {
  problem: string;
  lines: readonly (readonly SolutionPart[])[];
  bad: number;
  why: string;
  fix: string;
}[] = [
  {
    problem: 'f(x) = x³ − 3x² + 3x 의 극값을 구하시오.',
    lines: [["f'(x) = 3x² − 6x + 3 = 0"], ['x = 1'], ['극값 f(1) = 1']],
    bad: 2,
    why: "f'(x)=3(x−1)²≥0이라 x=1 앞뒤로 부호가 안 바뀌어. 극값은 없어",
    fix: "f'=0 찾으면 앞뒤 부호부터 보기",
  },
  {
    problem: '곡선 y = x² − 1 과 x축, x=0, x=2 로 둘러싸인 넓이는?',
    lines: [['∫', { upper: '2', lower: '0' }, ' (x² − 1) dx'], ['= 8/3 − 2'], ['= 2/3']],
    bad: 0,
    why: '0~1에서 그래프가 x축 아래라, 더해야 할 넓이를 뺐어. 넓이는 2',
    fix: 'x축 아래로 내려가는 구간부터 찾기',
  },
  {
    problem: 'log₂(x−1) + log₂(x−3) = 3 을 풀어라.',
    lines: [['(x−1)(x−3) = 8'], ['x² − 4x − 5 = 0'], ['답: x = 5 또는 x = −1']],
    bad: 2,
    why: '진수 조건 x>3을 안 봐서 x=−1을 남겼어',
    fix: '로그 풀면 진수 조건부터 대보기',
  },
];

export function PhotoAnalyzingView() {
  const [step, setStep] = useState(0);
  // 시작 카드는 매번 무작위 — 다시 온 학생도 첫 장이 바뀐다(웹과 같게)
  const [cardIndex, setCardIndex] = useState(() => Math.floor(Math.random() * WAIT_CARDS.length));
  const startedAt = useRef(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => Math.min(prev + 1, ANALYZING_STEPS.length));
    }, STEP_MS);
    // 웹은 페이지를 떠나면 타이머가 같이 죽지만 앱은 안 죽는다 — 화면을 나갈 때 직접 끈다
    return () => clearInterval(timer);
  }, []);

  const label = step < ANALYZING_STEPS.length ? ANALYZING_STEPS[step] : ANALYZING_OVERTIME;
  const card = WAIT_CARDS[cardIndex];

  const showNext = () => {
    const next = (cardIndex + 1) % WAIT_CARDS.length;
    setCardIndex(next);
    // 읽을거리가 붙잡는지 — 넘김 수로 본다
    logEvent('photo_wait_card_next', { card_index: next, wait_ms: Date.now() - startedAt.current });
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.spinner}>
        <WaitDots />
        {/* 문구가 바뀔 때 글자가 튀지 않게 — 두 줄짜리가 와도 자리를 미리 잡아둔다 */}
        <View style={styles.stepSlot}>
          <Text selectable style={styles.label}>
            {label}
          </Text>
        </View>
        <Text style={styles.note}>보통 1~2분 걸려. 길면 더 걸리기도 해</Text>
      </View>

      <Text style={styles.hint}>기다리는 동안, 결과가 이렇게 나와</Text>
      {/* 결과 오답노트(photo-note-card)와 같은 모양 — "곧 이게 온다"를 미리 보여준다 */}
      <View style={styles.card}>
        <View style={styles.head}>
          <Text style={styles.title}>예시 오답노트</Text>
          <Text style={styles.count}>
            {cardIndex + 1}/{WAIT_CARDS.length} · 네 사진 아님
          </Text>
        </View>
        <Text style={styles.waitLabel}>문제</Text>
        <Text style={styles.problem}>{card.problem}</Text>
        <View style={styles.solution}>
          {card.lines.map((parts, i) => (
            <View key={i} style={[styles.solutionLine, i === card.bad && styles.solutionLineBad]}>
              {parts.map((part, j) =>
                typeof part === 'string' ? (
                  <Text key={j} style={styles.handwriting}>
                    {part}
                  </Text>
                ) : (
                  <View key={j} style={styles.lim}>
                    <Text style={styles.limText}>{part.upper}</Text>
                    <Text style={styles.limText}>{part.lower}</Text>
                  </View>
                ),
              )}
            </View>
          ))}
        </View>
        <Text style={styles.mark}>↑ 여기서 갈라졌어</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>왜</Text>
          <Text style={styles.rowText}>{card.why}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>다음엔</Text>
          <Text style={styles.rowText}>{card.fix}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={showNext}
        style={({ pressed }) => [styles.next, pressed && styles.nextPressed]}>
        <Text style={styles.nextText}>다음 예시 보기</Text>
      </Pressable>
    </ScrollView>
  );
}

/** 움직이는 게 0이면 20초 동안 멈춘 화면으로 보인다(10.01 astra·Fable). 진행률이 아니라 "살아 있다"만 말한다 */
function WaitDots() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.dots}>
      {[0, 150, 300].map((delay) => (
        <WaitDot delay={delay} key={delay} />
      ))}
    </View>
  );
}

function WaitDot({ delay }: { delay: number }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    // 웹 @keyframes wait-dot(1.2초, 40%에 최대)과 같은 박자
    progress.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 480 }), withTiming(0, { duration: 480 }), withTiming(0, { duration: 240 })), -1),
    );
  }, [delay, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 0.6, transform: [{ scale: 1 }] }
      : { opacity: 0.35 + 0.65 * progress.value, transform: [{ scale: 0.6 + 0.4 * progress.value }] },
  );

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  // web-proto .wrap(가로 22) · #screen-analyzing .spinner(위 26 아래 16)와 같은 여백
  wrap: {
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 30,
  },
  spinner: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: PhotoTheme.greenSoft,
  },
  stepSlot: {
    minHeight: 44,
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamilies.regular,
    fontSize: 15,
    lineHeight: 22,
    color: PhotoTheme.muted,
    textAlign: 'center',
  },
  note: {
    fontFamily: FontFamilies.regular,
    marginTop: 10,
    fontSize: 13,
    color: PhotoTheme.muted,
    opacity: 0.7,
    textAlign: 'center',
  },
  hint: {
    fontFamily: FontFamilies.regular,
    fontSize: 12,
    color: PhotoTheme.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: PhotoTheme.greenSoft,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  title: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 15,
    color: PhotoTheme.green,
  },
  count: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: PhotoTheme.muted,
  },
  waitLabel: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 12,
    color: PhotoTheme.greenSoft,
    marginBottom: 2,
  },
  problem: {
    fontFamily: FontFamilies.bold,
    fontSize: 14.5,
    lineHeight: 22,
    color: PhotoTheme.ink,
    marginBottom: 10,
  },
  solution: {
    backgroundColor: PhotoTheme.cream2,
    borderWidth: 1,
    borderColor: PhotoTheme.line,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  solutionLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  // 틀린 줄 — 웹 div.bad(연분홍 바탕 + 빨간 밑줄)
  solutionLineBad: {
    backgroundColor: '#FCEBEB',
    borderBottomWidth: 2,
    borderBottomColor: '#E24B4A',
  },
  handwriting: {
    fontFamily: FontFamilies.handwriting,
    fontSize: 23,
    lineHeight: 31,
    color: PhotoTheme.ink,
  },
  lim: {
    alignItems: 'center',
    marginLeft: 1,
    marginRight: 2,
  },
  limText: {
    fontFamily: FontFamilies.handwriting,
    fontSize: 13,
    lineHeight: 14,
    color: PhotoTheme.ink,
  },
  mark: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: '#A32D2D',
    marginBottom: 6,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: PhotoTheme.line,
    borderStyle: 'dashed',
  },
  rowLabel: {
    width: 52,
    fontFamily: FontFamilies.extrabold,
    fontSize: 13,
    lineHeight: 22,
    color: PhotoTheme.greenSoft,
  },
  rowText: {
    flex: 1,
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    lineHeight: 22,
    color: PhotoTheme.ink,
  },
  next: {
    width: '100%',
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: PhotoTheme.line,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 11,
    alignItems: 'center',
  },
  nextPressed: {
    opacity: 0.7,
  },
  nextText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: PhotoTheme.green,
  },
});
