import type { ViewStyle } from 'react-native';
import { BrandLayout, type PageContainerVariant } from '@/constants/brand';

export function resolvePageContainerStyle(
  variant: PageContainerVariant,
  isTablet: boolean,
): ViewStyle {
  if (!isTablet) return {};
  if (variant === 'split') return {};
  const preset = BrandLayout.tablet[variant];
  return {
    width: '100%',
    maxWidth: preset.contentMaxWidth,
    alignSelf: 'center',
  };
}
