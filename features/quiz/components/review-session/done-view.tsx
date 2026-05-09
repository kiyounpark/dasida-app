import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { ReviewTask } from '@/features/learning/types';

import { Paper } from './paper-tokens';

interface DoneViewProps {
  task: ReviewTask;
  weaknessLabel: string;
  paddingBottom: number;
  onPressRetry: () => void;
  onPressRemember: () => void;
}

export function DoneView({
  task,
  weaknessLabel,
  paddingBottom,
  onPressRetry,
  onPressRemember,
}: DoneViewProps) {
  const isGraduated = task.stage === 'day30';
  const nextLabel =
    task.stage === 'day1' ? '3일 후' :
    task.stage === 'day3' ? '7일 후' :
    task.stage === 'day7' ? '30일 후' : '졸업 🎓';

  return (
    <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom }]}>
      <View style={styles.stamp}>
        <View style={[styles.stampRing, isGraduated && styles.stampRingGraduated]}>
          <Text style={[styles.stampKo, isGraduated && styles.stampKoGraduated]}>
            {isGraduated ? '졸 업' : '완 료'}
          </Text>
          <Text style={[styles.stampEn, isGraduated && styles.stampEnGraduated]}>
            {isGraduated ? 'GRADUATED' : 'REVIEWED'}
          </Text>
        </View>
        <Text style={styles.stampLeafMark}>{isGraduated ? '🎓' : '🌿'}</Text>
      </View>

      <Text style={styles.title}>
        {isGraduated ? '이 약점, 이제 졸업이에요' : '모든 단계 완료!'}
      </Text>
      <Text style={styles.sub}>
        {isGraduated ? (
          <>
            한 달 동안 이 흐름을 네 번 다시 봤어요.{'\n'}
            <Text style={styles.subStrong}>{weaknessLabel}</Text>은 더 이상 약점이 아닙니다.
          </>
        ) : (
          <>
            <Text style={styles.subStrong}>{weaknessLabel}</Text> 흐름을{'\n'}다시 확인했어요.
          </>
        )}
      </Text>

      <View
        style={[
          styles.scheduleCard,
          isGraduated && styles.scheduleCardGraduated,
        ]}>
        <View>
          <Text style={styles.scheduleLabel}>{isGraduated ? '상태' : '다음 복습 일정'}</Text>
          <Text style={styles.scheduleVal}>{nextLabel}</Text>
        </View>
        <View style={[styles.scheduleIcon, isGraduated && styles.scheduleIconGraduated]}>
          <Text style={styles.scheduleIconText}>{isGraduated ? '🌳' : '📅'}</Text>
        </View>
      </View>

      {isGraduated ? (
        <View style={styles.buttons}>
          <Pressable
            style={[styles.primaryBtn, { flex: 1 }]}
            onPress={onPressRemember}
            accessibilityRole="button"
            accessibilityLabel="홈으로 돌아가기">
            <Text style={styles.primaryBtnText}>홈으로 돌아가기</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.buttons}>
          <Pressable
            style={styles.secondaryBtn}
            onPress={onPressRetry}
            accessibilityRole="button"
            accessibilityLabel="다시 볼게요">
            <Text style={styles.secondaryBtnText}>🤔 다시 볼게요</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, styles.primaryBtnDone]}
            onPress={onPressRemember}
            accessibilityRole="button"
            accessibilityLabel="기억났어요">
            <Text style={styles.primaryBtnText}>✓ 기억났어요!</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 28,
    gap: 14,
  },
  stamp: {
    position: 'relative',
    marginVertical: 8,
  },
  stampRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2.5,
    borderColor: Paper.rustDeep,
    backgroundColor: 'rgba(201,90,63,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-7deg' }],
  },
  stampRingGraduated: {
    borderColor: Paper.forest800,
    backgroundColor: 'rgba(41,59,39,0.08)',
  },
  stampKo: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 22,
    letterSpacing: 4,
    color: Paper.rustDeep,
    lineHeight: 24,
  },
  stampKoGraduated: { color: Paper.forest800 },
  stampEn: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 9,
    letterSpacing: 2,
    color: Paper.rustDeep,
    marginTop: 4,
  },
  stampEnGraduated: { color: Paper.forest800 },
  stampLeafMark: {
    position: 'absolute',
    top: -8,
    right: -10,
    fontSize: 22,
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
  subStrong: {
    fontFamily: FontFamilies.bold,
    color: Paper.forest800,
  },
  scheduleCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Paper.ink,
    borderRadius: 14,
    backgroundColor: Paper.paper,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: Paper.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 0,
    elevation: 1,
  },
  scheduleCardGraduated: {
    borderColor: Paper.forest800,
    backgroundColor: Paper.forest100,
  },
  scheduleLabel: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 9,
    color: Paper.inkMute,
    letterSpacing: 1.4,
    marginBottom: 3,
  },
  scheduleVal: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 18,
    color: Paper.ink,
  },
  scheduleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Paper.forest500,
    backgroundColor: Paper.forest100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleIconGraduated: {
    backgroundColor: Paper.cream,
    borderColor: Paper.forest800,
  },
  scheduleIconText: { fontSize: 16 },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  primaryBtn: {
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
  },
  primaryBtnDone: { flex: 1.6 },
  primaryBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: Paper.cream,
    letterSpacing: -0.2,
  },
  secondaryBtn: {
    flex: 1,
    height: 50,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    borderRadius: 14,
    backgroundColor: Paper.cream,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Paper.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  secondaryBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: Paper.ink,
  },
});
