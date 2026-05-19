import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FontFamilies } from '@/constants/typography';

import { Paper } from './paper-tokens';

const AUTO_ADVANCE_MS = 2500;

interface BridgeViewProps {
  prevLabel: string | null;
  nextLabel: string | null;
  chainDone: number;
  chainTotal: number;
  nextStageDays: number | null;
  paddingBottom: number;
  onContinue: () => void;
}

export function BridgeView({
  prevLabel,
  nextLabel,
  chainDone,
  chainTotal,
  nextStageDays,
  paddingBottom,
  onContinue,
}: BridgeViewProps) {
  // 자동 진행 / 진행 가드: 자동·수동 어느 쪽이든 한 번만 진행한다.
  const advancedRef = useRef(false);
  const [autoCancelled, setAutoCancelled] = useState(false);

  const advance = () => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    onContinue();
  };

  const cancelAuto = () => setAutoCancelled(true);

  useEffect(() => {
    if (autoCancelled) return;
    const timer = setTimeout(advance, AUTO_ADVANCE_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') setAutoCancelled(true);
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
    // autoCancelled가 true가 되면 effect cleanup으로 타이머 제거 후 재등록 안 함.
  }, [autoCancelled]);

  const title = prevLabel ? `${prevLabel} 복습 완료!` : '복습 완료!';
  const progress =
    nextLabel
      ? `다음은 ${nextLabel} · 오늘 ${chainDone} / ${chainTotal}`
      : `오늘 ${chainDone} / ${chainTotal} 완료`;
  const buttonLabel = nextLabel ? `${nextLabel} 복습 이어서 →` : '복습 이어서 →';
  const scheduleText =
    prevLabel && nextStageDays != null
      ? `${prevLabel}는 ${nextStageDays}일 뒤에 다시 만나요`
      : null;

  return (
    <ScrollView
      contentContainerStyle={[styles.wrap, { paddingBottom }]}
      onScrollBeginDrag={cancelAuto}
      onTouchStart={cancelAuto}>
      <View style={styles.stampRing}>
        <Text style={styles.stampKo}>완 료</Text>
        <Text style={styles.stampEn}>REVIEWED</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.progress}>{progress}</Text>

      {scheduleText ? (
        <View style={styles.scheduleCard}>
          <Text style={styles.scheduleIcon}>📅</Text>
          <Text style={styles.scheduleText}>{scheduleText}</Text>
        </View>
      ) : null}

      <Pressable
        style={styles.primaryBtn}
        onPress={advance}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}>
        <Text style={styles.primaryBtnText}>{buttonLabel}</Text>
      </Pressable>
      <Text style={styles.autoHint}>
        {autoCancelled ? '버튼을 눌러 계속하세요' : '잠시 후 자동으로 이어집니다'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 36,
    gap: 14,
  },
  stampRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: Paper.rustDeep,
    backgroundColor: 'rgba(122,46,31,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-7deg' }],
    marginBottom: 4,
  },
  stampKo: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 20,
    letterSpacing: 4,
    color: Paper.rustDeep,
    lineHeight: 22,
  },
  stampEn: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 8,
    letterSpacing: 2,
    color: Paper.rustDeep,
    marginTop: 4,
  },
  title: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 21,
    color: Paper.ink,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  progress: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: Paper.forest800,
    textAlign: 'center',
  },
  scheduleCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Paper.ink,
    borderRadius: 12,
    backgroundColor: Paper.paper,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  scheduleIcon: { fontSize: 15 },
  scheduleText: {
    flex: 1,
    fontFamily: FontFamilies.regular,
    fontSize: 12.5,
    color: Paper.ink,
    lineHeight: 18,
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
    marginTop: 4,
  },
  primaryBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: Paper.cream,
    letterSpacing: -0.2,
  },
  autoHint: {
    fontFamily: FontFamilies.regular,
    fontSize: 10,
    color: Paper.inkFaint,
  },
});
