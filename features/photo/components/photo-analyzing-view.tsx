import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';

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

export function PhotoAnalyzingView() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => Math.min(prev + 1, ANALYZING_STEPS.length));
    }, STEP_MS);
    // 웹은 페이지를 떠나면 타이머가 같이 죽지만 앱은 안 죽는다 — 화면을 나갈 때 직접 끈다
    return () => clearInterval(timer);
  }, []);

  const label = step < ANALYZING_STEPS.length ? ANALYZING_STEPS[step] : ANALYZING_OVERTIME;

  return (
    <View style={styles.wrap}>
      {/* 문구가 바뀔 때 글자가 튀지 않게 — 두 줄짜리가 와도 자리를 미리 잡아둔다 */}
      <View style={styles.stepSlot}>
        <Text selectable style={styles.label}>
          {label}
        </Text>
      </View>
      <Text style={styles.note}>보통 1~2분 걸려. 길면 더 걸리기도 해</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
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
});
