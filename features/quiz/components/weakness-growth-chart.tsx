import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';

type HistoryPoint = { weekLabel: string; count: number };

const MAX_BAR_HEIGHT = 44;

function GhostBar({ label }: { label: string }) {
  return (
    <View style={styles.barCol}>
      <View style={styles.ghostBar} />
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
}

function SolidBar({
  count,
  label,
  maxCount,
  isCurrent,
}: {
  count: number;
  label: string;
  maxCount: number;
  isCurrent: boolean;
}) {
  const height = maxCount === 0 ? 6 : Math.max(6, (count / maxCount) * MAX_BAR_HEIGHT);
  const opacity = isCurrent ? 1 : 0.35 + (count / Math.max(maxCount, 1)) * 0.3;
  return (
    <View style={styles.barCol}>
      <Text style={[styles.barNum, isCurrent && styles.barNumCurrent]}>{count}</Text>
      <View style={[styles.solidBar, { height, opacity }]} />
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
}

export function WeaknessGrowthChart({
  history,
  onRediagnose,
}: {
  history: HistoryPoint[];
  onRediagnose: () => void;
}) {
  const resolvedCount = history[history.length - 1]?.count ?? 0;
  const hasResolved = resolvedCount > 0;
  const maxCount = Math.max(...history.map((p) => p.count), 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>약점 해결 현황</Text>
        {hasResolved ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🌱 {resolvedCount}개 해결됨</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.barRow}>
        {hasResolved ? (
          history.map((point, i) => (
            <View key={point.weekLabel} style={styles.barWithArrow}>
              <SolidBar
                count={point.count}
                label={point.weekLabel}
                maxCount={maxCount}
                isCurrent={i === history.length - 1}
              />
              {i < history.length - 1 ? <Text style={styles.arrow}>→</Text> : null}
            </View>
          ))
        ) : (
          <>
            <View style={styles.barWithArrow}>
              <SolidBar count={0} label="1주차" maxCount={1} isCurrent={false} />
              <Text style={styles.arrow}>→</Text>
            </View>
            <View style={styles.barWithArrow}>
              <GhostBar label="2주차" />
              <Text style={styles.arrow}>→</Text>
            </View>
            <GhostBar label="지금" />
          </>
        )}
      </View>

      <View style={styles.floor} />

      {!hasResolved ? (
        <View style={styles.ctaArea}>
          <Text style={styles.ctaHint}>재진단을 보면 성장 곡선이 채워져요</Text>
          <Pressable style={styles.ctaButton} onPress={onRediagnose}>
            <Text style={styles.ctaButtonText}>재진단 10문제 풀기 →</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 252, 247, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.1)',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    color: '#1C2C19',
  },
  badge: {
    backgroundColor: 'rgba(74, 124, 89, 0.1)',
    borderRadius: 99,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  badgeText: {
    fontFamily: FontFamilies.bold,
    fontSize: 8.5,
    color: '#2A4A28',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: MAX_BAR_HEIGHT + 22,
  },
  barWithArrow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 16,
    gap: 2,
  },
  solidBar: {
    width: 20,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: '#4A7C59',
  },
  ghostBar: {
    width: 20,
    height: 20,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 124, 89, 0.3)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(74, 124, 89, 0.05)',
  },
  barNum: {
    fontFamily: FontFamilies.bold,
    fontSize: 8.5,
    color: 'rgba(74, 124, 89, 0.5)',
  },
  barNumCurrent: {
    fontSize: 11,
    color: '#2A4A28',
  },
  barLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 7.5,
    color: 'rgba(72, 67, 58, 0.45)',
    position: 'absolute',
    bottom: 0,
  },
  arrow: {
    fontSize: 10,
    color: 'rgba(41, 59, 39, 0.2)',
    paddingBottom: 18,
    paddingHorizontal: 4,
  },
  floor: {
    height: 1,
    backgroundColor: 'rgba(41, 59, 39, 0.1)',
    marginTop: 4,
    marginBottom: 6,
  },
  ctaArea: {
    gap: 4,
  },
  ctaHint: {
    fontFamily: FontFamilies.regular,
    fontSize: 9,
    color: 'rgba(72, 67, 58, 0.55)',
    textAlign: 'center',
  },
  ctaButton: {
    alignSelf: 'center',
    backgroundColor: 'rgba(74, 124, 89, 0.12)',
    borderRadius: 99,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  ctaButtonText: {
    fontFamily: FontFamilies.bold,
    fontSize: 9,
    color: '#2A4A28',
  },
});
