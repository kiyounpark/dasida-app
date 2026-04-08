import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { BrandColors } from '@/constants/brand';
import { DasidaLogo } from './DasidaLogo';

export type BrandHeaderProps = {
  compact?: boolean;
};

export function BrandHeader({ compact = false }: BrandHeaderProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.wrapper}>
      <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
      <View style={styles.inner}>
        <DasidaLogo width={compact ? 172 : 186} height={compact ? 45 : 48} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.border,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  inner: {
    height: 42,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
});
