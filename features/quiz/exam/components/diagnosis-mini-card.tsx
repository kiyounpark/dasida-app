import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Polyline } from 'react-native-svg';

import { BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

export type DiagnosisMiniCardProps = {
  problemNumber: number;
  patternName: string;
  patternDescription: string;
  noteCount: number;
  totalNotes: number;
  onPause: () => void;
  onNext: () => void;
  isLastProblem?: boolean;
};

export function DiagnosisMiniCard({
  problemNumber,
  patternName,
  patternDescription,
  noteCount,
  totalNotes,
  onPause,
  onNext,
  isLastProblem = false,
}: DiagnosisMiniCardProps) {
  return (
    <View style={styles.outer}>
      {/* badgeRow — 작은 인라인 배지 */}
      <View style={styles.badgeRow}>
        <View style={styles.badgeCircle}>
          <Text style={styles.badgeCheck}>✓</Text>
        </View>
        <Text style={styles.badgeLabel}>{problemNumber}번 분석 완료</Text>
      </View>

      {/* patternCard — 메인 시각 요소 */}
      <View style={styles.patternCard}>
        <Text style={styles.patternKicker}>오답 패턴</Text>
        <Text style={styles.patternName}>{patternName}</Text>
        <Text style={styles.patternDesc}>{patternDescription}</Text>

        {/* 구분선 + noteRow */}
        <View style={styles.noteDivider} />
        <View style={styles.noteRow}>
          <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
            <Path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              stroke="#5C8C5A"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Polyline
              points="14,2 14,8 20,8"
              stroke="#5C8C5A"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Line x1="16" y1="13" x2="8" y2="13" stroke="#5C8C5A" strokeWidth={2.5} strokeLinecap="round" />
            <Line x1="16" y1="17" x2="8" y2="17" stroke="#5C8C5A" strokeWidth={2.5} strokeLinecap="round" />
          </Svg>
          <Text style={styles.noteLabel}>약점 노트로 정리됨</Text>
          <View style={styles.notePill}>
            <Text style={styles.notePillText}>
              {noteCount} / {totalNotes}
            </Text>
          </View>
        </View>
      </View>

      {/* buttonRow — Ghost + Primary */}
      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [styles.btnGhost, pressed && styles.btnGhostPressed]}
          onPress={onPause}
          accessibilityRole="button">
          <Text style={styles.btnGhostText}>잠시 쉬기</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
          onPress={onNext}
          accessibilityRole="button">
          <Text style={styles.btnPrimaryText}>{isLastProblem ? '리포트 보기 →' : '다음 문제 →'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    gap: BrandSpacing.sm,
  },

  // ── badgeRow
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  badgeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#5C8C5A',
    borderWidth: 1.5,
    borderColor: '#1A1916',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCheck: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 11,
    lineHeight: 13,
    color: '#FAF6EC',
  },
  badgeLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 12.5,
    color: '#355135',
    letterSpacing: -0.1,
  },

  // ── patternCard
  patternCard: {
    backgroundColor: '#FFFCF4',
    borderWidth: 2,
    borderColor: '#1A1916',
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    padding: BrandSpacing.md,
    paddingBottom: 14,
    boxShadow: '3px 3px 0 #1A1916',
  },
  patternKicker: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 10,
    lineHeight: 14,
    color: '#355135',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  patternName: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 20,
    lineHeight: 26,
    color: '#1A1916',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  patternDesc: {
    fontFamily: FontFamilies.medium,
    fontSize: 13.5,
    lineHeight: 22,
    color: '#3A3833',
  },
  noteDivider: {
    height: 1,
    backgroundColor: '#ECE4CD',
    marginTop: 12,
    marginBottom: 9,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteLabel: {
    fontFamily: FontFamilies.semibold,
    fontSize: 10.5,
    color: '#355135',
    flex: 1,
  },
  notePill: {
    backgroundColor: '#E5EFE0',
    borderWidth: 1,
    borderColor: '#C9DEC5',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  notePillText: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: '#355135',
  },

  // ── buttonRow
  buttonRow: {
    flexDirection: 'row',
    gap: BrandSpacing.xs,
    marginTop: 4,
  },
  btnGhost: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#ECE4CD',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: {
    fontFamily: FontFamilies.semibold,
    fontSize: 13,
    color: '#6B675E',
  },
  btnGhostPressed: {
    opacity: 0.6,
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#293B27',
    borderWidth: 2.5,
    borderColor: '#1A1916',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 3px 0 #1A1916',
  },
  btnPrimaryText: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 15,
    color: '#FAF6EC',
    letterSpacing: -0.1,
  },
  btnPrimaryPressed: {
    opacity: 0.85,
  },
});
