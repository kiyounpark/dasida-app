import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors, BrandRadius } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

import type { ProblemTile, UseExamResultScreenResult } from '../hooks/use-exam-result-screen';
import type { ExamResultSummary } from '../types';

type Props = Omit<UseExamResultScreenResult, 'result'> & {
  result: ExamResultSummary;
};

export function ExamResultScreenView({
  result,
  examTitle,
  saveState,
  problemTiles,
  diagnosedCount,
  wrongCount,
  onAnalyzeProblem,
  onReturnHome,
}: Props) {
  const insets = useSafeAreaInsets();
  const progressPercent = wrongCount > 0 ? (diagnosedCount / wrongCount) * 100 : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}>

      {/* ── 헤더 패널 ── */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <Text selectable style={styles.examName}>{examTitle}</Text>
        <View style={styles.scoreRow}>
          <View style={styles.scoreLeft}>
            <Text selectable style={styles.scoreNum}>{result.totalScore}</Text>
            <Text selectable style={styles.scoreDenom}>/ {result.maxScore}점</Text>
          </View>
          <View style={styles.ring}>
            <Text selectable style={styles.ringPct}>{result.accuracy}%</Text>
            <Text selectable style={styles.ringLabel}>정답률</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={[styles.statChip, styles.chipCorrect]}>
            <View style={[styles.dot, styles.dotCorrect]} />
            <Text selectable style={styles.chipText}>정답 {result.correct}</Text>
          </View>
          <View style={[styles.statChip, styles.chipWrong]}>
            <View style={[styles.dot, styles.dotWrong]} />
            <Text selectable style={styles.chipText}>오답 {result.wrong}</Text>
          </View>
          {result.unanswered > 0 && (
            <View style={[styles.statChip, styles.chipBlank]}>
              <View style={[styles.dot, styles.dotBlank]} />
              <Text selectable style={styles.chipText}>미풀이 {result.unanswered}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── 바디 ── */}
      <View style={styles.body}>

        {/* 약점 분석 진행률 */}
        {wrongCount > 0 && (
          <View style={styles.progWrap}>
            <View style={styles.progHead}>
              <Text selectable style={styles.progLabel}>약점 분석</Text>
              <Text selectable style={styles.progCount}>{diagnosedCount} / {wrongCount} 완료</Text>
            </View>
            <View style={styles.progTrack}>
              <View style={[styles.progFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>
        )}

        {/* 저장 상태 */}
        {saveState === 'error' && (
          <Text selectable style={styles.saveError}>결과 저장에 실패했습니다.</Text>
        )}

        {/* 문제 그리드 */}
        {problemTiles.length > 0 && (
          <View>
            <Text selectable style={styles.secTitle}>틀린 문제 · 미풀이</Text>
            <View style={styles.grid}>
              {problemTiles.map((tile) => (
                <ProblemTileCard
                  key={tile.number}
                  tile={tile}
                  onPress={() => onAnalyzeProblem(tile.number)}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.divider} />
        <Pressable
          accessibilityRole="button"
          onPress={onReturnHome}
          style={styles.homeBtn}>
          <Text selectable style={styles.homeBtnText}>홈으로 돌아가기</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ProblemTileCard({
  tile,
  onPress,
}: {
  tile: ProblemTile;
  onPress: () => void;
}) {
  const isUndone = tile.status === 'undone';
  const isDone = tile.status === 'done';
  const isBlank = tile.status === 'blank';

  return (
    <Pressable
      onPress={isUndone ? onPress : undefined}
      disabled={!isUndone}
      accessibilityRole={isUndone ? 'button' : undefined}
      style={[
        styles.tile,
        isUndone && styles.tileUndone,
        isDone && styles.tileDone,
        isBlank && styles.tileBlank,
      ]}>
      <Text
        selectable
        style={[
          styles.tileNum,
          isUndone && styles.tileNumUndone,
          isDone && styles.tileNumDone,
          isBlank && styles.tileNumBlank,
        ]}>
        {tile.number}
      </Text>
      <View
        style={[
          styles.tileAction,
          isUndone && styles.tileActionUndone,
          isDone && styles.tileActionDone,
          isBlank && styles.tileActionBlank,
        ]}>
        <Text
          selectable
          style={[
            styles.tileActionText,
            isUndone && styles.tileActionTextUndone,
            isDone && styles.tileActionTextDone,
            isBlank && styles.tileActionTextBlank,
          ]}>
          {isUndone ? '왜 틀렸지?' : isDone ? '✓ 완료' : '미풀이'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  container: {
    flexGrow: 1,
  },

  // ── 헤더 패널 ──
  hero: {
    backgroundColor: BrandColors.primaryDark,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  examName: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: '#6BAA72',
    letterSpacing: 0.4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  scoreNum: {
    fontFamily: FontFamilies.bold,
    fontSize: 48,
    lineHeight: 52,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  scoreDenom: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.38)',
  },
  ring: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#7FC87A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  ringLabel: {
    fontFamily: FontFamilies.regular,
    fontSize: 8,
    color: '#7FC87A',
  },
  statRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  chipCorrect: { backgroundColor: 'rgba(127,200,122,0.15)' },
  chipWrong: { backgroundColor: 'rgba(220,80,80,0.18)' },
  chipBlank: { backgroundColor: 'rgba(255,255,255,0.08)' },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  dotCorrect: { backgroundColor: '#7FC87A' },
  dotWrong: { backgroundColor: '#E07070' },
  dotBlank: { backgroundColor: 'rgba(255,255,255,0.3)' },
  chipText: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },

  // ── 바디 ──
  body: {
    padding: 18,
    gap: 16,
  },
  progWrap: {
    gap: 6,
  },
  progHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: '#4A4540',
  },
  progCount: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: BrandColors.primarySoft,
  },
  progTrack: {
    height: 5,
    backgroundColor: '#E4DFD6',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    backgroundColor: BrandColors.primarySoft,
    borderRadius: 999,
  },
  saveError: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.danger,
    textAlign: 'center',
  },
  secTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: '#1B1A17',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // ── 타일 ──
  tile: {
    width: '31%',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  tileUndone: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E3D8',
    boxShadow: '0 3px 0 #CECDCA',
  },
  tileDone: {
    backgroundColor: '#EDF7ED',
    borderWidth: 1.5,
    borderColor: '#B8DDB8',
    opacity: 0.85,
  },
  tileBlank: {
    backgroundColor: '#F5F3EF',
    borderWidth: 1.5,
    borderColor: '#C8C2B4',
    borderStyle: 'dashed',
  },
  tileNum: {
    fontFamily: FontFamilies.bold,
    fontSize: 22,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
  tileNumUndone: { color: '#1B1A17' },
  tileNumDone: { color: '#3A7A3A' },
  tileNumBlank: { color: '#A89F8C' },
  tileAction: {
    width: '100%',
    paddingVertical: 5,
    borderRadius: 7,
    alignItems: 'center',
  },
  tileActionUndone: { backgroundColor: BrandColors.primaryDark },
  tileActionDone: { backgroundColor: '#C8EAC8' },
  tileActionBlank: {
    borderWidth: 1,
    borderColor: '#C8C2B4',
    borderStyle: 'dashed',
  },
  tileActionText: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
  },
  tileActionTextUndone: { color: '#FFFFFF' },
  tileActionTextDone: { color: '#2E7A2E' },
  tileActionTextBlank: { color: '#B8B0A4' },

  divider: {
    height: 1,
    backgroundColor: '#EAE6DE',
  },
  homeBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D8D3C8',
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    paddingVertical: 14,
    alignItems: 'center',
  },
  homeBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: '#8E8A81',
  },
});
