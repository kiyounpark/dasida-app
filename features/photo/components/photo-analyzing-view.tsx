import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BrandSpacing } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';

/**
 * 실제로는 vision 호출 한 번이라 진행률이 없다. 가짜 퍼센트 막대는 정직 라벨에 어긋나므로
 * AI가 실제로 하는 일들을 4초씩 돌려 보여준다. 마지막 문구를 넘기면 더 걸린다고 인정한다 —
 * "15초"라고 해놓고 계속 우기면 그때부터 화면 전체가 안 믿긴다. (web-proto와 같은 문구)
 */
const ANALYZING_STEPS = [
  '사진에서 네 손글씨 읽는 중…',
  '어떤 방법으로 풀었는지 보는 중…',
  '해설이랑 한 줄씩 맞춰보는 중…',
  '처음 갈라진 데 찾는 중…',
];
const ANALYZING_OVERTIME = '거의 다 됐어. 조금만…';
const STEP_MS = 4000;

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
      <ActivityIndicator color={DiagnosisTheme.ink} />
      <Text selectable style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: BrandSpacing.md,
    padding: BrandSpacing.lg,
  },
  label: {
    fontSize: 16,
    lineHeight: 24,
    color: DiagnosisTheme.inkMuted,
    textAlign: 'center',
  },
});
