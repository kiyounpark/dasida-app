// features/profile/components/founding-member-card.tsx
import { StyleSheet, Text, View } from 'react-native';

import { BrandRadius, BrandSpacing } from '@/constants/brand';
import { BrandTypography } from '@/constants/typography';

export function FoundingMemberCard() {
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.icon}>🥇</Text>
        <Text selectable style={styles.title}>
          Founding Member
        </Text>
      </View>
      <Text selectable style={styles.body}>
        지금 사용하시는 모든 기능은 무료로 유지됩니다. 앞으로 출시될 프리미엄 기능도
        Founding Member에게는 1년간 무료로 제공됩니다.
      </Text>
      <View style={styles.divider} />
      <View style={styles.footer}>
        <Text selectable style={styles.footerLabel}>
          현재 기능 영구 무료
        </Text>
        <Text selectable style={styles.footerLabel}>
          프리미엄 1년 무료
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: BrandRadius.lg,
    backgroundColor: '#FFFBEB',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrandSpacing.xs,
  },
  icon: {
    fontSize: 18,
    lineHeight: 24,
  },
  title: {
    ...BrandTypography.bodyStrong,
    color: '#92400E',
  },
  body: {
    ...BrandTypography.body,
    color: '#78350F',
  },
  divider: {
    height: 1,
    backgroundColor: '#FDE68A',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerLabel: {
    ...BrandTypography.meta,
    color: '#B45309',
  },
});
