import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandSpacing } from '@/constants/brand';
import { DasidaLogo } from './DasidaLogo';

export type BrandHeaderProps = {
  compact?: boolean;
  paddingTop?: number;
};

export function BrandHeader({ compact = false, paddingTop }: BrandHeaderProps) {
  const insets = useSafeAreaInsets();
  const safeTop = paddingTop ?? insets.top + BrandSpacing.xs;

  return (
    <View style={[styles.container, { paddingTop: safeTop, paddingBottom: compact ? 8 : 14 }]}>
      <DasidaLogo width={compact ? 182 : 220} height={compact ? 48 : 58} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
