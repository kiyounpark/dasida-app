import type { ViewStyle } from 'react-native';
import { BrandLayout, type PageContainerVariant } from '@/constants/brand';

export function resolvePageContainerStyle(
  variant: PageContainerVariant,
  isTablet: boolean,
): ViewStyle {
  if (!isTablet) {
    return {};
  }
  const preset = BrandLayout.tablet[variant];
  if (variant === 'split') {
    return { paddingHorizontal: preset.pagePaddingH };
  }
  return {
    width: '100%',
    maxWidth: (preset as { contentMaxWidth: number }).contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: preset.pagePaddingH,
  };
}
