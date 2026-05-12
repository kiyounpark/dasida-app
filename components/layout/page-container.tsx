import React from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';
import { useIsTablet } from '@/hooks/use-is-tablet';
import type { PageContainerVariant } from '@/constants/brand';
import { resolvePageContainerStyle } from './page-container-style';

type Props = {
  variant: PageContainerVariant;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * iPad 가로모드에서 화면별 콘텐츠 폭과 좌우 패딩을 일관되게 강제한다.
 * 폰에서는 추가 스타일 없이 자식을 그대로 통과시킨다.
 */
export function PageContainer({ variant, children, style }: Props) {
  const isTablet = useIsTablet();
  const resolved = resolvePageContainerStyle(variant, isTablet);
  return <View style={[resolved, style]}>{children}</View>;
}
