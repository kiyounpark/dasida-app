import { useWindowDimensions } from 'react-native';

/**
 * 744px 이상이면 태블릿으로 판단.
 * - iPad mini 6세대 portrait: 744pt (포함)
 * - iPhone 15 Pro Max: 430pt (제외)
 * useWindowDimensions를 사용하므로 orientation 변경 시 자동 재계산.
 */
export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= 744;
}
