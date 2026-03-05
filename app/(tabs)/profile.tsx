import { StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';

export default function ProfileScreen() {
  return (
    <View style={styles.screen}>
      <BrandHeader compact />
      <View style={styles.card}>
        <Text style={styles.title}>설정</Text>
        <Text style={styles.subtitle}>준비 중인 기능입니다.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  card: {
    marginTop: BrandSpacing.md,
    marginHorizontal: BrandSpacing.lg,
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    backgroundColor: '#fff',
    padding: BrandSpacing.lg,
    alignItems: 'center',
    gap: BrandSpacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: BrandColors.text,
  },
  subtitle: {
    fontSize: 16,
    color: BrandColors.mutedText,
  },
});
