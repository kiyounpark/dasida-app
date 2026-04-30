import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { WeaknessAppearance } from '@/features/learning/types';

export function formatAppearanceDateKst(iso: string): string {
  const kstMs = new Date(iso).getTime() + 9 * 60 * 60 * 1000;
  const d = new Date(kstMs);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const nowKstMs = Date.now() + 9 * 60 * 60 * 1000;
  const currentYear = new Date(nowKstMs).getUTCFullYear();
  if (year === currentYear) return `${month}월 ${day}일`;
  return `${year}년 ${month}월 ${day}일`;
}

export function WeaknessDetailAppearances({
  appearances,
}: {
  appearances: WeaknessAppearance[];
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>등장 기록</Text>
      {appearances.length === 0 ? (
        <Text style={styles.empty}>아직 등장한 기록이 없어요.</Text>
      ) : (
        appearances.map((a) => (
          <View key={a.attemptId} style={styles.row}>
            <Text style={styles.bullet}>·</Text>
            <Text style={styles.label}>{a.sourceLabel}</Text>
            <Text style={styles.date}>{formatAppearanceDateKst(a.attemptedAt)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: '#1C2C19',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'space-between',
  },
  bullet: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: 'rgba(72, 67, 58, 0.5)',
  },
  label: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: 'rgba(28, 44, 25, 0.85)',
    flex: 1,
  },
  empty: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: 'rgba(72, 67, 58, 0.5)',
  },
  date: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: 'rgba(72, 67, 58, 0.5)',
    flexShrink: 0,
  },
});
