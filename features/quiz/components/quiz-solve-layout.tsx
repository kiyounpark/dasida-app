import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { PageContainer } from '@/components/layout/page-container';
import { useIsTablet } from '@/hooks/use-is-tablet';

export type QuizSolveLayoutProps = {
  body: ReactNode;
  bodyContentContainerStyle?: StyleProp<ViewStyle>;
  footer: ReactNode;
  footerSafeArea?: boolean;
  header: ReactNode;
  screenBackgroundColor?: string;
};

export function getQuizBottomPanelMaxHeight(height: number, isCompactLayout: boolean) {
  const ratio = isCompactLayout ? 0.44 : 0.38;
  return Math.min(360, Math.max(220, height * ratio));
}

export function QuizSolveLayout({
  body,
  bodyContentContainerStyle,
  footer,
  footerSafeArea = true,
  header,
  screenBackgroundColor = BrandColors.background,
}: QuizSolveLayoutProps) {
  const isTablet = useIsTablet();
  const insets = useSafeAreaInsets();

  if (isTablet) {
    return (
      <PageContainer variant="split" style={styles.screen}>
        <View style={[styles.screen, { backgroundColor: screenBackgroundColor }]}>
          {header}
          <View style={styles.tabletRow}>
            <ScrollView
              style={styles.tabletLeft}
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={[styles.tabletLeftContent, bodyContentContainerStyle]}>
              {body}
            </ScrollView>
            <ScrollView
              style={styles.tabletRight}
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={styles.tabletRightContent}>
              {footer}
            </ScrollView>
          </View>
        </View>
      </PageContainer>
    );
  }

  const footerPaddingBottom = footerSafeArea ? Math.max(insets.bottom, 12) : 0;

  return (
    <View style={[styles.screen, { backgroundColor: screenBackgroundColor }]}>
      {header}
      <ScrollView
        style={styles.bodyScroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.bodyContent, bodyContentContainerStyle]}>
        {body}
      </ScrollView>
      <View style={[styles.footerWrap, { paddingBottom: footerPaddingBottom }]}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
  },
  footerWrap: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(41, 59, 39, 0.08)',
    boxShadow: '0 -10px 24px rgba(36, 52, 38, 0.08)',
  },
  tabletRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tabletLeft: {
    flex: 3,
    borderRightWidth: 1,
    borderRightColor: 'rgba(41, 59, 39, 0.08)',
  },
  tabletLeftContent: {
    flexGrow: 1,
  },
  tabletRight: {
    flex: 2,
    backgroundColor: '#FFFFFF',
  },
  tabletRightContent: {
    flexGrow: 1,
  },
});
